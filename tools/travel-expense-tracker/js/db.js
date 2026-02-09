/**
 * Database Module for Receipts (IndexedDB)
 */

const DB_NAME = 'TravelTrackerDB';
const STORE_NAME = 'receipts';
const DB_VERSION = 1;

let dbPromise = null;

function initDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };
    });

    return dbPromise;
}

export async function saveReceipt(id, blob) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ id, blob, timestamp: Date.now() });

        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
    });
}

export async function getReceipt(id) {
    if (!id) return null;
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result ? request.result.blob : null);
        request.onerror = () => reject(request.error);
    });
}

export async function deleteReceipt(id) {
    if (!id) return;
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function clearAllReceipts() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
