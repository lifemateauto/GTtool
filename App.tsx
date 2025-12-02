import { useState, useEffect } from "react";
import { parseFile } from "./utils/parseFile";
import { generateReport } from "./utils/generateReport";
import type { ParsedData } from "./types";

function App() {
  const [salesData, setSalesData] = useState<ParsedData | null>(null);
  const [templateData, setTemplateData] = useState<ParsedData | null>(null);
  const [report, setReport] = useState<any>(null);

  // ===============================
  // ① 初始化：從 LocalStorage 讀取舊紀錄
  // ===============================
  useEffect(() => {
    const saved = localStorage.getItem("gtool-storage");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.salesData) setSalesData(data.salesData);
        if (data.templateData) setTemplateData(data.templateData);
        if (data.report) setReport(data.report);
      } catch (e) {
        console.error("讀取 localStorage 發生錯誤:", e);
      }
    }
  }, []);

  // ===============================
  // ② 當資料變動 → 自動存進 LocalStorage
  // ===============================
  useEffect(() => {
    const data = {
      salesData,
      templateData,
      report,
    };
    localStorage.setItem("gtool-storage", JSON.stringify(data));
  }, [salesData, templateData, report]);

  // ===============================
  // ③ 檔案上傳處理
  // ===============================
  const handleUploadSales = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = await parseFile(file);
    setSalesData(parsed);
  };

  const handleUploadTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = await parseFile(file);
    setTemplateData(parsed);
  };

  // ===============================
  // ④ 產生報表
  // ===============================
  const handleGenerate = () => {
    if (!salesData || !templateData) {
      alert("⚠️ 請先上傳銷貨明細 + 包裝樣板");
      return;
    }
    const result = generateReport(salesData, templateData);
    setReport(result);
  };

  // ===============================
  // ⑤ 清除紀錄
  // ===============================
  const handleClear = () => {
    setSalesData(null);
    setTemplateData(null);
    setReport(null);
    localStorage.removeItem("gtool-storage");
  };

  // ===============================
  // ⑥ UI 渲染
  // ===============================
  return (
    <div style={{ padding: 24 }}>
      <h1>網購包裝減量換算工具</h1>

      <div style={{ marginBottom: 20 }}>
        <h3>1. 上傳銷貨明細</h3>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUploadSales} />
        {salesData && <p>✔ 已載入銷貨資料，共 {salesData.rows.length} 列</p>}
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3>2. 上傳包裝樣板</h3>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleUploadTemplate}
        />
        {templateData && <p>✔ 已載入樣板資料，共 {templateData.rows.length} 列</p>}
      </div>

      <button onClick={handleGenerate} style={{ marginRight: 12 }}>
        產生會計報表
      </button>

      <button onClick={handleClear} style={{ background: "#eee" }}>
        清除紀錄
      </button>

      {report && (
        <div style={{ marginTop: 32 }}>
          <h2>📄 報表結果</h2>
          <pre>{JSON.stringify(report, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
