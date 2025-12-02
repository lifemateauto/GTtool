import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { processData } from "./utils/processor";
import { ReportRow } from "./types";

const App: React.FC = () => {
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [result, setResult] = useState<ReportRow[]>([]);

  // --------------------------------------------------------
  // ⭐ 1. 初始化：從 localStorage 載入上次的紀錄
  // --------------------------------------------------------
  useEffect(() => {
    const savedSales = localStorage.getItem("saved_salesFileName");
    const savedTemplate = localStorage.getItem("saved_templateFileName");
    const savedResult = localStorage.getItem("saved_resultData");

    if (savedSales) {
      setSalesFile({ name: savedSales } as File);
    }
    if (savedTemplate) {
      setTemplateFile({ name: savedTemplate } as File);
    }
    if (savedResult) {
      try {
        setResult(JSON.parse(savedResult));
      } catch {
        console.error("Saved result parse failed");
      }
    }
  }, []);

  // --------------------------------------------------------
  // ⭐ 2. 上傳檔案處理
  // --------------------------------------------------------
  const handleFileUpload =
    (setter: React.Dispatch<React.SetStateAction<File | null>>, key: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (!file) return;

      setter(file);
      localStorage.setItem(key, file.name);
    };

  // --------------------------------------------------------
  // ⭐ 3. 開始換算
  // --------------------------------------------------------
  const handleProcess = async () => {
    if (!salesFile || !templateFile) {
      alert("請先上傳兩份檔案！");
      return;
    }

    const readExcel = (file: File): Promise<any[]> => {
      return new Promise((resolve, reject) => {
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
    };

    const salesData = await readExcel(salesFile);
    const templateData = await readExcel(templateFile);
    const processed = processData(salesData, templateData);

    setResult(processed);
    localStorage.setItem("saved_resultData", JSON.stringify(processed));
  };

  // --------------------------------------------------------
  // ⭐ 4. 匯出 Excel（不使用 file-saver，改用 XLSX 內建下載）
  // --------------------------------------------------------
  const exportExcel = () => {
    if (result.length === 0) {
      alert("沒有可匯出的資料！");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(result);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    XLSX.writeFile(workbook, "報表結果.xlsx");
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>網購包裝減量換算與會計師報表產生工具</h1>

      {/* 上傳銷貨明細 */}
      <div>
        <h3>1. 上傳銷貨明細</h3>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload(setSalesFile, "saved_salesFileName")}
        />
        {salesFile && <p>📄 {salesFile.name}</p>}
      </div>

      {/* 上傳包裝樣板 */}
      <div style={{ marginTop: "20px" }}>
        <h3>2. 上傳包裝樣板</h3>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload(setTemplateFile, "saved_templateFileName")}
        />
        {templateFile && <p>📄 {templateFile.name}</p>}
      </div>

      <button
        style={{ marginTop: "30px", padding: "10px 20px" }}
        onClick={handleProcess}
      >
        📊 開始換算產生報表
      </button>

      {result.length > 0 && (
        <div style={{ marginTop: "40px" }}>
          <h3>已處理 {result.length} 筆資料</h3>
          <button onClick={exportExcel}>📥 下載 Excel (.xlsx)</button>
        </div>
      )}
    </div>
  );
};

export default App;
