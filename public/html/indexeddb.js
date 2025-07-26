const DB_NAME = 'AkRougeJieDB';
const DB_VERSION = 1;
const STORE_NAME = 'mapData';

let dbInstance = null;

// 打开或创建数据库
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        // 创建对象存储空间
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // 如果存在旧的存储空间，删除它
            if (db.objectStoreNames.contains(STORE_NAME)) {
                db.deleteObjectStore(STORE_NAME);
            }

            // 创建新的对象存储空间
            const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            
            // 创建索引
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        };
    });
}

// 保存数据到 IndexedDB
function saveToIndexedDB(data) {
    return new Promise((resolve, reject) => {
        if (!dbInstance) {
            reject(new Error('数据库未初始化'));
            return;
        }

        // 添加ID和时间戳
        const dataToSave = {
            id: 'mainData',
            ...data,
            timestamp: new Date().toISOString()
        };

        const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.put(dataToSave);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// 从 IndexedDB 加载数据
function loadFromIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!dbInstance) {
            reject(new Error('数据库未初始化'));
            return;
        }

        const transaction = dbInstance.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.get('mainData');

        request.onsuccess = () => {
            resolve(request.result ? request.result : null);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// 清除 IndexedDB 中的数据
function clearIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!dbInstance) {
            reject(new Error('数据库未初始化'));
            return;
        }

        const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.delete('mainData');

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// 导出函数
window.IndexedDBManager = {
    openDatabase,
    saveToIndexedDB,
    loadFromIndexedDB,
    clearIndexedDB
};