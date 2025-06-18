import initWasmModule, {
  hello_wasm,
  average_luma_in_nits,
  average_luma_in_nits_from_data_uri,
} from './wasm/wasm_mod.js';

const DB_NAME = 'darkWatt-storage';
const DB_VERSION = 1;

let latestSample = null;
const SAMPLE_INTERVAL = 1000;

let isSampling = false;

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

async function saveLuminanceData(data) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_NAME, 'readwrite');

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    const store = tx.objectStore(DB_NAME);
    store.add(data);
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
        console.log(
          `Collected data for range: ${startDate} to ${endDate}, ${weekData.length} samples`
        );
        const averageLuminance =
          weekData.reduce((acc, curr) => acc + curr.luminance, 0) /
          weekData.length;
        resolve(averageLuminance);
      }
    };
  });
}

async function getAllLuminanceData() {
  // TODO: implement
}
async function getLuminanceDataForDate() {
  // TODO: implement
}

async function sampleActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (!tab) return;

  const dataUrl = await captureScreenshot();
  if (!dataUrl) return;

  const nits = average_luma_in_nits_from_data_uri(dataUrl);
  latestSample = { luminance: nits, url: tab.url, date: new Date() };
  return latestSample;
}

async function captureScreenshot() {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error(
          'Error capturing screenshot:',
          chrome.runtime.lastError.message
        );
        reject();
      } else {
        resolve(dataUrl);
      }
    });
  });
}

async function main() {
  // init
  await initWasmModule();
  hello_wasm();
  openDatabase().catch(console.error);

  sampleLoop();
}

async function sampleLoop() {
  const t0 = performance.now();

  try {
    const sample = await sampleActiveTab();
    console.log('sample', sample);
    if (sample) {
      await saveLuminanceData(sample);
    }
  } catch (err) {
    console.error('Sample loop error:', err);
  }
  const elapsed = performance.now() - t0;
  setTimeout(sampleLoop, Math.max(0, SAMPLE_INTERVAL - elapsed));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'average_luma': {
      try {
        const data = new Uint8Array(request.data);
        const result = average_luma(data);
        sendResponse(result);
      } catch (err) {
        console.error('Error computing luma:', err);
        sendResponse(null);
      }
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

    case 'get_current_luminance_data': {
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

    default:
      sendResponse(null);
      return false;
  }
});

main();
