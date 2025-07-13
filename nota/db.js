// db.js - IndexedDB 유틸

const DB_NAME = 'PickaxeDB';
const DB_VERSION = 1;
const STORE_NAME = 'memos';

let db = null;
let dbInitPromise = null;

// DB 초기화를 한 번만 수행하도록 보장
function initDB() {
  // 이미 초기화 중이거나 완료된 경우 기존 Promise 반환
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise((resolve, reject) => {
    // 이미 DB가 열려있으면 즉시 반환
    if (db && db.readyState !== 'done') {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      const error = new Error(`Database error: ${event.target.error}`);
      console.error(error);
      dbInitPromise = null; // 에러 시 재시도 가능하도록
      reject(error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('Database opened successfully.');
      
      // DB 연결이 끊어졌을 때 처리
      db.onclose = () => {
        console.log('Database connection closed');
        db = null;
        dbInitPromise = null;
      };
      
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('Object store created.');
      }
    };
  });

  return dbInitPromise;
}

// 트랜잭션 헬퍼 함수
async function withTransaction(mode, callback) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], mode);
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('Transaction completed successfully');
      };
      
      transaction.onerror = (event) => {
        const error = new Error(`Transaction error: ${event.target.error}`);
        console.error(error);
        reject(error);
      };
      
      transaction.onabort = () => {
        const error = new Error('Transaction aborted');
        console.error(error);
        reject(error);
      };
      
      // 콜백 실행 및 결과 처리
      try {
        const result = callback(store);
        if (result && typeof result.then === 'function') {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    console.error('Failed to create transaction:', error);
    throw error;
  }
}

function addMemo(memo) {
  return withTransaction('readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.add(memo);
      
      request.onsuccess = () => {
        console.log('Memo added successfully:', request.result);
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        const error = new Error(`Error adding memo: ${event.target.error}`);
        console.error(error);
        reject(error);
      };
    });
  });
}

function getAllMemos() {
  return withTransaction('readonly', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        // Sort descending (newest first)
        const memos = request.result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        console.log(`Retrieved ${memos.length} memos`);
        resolve(memos);
      };
      
      request.onerror = (event) => {
        const error = new Error(`Error getting memos: ${event.target.error}`);
        console.error(error);
        reject(error);
      };
    });
  });
}

function getMemo(id) {
  return withTransaction('readonly', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (request.result) {
          console.log('Memo retrieved:', id);
        } else {
          console.log('Memo not found:', id);
        }
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        const error = new Error(`Error getting memo: ${event.target.error}`);
        console.error(error);
        reject(error);
      };
    });
  });
}

function deleteMemo(id) {
  return withTransaction('readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('Memo deleted successfully:', id);
        resolve();
      };
      
      request.onerror = (event) => {
        const error = new Error(`Error deleting memo: ${event.target.error}`);
        console.error(error);
        reject(error);
      };
    });
  });
}

// DB 연결 상태 확인 함수
function isDBReady() {
  return db !== null && db.readyState !== 'done';
}

// DB 연결 닫기 함수 (필요시 사용)
function closeDB() {
  if (db) {
    db.close();
    db = null;
    dbInitPromise = null;
    console.log('Database connection closed manually');
  }
}

export { initDB, addMemo, getAllMemos, getMemo, deleteMemo, isDBReady, closeDB }; 