const DB_NAME = 'darkWatt-storage';
const DB_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DB_NAME)) {
        const store = db.createObjectStore(DB_NAME, { keyPath: 'date' });
        store.createIndex('date', 'date', { unique: true });
        store.createIndex('url', 'url', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

const QUERIES = {
  getAllLuminanceData: async () => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_NAME, 'readonly');
      tx.onerror = () => reject(tx.error);

      const store = tx.objectStore(DB_NAME);

      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  },

  getLatestLuminanceData: async () => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_NAME, 'readonly');
      tx.onerror = () => reject(tx.error);

      const store = tx.objectStore(DB_NAME);
      const request = store.openCursor(null, 'prev');

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        resolve(cursor ? cursor.value : null);
      };
    });
  },

  getLuminanceAverageForDateRange: async (startDate, endDate) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const weekData = [];
      const keyRange = IDBKeyRange.bound(startDate, endDate);

      const tx = db.transaction(DB_NAME, 'readonly');
      tx.onerror = () => reject(tx.error);

      const store = tx.objectStore(DB_NAME);

      store.openCursor(keyRange).onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          weekData.push(cursor.value);
          cursor.continue();
        } else {
          const averageLuminance =
            weekData.reduce((acc, curr) => acc + curr.luminance, 0) /
            (weekData.length || 1);
          resolve(averageLuminance);
        }
      };
    });
  },

  getLuminanceDataForDate: async (date) => {
    const dayBeginning = new Date(date);
    dayBeginning.setHours(0, 0, 0, 0);
    const dayEnding = new Date(date);
    dayEnding.setHours(23, 59, 59, 999);

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const dayData = [];
      const keyRange = IDBKeyRange.bound(dayBeginning, dayEnding);

      const tx = db.transaction(DB_NAME, 'readonly');
      tx.onerror = () => reject(tx.error);

      const store = tx.objectStore(DB_NAME);

      store.openCursor(keyRange).onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          dayData.push(cursor.value);
          cursor.continue();
        } else {
          const averageLuminance =
            dayData.reduce((acc, curr) => acc + curr.luminance, 0) /
            (dayData.length || 1);
          resolve(averageLuminance);
        }
      };
    });
  },

  getTotalTrackedSites: async () => {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      let totalSites = 0;

      const tx = db.transaction(DB_NAME, 'readonly');
      tx.onerror = () => reject(tx.error);

      const store = tx.objectStore(DB_NAME);
      const indexedByUrl = store.index('url');

      indexedByUrl.openCursor(null, 'nextunique').onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          totalSites++;
          cursor.continue();
        } else {
          resolve(totalSites);
        }
      };
    });
  },
};

const MUTATIONS = {
  saveLuminanceData: async (nits, url) => {
    const db = await openDatabase();

    const record = {
      luminance: nits,
      url: url,
      date: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_NAME, 'readwrite');

      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();

      const store = tx.objectStore(DB_NAME);
      store.add(record);
    });
  },
};

export default { QUERIES, MUTATIONS };
