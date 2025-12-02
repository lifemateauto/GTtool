export interface AppState {
  salesFileName: string;
  templateFileName: string;
  result: any[];
}

const STORAGE_KEY = "gtool-state";

// ------------------------------
// 讀取 state
// ------------------------------
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { salesFileName: "", templateFileName: "", result: [] };
    return JSON.parse(raw) as AppState;
  } catch {
    return { salesFileName: "", templateFileName: "", result: [] };
  }
}

// ------------------------------
// 儲存 state
// ------------------------------
export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ------------------------------
// 清除 state
// ------------------------------
export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}
