import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { processData } from "./utils/processData";
import { ReportRow } from "./types";

/* 將 File 轉 base64 */
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/* 將 base64 還原成 File */
const base64ToFile = async (base64: string, fileName: string): Promise<File> => {
  const res = await fetch(base64);
  const blob = await res.blob();
  return new File([blob], fileName);
};

const App: React.FC = () => {
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [result, setResult] = useState<ReportRow[]>([]);

  // --------------------------------------------------------
  // ⭐ 1. 初始化：從 localStorage 載入上次檔案與結果
  // --------------------------------------------------------
  useEffect(() => {
    const savedSalesName = localStorage.getItem("saved_salesFileName");
    const savedSalesData = localStorage.getItem("saved_salesFileData");

    const savedTemplateName = localStorage.getItem("saved_templateFileName");
    const savedTemplateData = localStorage.getItem("saved_templateFileData");

    const savedResult = localStorage.getItem("saved_resultData");

    // 還原銷貨明細
    if (savedSalesName && savedSalesData) {
      base64ToFile(savedSalesData, savedSalesName).then((file) =>
        setSalesFile(file)
      );
    }

    // 還原包裝樣板
    if (savedTemplateName && savedTemplateData) {
      base64ToFile(savedTemplateData, savedTemplateName).then((file) =>
        setTemplateFile(file)
      );
    }

    // 還原結果
    if (savedResult) {
      try {
        setResult(JSON.parse(savedResult));
      } catch (e) {
        console.error("Failed to parse saved result");
      }
    }
  }, []);

  // --------------------------------------------------------
  // ⭐ 2. 上傳檔案處理（同時存 file + base64）
  // --------------------------------------------------------
  const handleFileUpload =
    (setter: React.Dispatch<React.SetStateAction<File | null>>, key: string) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setter(file);

      // 儲存檔名
      localStorage.setItem(`${key}Name`, file.name);

      // 儲存檔案內容（base64）
      const base64 = await fileToBase64(file);
      localStorage.setItem(`${key}Data`, base64);
    };

  // --------------------------------------------------------
  // ⭐ 3. 開始換算
  // --------------------------------------------------------
  const handleProcess = async () => {
    if (!salesFile || !templateFile) {
      alert("請先上傳兩份檔案！");
      return;
    }

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

    const salesData = await readExcel(salesFile);
    const templateData = await readExcel(templateFile);

    const processed = processData(salesData, templateData);
    setResult(processed);

    // ⭐ 儲存結果
    localStorage.setItem("saved_resultData", JSON.stringify(processed));
  };

  // --------------------------------------------------------
  // ⭐ 4. 匯出 Excel
  // --------------------------------------------------------
  const exportExcel = () => {
    if (result.length === 0) {
      alert("沒有可匯出的資料！");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(result);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(file, "報表結果.xlsx");
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
          onChange={handleFileUpload(setSalesFile, "saved_salesFile")}
        />
        {salesFile && <p>📄 {salesFile.name}</p>}
      </div>

      {/* 上傳包裝樣板 */}
      <div style={{ marginTop: "20px" }}>
        <h3>2. 上傳包裝樣板</h3>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload(setTemplateFile, "saved_templateFile")}
        />
        {templateFile && <p>📄 {templateFile.name}</p>}
      </div>

      <button
        style={{ marginTop: "30px", padding: "10px 20px" }}
        onClick={handleProcess}
      >
        📊 開始換算產生報表
      </button>

      {/* 結果表格 */}
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
