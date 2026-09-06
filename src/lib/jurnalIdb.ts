import { JurnalPembelajaran } from '../types/jurnalpembelajaran';

const DB_NAME = 'SPANJU_JURNAL_OFFLINE_DB';
const DB_VERSION = 1;
const STORE_NAME = 'jurnal_pembelajaran';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
};

export const idbGetAllJurnal = async (): Promise<JurnalPembelajaran[]> => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as JurnalPembelajaran[]) || [];
        // Sort descending by tanggal
        results.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
        resolve(results);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (e) {
    return [];
  }
};

export const idbSaveJurnal = async (jurnal: JurnalPembelajaran): Promise<boolean> => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(jurnal);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
};

export const idbSaveAllJurnal = async (list: JurnalPembelajaran[]): Promise<boolean> => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing records and rewrite fresh
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        list.forEach((item) => store.put(item));
        resolve(true);
      };
      clearReq.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
};

export const idbDeleteJurnal = async (id: string): Promise<boolean> => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
};
