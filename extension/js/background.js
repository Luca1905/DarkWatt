import initWasmModule, {
  hello_wasm,
  average_luma_in_nits,
} from './wasm/wasm_mod.js';

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

async function saveLuminanceData(luminance, url) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_NAME, 'readwrite');

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    const store = tx.objectStore(DB_NAME);
    store.add({ date: new Date().toISOString(), luminance, url });
  });
}

async function getLatestLuminanceData() {
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
}

async function getLuminanceAverageForDateRange(startDate, endDate) {
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
        console.log(`Collected data for range: ${startDate} to ${endDate}`);
        console.log(weekData);
        const averageLuminance =
          weekData.reduce((acc, curr) => acc + curr.luminance, 0) /
          weekData.length;
        resolve(averageLuminance);
      }
    };
  });
}

async function getAllLuminanceData() {}
async function getLuminanceDataForDate() {}

(async () => {
  await initWasmModule();
  hello_wasm();
  openDatabase().catch(console.error);
})();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'capture_screenshot': {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error capturing screenshot:',
            chrome.runtime.lastError
          );
          sendResponse(null);
        } else {
          sendResponse(dataUrl);
        }
      });
      return true;
    }

    case 'average_luma_in_nits': {
      try {
        const data = new Uint8Array(request.data);
        const result = average_luma_in_nits(data);
        sendResponse(result);
      } catch (err) {
        console.error('Error computing luma:', err);
        sendResponse(null);
      }
      return false;
    }

    case 'get_latest_luminance_data': {
      getLatestLuminanceData()
        .then((data) => sendResponse(data))
        .catch((err) => {
          console.error('Error fetching luminance data:', err);
          sendResponse(null);
        });
      return true;
    }

    case 'get_all_luminance_data': {
      getAllLuminanceData()
        .then((data) => sendResponse(data))
        .catch((err) => {
          console.error('Error fetching luminance data:', err);
          sendResponse(null);
        });
      return true;
    }

    case 'get_luminance_data_for_date': {
      getLuminanceDataForDate(request.date)
        .then((data) => sendResponse(data))
        .catch((err) => {
          console.error('Error fetching luminance data:', err);
          sendResponse(null);
        });
      return true;
    }

    case 'get_luminance_data_for_date_range': {
      getLuminanceAverageForDateRange(request.startDate, request.endDate)
        .then((data) => sendResponse(data))
        .catch((err) => {
          console.error('Error fetching luminance data:', err);
          sendResponse(null);
        });
      return true;
    }

    case 'save_luminance_data': {
      saveLuminanceData(request.data.luminance, request.data.url)
        .then(() => sendResponse(true))
        .catch((err) => {
          console.error('Error saving luminance data:', err);
          sendResponse(false);
        });
      return true;
    }

    default:
      sendResponse(null);
      return false;
  }
});
