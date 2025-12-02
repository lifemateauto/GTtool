
const DB_NAME = 'PackagingAppDB';
const STORE_NAME = 'files';
const DB_VERSION = 1;

interface StoredFile {
  name: string;
  type: string;
  data: ArrayBuffer;
  lastModified: number;
}

/* ---------------------------
   Open Database
---------------------------- */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('Browser does not support IndexedDB'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

/* ---------------------------
   Helper: Read File as ArrayBuffer
---------------------------- */
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

/* ---------------------------
   Save File
---------------------------- */
export const saveFile = async (key: string, file: File): Promise<void> => {
  try {
    const db = await openDB();
    const arrayBuffer = await readFileAsArrayBuffer(file);

    const record: StoredFile = {
      name: file.name,
      type: file.type,
      data: arrayBuffer,
      lastModified: file.lastModified,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Error saving file ${key}:`, err);
    throw err;
  }
};

/* ---------------------------
   Load File
---------------------------- */
export const loadFile = async (key: string): Promise<File | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as StoredFile | undefined;
        if (result && result.data) {
          try {
            // Reconstruct the File object from ArrayBuffer
            const file = new File([result.data], result.name, {
              type: result.type,
              lastModified: result.lastModified,
            });
            resolve(file);
          } catch (e) {
            console.error('Error reconstructing file:', e);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Error loading file ${key}:`, err);
    return null;
  }
};

/* ---------------------------
   Clear File
---------------------------- */
export const clearFile = async (key: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Error clearing file ${key}:`, err);
    throw err;
  }
};

/* ---------------------------
   Clear All Files
---------------------------- */
export const clearAllFiles = async (): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error clearing all files:', err);
    throw err;
  }
};
