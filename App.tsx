import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { processData } from "./utils/processor";
import { saveState, loadState, clearState } from "./utils/storage";
import { ReportRow } from "./types";

const App: React.FC = () => {
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [result, setResult] = useState<ReportRow[]>([]);

  // --------------------------------------------------------
  // ⭐ 初始化：讀取 localStorage
  // --------------------------------------------------------
  useEffect(() => {
    const state = loadState();
    if (state.salesFileName) setSalesFile({ name: state.salesFileName } as File);
    if (state.templateFileName)
      setTemplateFile({ name: state.templateFileName } as File);
    if (state.result) setResult(state.result);
  }, []);

  // --------------------------------------------------------
  // ⭐ 檔案上傳處理
  // --------------------------------------------------------
  const handleFileUpload =
    (setter: React.Dispatch<React.SetStateAction<File | null>>, key: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (!file) return;

      setter(file);
      saveState({
        salesFileName: key === "sales" ? file.name : salesFile?.name ?? "",
        templateFileName:
          key === "template" ? file.name : templateFile?.name ?? "",
        result,
      });
    };

  // --------------------------------------------------------
  // ⭐ 讀 Excel 內容
  // --------------------------------------------------------
  const readExcel = (file: File): Promise<any[]> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        resolve(XLSX.utils.sheet_to_json(worksheet));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

  // --------------------------------------------------------
  // ⭐ 產生報表
  // --------------------------------------------------------
  const handleProcess = async () => {
    if (!salesFile || !templateFile) {
      alert("⚠️ 請先上傳銷貨明細 + 包裝樣板！");
      return;
    }

    const salesData = await readExcel(salesFile);
    const templateData = await readExcel(templateFile);
    const processed = processData(salesData, templateData);

    setResult(processed);
    saveState({
      salesFileName: salesFile.name,
      templateFileName: templateFile.name,
      result: processed,
    });
  };

  // --------------------------------------------------------
  // ⭐ 匯出 Excel
  // --------------------------------------------------------
  const exportExcel = () => {
    if (result.length === 0) {
      alert("⚠️ 沒有可匯出的資料！");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(result);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, "報表結果.xlsx");
  };

  // --------------------------------------------------------
  // ⭐ 清除紀錄
  // --------------------------------------------------------
  const handleClear = () => {
    setSalesFile(null);
    setTemplateFile(null);
    setResult([]);
    clearState();
  };

  // --------------------------------------------------------
  // ⭐ UI（恢復你的美美介面）
  // --------------------------------------------------------
  return (
    <div className="container" style={{ padding: "40px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "12px" }}>
        網購包裝減量換算與會計師報表產生工具
      </h1>
      <p style={{ textAlign: "center", color: "#555", marginBottom: "40px" }}>
        自動合併銷貨明細與包裝樣板，計算減量比值並產生會計師報表。
      </p>

      {/* 內容框 */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          marginBottom: "40px",
        }}
      >
        {/* 卡片 1：銷貨明細 */}
        <div
          style={{
            flex: 1,
            padding: "24px",
            borderRadius: "12px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
          }}
        >
          <h3>1️⃣ 上傳銷貨明細</h3>
          <p>支援 .xlsx, .xls, .csv</p>

          <div
            style={{
              border: "2px dashed #cbd5e1",
              padding: "20px",
              textAlign: "center",
              borderRadius: "8px",
              marginTop: "12px",
            }}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload(setSalesFile, "sales")}
            />
            {salesFile && (
              <p style={{ marginTop: "8px" }}>📄 {salesFile.name}</p>
            )}
          </div>
        </div>

        {/* 卡片 2：包裝樣板 */}
        <div
          style={{
            flex: 1,
            padding: "24px",
            borderRadius: "12px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
          }}
        >
          <h3>2️⃣ 上傳包裝樣板</h3>
          <p>支援 .xlsx, .xls, .csv</p>

          <div
            style={{
              border: "2px dashed #cbd5e1",
              padding: "20px",
              textAlign: "center",
              borderRadius: "8px",
              marginTop: "12px",
            }}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload(setTemplateFile, "template")}
            />
            {templateFile && (
              <p style={{ marginTop: "8px" }}>📄 {templateFile.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* 按鈕 */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <button
          onClick={handleProcess}
          style={{
            background: "#4f46e5",
            color: "white",
            padding: "14px 28px",
            borderRadius: "8px",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          📊 開始換算產生報表
        </button>
      </div>

      {/* 結果 */}
      {result.length > 0 && (
        <div style={{ marginTop: "50px", textAlign: "center" }}>
          <h3>已處理 {result.length} 筆資料</h3>

          <button
            onClick={exportExcel}
            style={{
              marginTop: "16px",
              background: "#059669",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "8px",
            }}
          >
            📥 下載 Excel (.xlsx)
          </button>

          <div>
            <button
              onClick={handleClear}
              style={{
                marginTop: "12px",
                background: "#e5e7eb",
                padding: "8px 16px",
                borderRadius: "6px",
              }}
            >
              清除紀錄
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
