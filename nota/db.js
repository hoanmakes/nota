// db.js - IndexedDB 유틸

const DB_NAME = 'notaDB';
const DB_VERSION = 1;
const STORE_NAME = 'memos';

let db;

function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database error:', event.target.error);
      reject('Database error');
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('Database opened successfully.');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('Object store created.');
      }
    };
  });
}

function addMemo(memo) {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(memo);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject('Error adding memo: ' + event.target.error);
    });
  });
}

function getAllMemos() {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      const request = index.getAll(); // Sort by createdAt index is complex, so we sort in app logic

      request.onsuccess = () => {
        // Sort descending (newest first)
        resolve(request.result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      };
      request.onerror = (event) => reject('Error getting memos: ' + event.target.error);
    });
  });
}

function deleteMemo(id) {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject('Error deleting memo: ' + event.target.error);
    });
  });
} 