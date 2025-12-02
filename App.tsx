import React, { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { parseFile, processData, generateCSVContent, generateExcelWorkbook } from './utils/processor';
import { saveFile, loadFile, clearFile } from './utils/storage';
import { ProcessedRow } from './types';
import { Download, FileDown, Calculator, AlertCircle, CheckCircle2 } from 'lucide-react';
import { writeFile } from 'xlsx';
import { CSV_HEADERS } from './constants';

export default function App() {
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------------
  // ⭐ 1. 初始化：載入已儲存的 File 與結果
  // --------------------------------------------------------
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const savedSales = await loadFile('lastSalesFile');
        if (savedSales) setSalesFile(savedSales);

        const savedTemplate = await loadFile('lastTemplateFile');
        if (savedTemplate) setTemplateFile(savedTemplate);

        const savedResult = localStorage.getItem('lastProcessed');
        if (savedResult) {
          try {
            setProcessedData(JSON.parse(savedResult));
          } catch {}
        }
      } catch (err) {
        console.error('Loading error', err);
      }
    };
    loadSaved();
  }, []);

  // --------------------------------------------------------
  // ⭐ 2. 主流程：開始產生報表
  // --------------------------------------------------------
  const handleProcess = async () => {
    if (!salesFile || !templateFile) {
      setError('請同時上傳銷貨明細與包裝樣板檔案');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const [salesData, templateData] = await Promise.all([
        parseFile(salesFile),
        parseFile(templateFile)
      ]);

      const results = processData(salesData, templateData);
      setProcessedData(results);

      // 儲存結果
      localStorage.setItem('lastProcessed', JSON.stringify(results));
    } catch (err) {
      console.error(err);
      setError('處理檔案時發生錯誤，請檢查資料格式');
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------------------------------------
  // ⭐ 3. 下載（CSV）
  // --------------------------------------------------------
  const handleDownloadCSV = () => {
    if (processedData.length === 0) return;
    const csvContent = generateCSVContent(processedData);
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `網購包裝減量報表_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // --------------------------------------------------------
  // ⭐ 4. 下載（Excel）
  // --------------------------------------------------------
  const handleDownloadExcel = () => {
    if (processedData.length === 0) return;
    const workbook = generateExcelWorkbook(processedData);
    writeFile(workbook, `網購包裝減量報表_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            網購包裝減量換算與會計師報表產生工具
          </h1>
          <p className="text-slate-500">
            自動合併銷貨資料與包裝樣板、計算比值、判定是否符合規範並產生會計稽核報表。
          </p>
        </div>

        {/* 上傳區塊 */}
        <div className="grid md:grid-cols-2 gap-6 bg-white p-8 rounded-xl shadow-sm border border-slate-200">

          {/* 銷貨明細 */}
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              上傳銷貨明細
            </h2>

            <FileUploader
              label="支援 .xlsx, .xls, .csv"
              file={salesFile}
              accept=".csv,.xls,.xlsx"
              onFileSelect={async (file) => {
                setSalesFile(file);
                await saveFile('lastSalesFile', file);
              }}
              onClear={async () => {
                setSalesFile(null);
                setProcessedData([]);
                await clearFile('lastSalesFile');
              }}
            />
          </div>

          {/* 包裝樣板 */}
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              上傳包裝樣板
            </h2>

            <FileUploader
              label="支援 .xlsx, .xls, .csv"
              file={templateFile}
              accept=".csv,.xls,.xlsx"
              onFileSelect={async (file) => {
                setTemplateFile(file);
                await saveFile('lastTemplateFile', file);
              }}
              onClear={async () => {
                setTemplateFile(null);
                setProcessedData([]);
                await clearFile('lastTemplateFile');
              }}
            />
          </div>

        </div>

        {/* 主按鈕 */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleProcess}
            disabled={!salesFile || !templateFile || isProcessing}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-lg text-lg font-medium shadow-lg transition-all
              ${!salesFile || !templateFile
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-blue-200 hover:-translate-y-0.5'}
            `}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                處理中...
              </span>
            ) : (
              <>
                <Calculator size={24} />
                開始換算產生報表
              </>
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </div>

        {/* 結果區 */}
        {processedData.length > 0 && (
          <div className="space-y-6">

            {/* 上方操作列 */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500" />
                <span className="font-semibold text-slate-700">
                  已處理 {processedData.length} 筆資料
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <FileDown size={18} />
                  下載 CSV
                </button>

                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg text-white hover:bg-green-700 shadow-sm"
                >
                  <Download size={18} />
                  下載 Excel
                </button>
              </div>
            </div>

            {/* 表格 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10">
                    <tr>
                      {CSV_HEADERS.map((header) => (
                        <th key={header} className="px-4 py-3 font-semibold border-b border-slate-200">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedData.slice(0, 100).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">{row.salesDate}</td>
                        <td className="px-4 py-2">{row.orderId}</td>
                        <td className="px-4 py-2">{row.sku}</td>
                        <td className="px-4 py-2">{row.productName}</td>
                        <td className="px-4 py-2">{row.quantity}</td>
                        <td className="px-4 py-2">{row.totalScaleWeightA}</td>
                        <td className="px-4 py-2">{row.totalPackagingWeight}</td>
                        <td className="px-4 py-2">{row.totalRecycleBox}</td>
                        <td className="px-4 py-2">{row.totalPaperBox}</td>
                        <td className="px-4 py-2">{row.totalBreakBag}</td>
                        <td className="px-4 py-2">{row.totalTape}</td>
                        <td className="px-4 py-2">{row.totalBuffer}</td>
                        <td className="px-4 py-2">{row.totalProductWeightB}</td>
                        <td className="px-4 py-2">{row.actualRatio}%</td>
                        <td className="px-4 py-2">{row.category}</td>
                        <td className="px-4 py-2">{row.limitRatio}%</td>
                        <td className="px-4 py-2">{row.isCompliant ? '是' : '否'}</td>
                        <td className="px-4 py-2">{row.materialName}</td>
                        <td className="px-4 py-2">{row.itemCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {processedData.length > 100 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-slate-500 text-sm">
                  僅顯示前 100 筆資料，完整內容請下載 Excel 報表
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
