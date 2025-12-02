
export interface SalesRow {
  销货日期: string;
  销货单号: string;
  品号: string;
  品名: string;
  销货数量: number;
  [key: string]: any; // Allow other columns
}

export interface TemplateRow {
  productId: string;        // 品號
  productName: string;      // 品名
  
  // Weights (Unit weights)
  pack_recycleBox: number;  // 回收箱(KG)a1
  pack_paperBox: number;    // 紙箱(KG)
  pack_breakBag: number;    // 破壞袋(KG)B
  pack_tape: number;        // 膠帶(KG)C
  pack_buffer: number;      // 回收緩衝材(KG)D
  productWeightKg: number;  // 商品總重量(KG)B
  
  packName: string;         // 使用包材名稱/規格
}

export enum WeightCategory {
  Small = '<= 1KG',
  Medium = '1KG - 3KG',
  Large = '> 3KG',
}

export interface ProcessedRow {
  id: string;
  
  // Raw Data
  salesDate: string;
  orderId: string;
  sku: string;
  productName: string;
  quantity: number;
  
  // Calculated Totals (Line Item Totals)
  totalScaleWeightA: number;      // 秤總重 (A) = Product + Packaging (or just Product depending on interpretation, using A=Product+Pkg for accuracy)
  totalPackagingWeight: number;   // 網購包材重量合計
  
  // Component Totals
  totalRecycleBox: number;
  totalPaperBox: number;
  totalBreakBag: number;
  totalTape: number;
  totalBuffer: number;
  
  totalProductWeightB: number;    // 商品總重量 (B)
  
  // Logic
  actualRatio: number;
  category: WeightCategory;
  limitRatio: number;
  isCompliant: boolean;
  materialName: string;
  itemCount: number; // Always 1
}
