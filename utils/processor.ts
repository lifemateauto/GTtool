import Papa from 'papaparse';
import { read, utils } from 'xlsx';
import { SalesRow, TemplateRow, ProcessedRow, WeightCategory } from '../types';
import { CSV_HEADERS } from '../constants';

/* ---------------------------
   數字安全轉換
---------------------------- */
const safeFloat = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/,/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

/* ---------------------------
   將欄位名稱正規化（移除空格、換行、全形空白）
---------------------------- */
const normalizeHeader = (header: string): string => {
  if (!header) return '';
  return String(header)
    .replace(/[\r\n\t\s\u3000]+/g, '') // 含全形空白
    .replace(/（/g, '(')
    .replace(/）/g, ')');
};

/* ---------------------------
   解析 CSV / Excel
---------------------------- */
export const parseFile = <T>(file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const lower = file.name.toLowerCase();

    // CSV
    if (lower.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data as any[]),
        error: (error) => reject(error),
      });
      return;
    }

    // Excel
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];

          const jsonAoA = utils.sheet_to_json(sheet, { header: 1, defval: '' });
          if (jsonAoA.length === 0) return resolve([]);

          const rawHeaders = jsonAoA[0] as string[];
          const rows = jsonAoA.slice(1);

          const mapped = rows.map((r) => {
            const obj: any = {};
            rawHeaders.forEach((h, i) => {
              if (h) obj[h] = r[i];
            });
            return obj;
          });

          resolve(mapped);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    reject(new Error(`不支援的檔案格式: ${file.name}`));
  });
};

/* ---------------------------
   欄位辨識模糊比對
   Excel 常有換行、空白、()、全形空格等混淆 → 全部用 includes 判斷
---------------------------- */
const fuzzyMatch = (row: any, keywords: string[]) => {
  const keys = Object.keys(row);
  const normMap = keys.map((k) => normalizeHeader(k));

  for (const kw of keywords) {
    const normalizedKw = normalizeHeader(kw);

    const idx = normMap.findIndex((nk) => nk.includes(normalizedKw));
    if (idx >= 0) return row[keys[idx]];
  }
  return undefined;
};

/* ---------------------------
   主處理邏輯
---------------------------- */
export const processData = (salesData: any[], templateData: any[]): ProcessedRow[] => {
  const templateMap = new Map<string, TemplateRow>();

  /* ---------------------------
     樣板欄位模糊比對設定
  ---------------------------- */
  const TM = {
    productId: ['品號', 'productid'],
    productName: ['品名', 'productname'],

    pack_recycleBox: ['回收箱(KG)a1', '回收箱(KG)', '回收箱'],
    pack_paperBox: ['紙箱(KG)', '紙箱'],
    pack_breakBag: ['破壞袋(KG)', '破壞袋'],
    pack_tape: ['膠帶(KG)', '膠帶'],
    pack_buffer: ['回收緩衝材(KG)', '緩衝材', '泡泡紙', '包材D'],

    productWeightKg: ['商品總重量(KG)B', '商品總重量(KG)', '商品總重量'],

    packName: ['使用包材名稱', '包材規格', '使用包材名稱/規格']
  };

  /* ---------------------------
     建立樣板 Map
  ---------------------------- */
  templateData.forEach((row) => {
    const sku = String(fuzzyMatch(row, TM.productId) || '').trim();
    if (!sku) return;

    templateMap.set(sku, {
      productId: sku,
      productName: fuzzyMatch(row, TM.productName),
      pack_recycleBox: safeFloat(fuzzyMatch(row, TM.pack_recycleBox)),
      pack_paperBox: safeFloat(fuzzyMatch(row, TM.pack_paperBox)),
      pack_breakBag: safeFloat(fuzzyMatch(row, TM.pack_breakBag)),
      pack_tape: safeFloat(fuzzyMatch(row, TM.pack_tape)),
      pack_buffer: safeFloat(fuzzyMatch(row, TM.pack_buffer)),
      productWeightKg: safeFloat(fuzzyMatch(row, TM.productWeightKg)),
      packName: fuzzyMatch(row, TM.packName) || '',
    });
  });

  /* ---------------------------
     銷貨明細欄位辨識
  ---------------------------- */
  const SM = {
    sku: ['品號'],
    qty: ['銷貨數量', '數量', 'qty', '售出數量'],
    date: ['銷貨日期', '日期'],
    orderNo: ['銷貨單號', '單號'],
    name: ['品名', '產品名稱']
  };

  /* ---------------------------
     處理每筆銷貨資料
  ---------------------------- */
  return salesData.map((sale, index) => {
    const sku = String(fuzzyMatch(sale, SM.sku) || '').trim();
    const qty = safeFloat(fuzzyMatch(sale, SM.qty));
    const salesDate = fuzzyMatch(sale, SM.date) || '';
    const orderId = fuzzyMatch(sale, SM.orderNo) || '';
    const name = fuzzyMatch(sale, SM.name) || '';

    const tpl = templateMap.get(sku);

    let r = 0, p = 0, b = 0, t = 0, buf = 0;
    let productWeight = 0;
    let packName = '未建立樣板';

    if (tpl) {
      r = tpl.pack_recycleBox;
      p = tpl.pack_paperBox;
      b = tpl.pack_breakBag;
      t = tpl.pack_tape;
      buf = tpl.pack_buffer;

      productWeight = tpl.productWeightKg;
      packName = tpl.packName || '未建立樣板';
    }

    /* ---------------------------
       計算邏輯
    ---------------------------- */

    // 單位包材重量合計
    const pkgUnit = r + p + b + t + buf;

    // 包材重量（全部）
    const totalPackagingWeight = pkgUnit * qty;

    // 商品重量 B
    const totalProductWeightB = productWeight * qty;

    // 秤重 A（總包裏重）= B + 包材重量
    const totalScaleWeightA = totalProductWeightB + totalPackagingWeight;

    // 實際比值
    let actualRatio = 0;
    if (totalProductWeightB > 0) {
      actualRatio = (totalPackagingWeight / totalProductWeightB) * 100;
    }

    // 分類邏輯
    let category: WeightCategory = WeightCategory.Small;
    let limitRatio = 40;

    if (totalProductWeightB <= 1) {
      category = WeightCategory.Small;
      limitRatio = 40;
    } else if (totalProductWeightB > 1 && totalProductWeightB <= 3) {
      category = WeightCategory.Medium;
      limitRatio = 30;
    } else {
      category = WeightCategory.Large;
      limitRatio = 15;
    }

    const isCompliant = actualRatio <= limitRatio;

    return {
      id: `${orderId}-${sku}-${index}`,
      salesDate,
      orderId,
      sku,
      productName: name,
      quantity: qty,

      totalScaleWeightA: Number(totalScaleWeightA.toFixed(4)),
      totalPackagingWeight: Number(totalPackagingWeight.toFixed(4)),

      totalRecycleBox: Number((r * qty).toFixed(4)),
      totalPaperBox: Number((p * qty).toFixed(4)),
      totalBreakBag: Number((b * qty).toFixed(4)),
      totalTape: Number((t * qty).toFixed(4)),
      totalBuffer: Number((buf * qty).toFixed(4)),

      totalProductWeightB: Number(totalProductWeightB.toFixed(4)),

      actualRatio: Number(actualRatio.toFixed(2)),
      category,
      limitRatio,
      isCompliant,
      materialName: packName,
      itemCount: 1
    };
  });
};

/* ---------------------------
   匯出為 CSV / Excel 資料格式
---------------------------- */
const convertToExportRow = (row: ProcessedRow) => ({
  '銷貨日期': row.salesDate,
  '銷貨單號': row.orderId,
  '品號': row.sku,
  '品名': row.productName,
  '銷貨數量': row.quantity,
  '秤總重（總包裏重 A）': row.totalScaleWeightA,
  '網購包材重量合計(KG)': row.totalPackagingWeight,
  '回收箱(KG)a1': row.totalRecycleBox,
  '紙箱(KG)': row.totalPaperBox,
  '破壞袋(KG)': row.totalBreakBag,
  '膠帶(KG)': row.totalTape,
  '回收緩衝材(KG)': row.totalBuffer,
  '商品總重量(KG)B': row.totalProductWeightB,
  '實際比值(%)': row.actualRatio,
  '商品總重量比值分類': row.category,
  '規定比值(%)': `${row.limitRatio}%`,
  '是否符合': row.isCompliant ? '是' : '否',
  '使用包材名稱/規格': row.materialName,
  '件數': row.itemCount
});

export const generateCSVContent = (data: ProcessedRow[]): string => {
  const rows = data.map(convertToExportRow);
  return Papa.unparse(rows, { columns: CSV_HEADERS });
};

export const generateExcelWorkbook = (data: ProcessedRow[]) => {
  const rows = data.map(convertToExportRow);
  const ws = utils.json_to_sheet(rows, { header: CSV_HEADERS });
  ws['!cols'] = CSV_HEADERS.map((h) => ({ wch: Math.max(h.length * 2, 12) }));
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, '減量計算報表');
  return wb;
};
