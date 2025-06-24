import initWasmModule, {
  hello_wasm,
  average_luma_in_nits,
  average_luma_in_nits_from_data_uri,
} from './wasm/wasm_mod.js';

const DB_NAME = 'darkWatt-storage';
const DB_VERSION = 1;

let latestSample = null;
const SAMPLE_INTERVAL = 1000;

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

async function saveLuminanceData(nits, url) {
  const db = await openDatabase();

  latestSample = {
    luminance: nits,
    url: url,
    date: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_NAME, 'readwrite');

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    const store = tx.objectStore(DB_NAME);
    store.add(latestSample);
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
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_NAME, 'readonly');
    tx.onerror = () => reject(tx.error);

    const store = tx.objectStore(DB_NAME);

    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      resolve(event.target.result.value);
    };
  });
}

async function getLuminanceDataForDate(date) {
  const dayBeginning = new Date(date);
  dayBeginning.setHours(0, 0, 0, 0);
  const dayEnding = new Date(date);
  dayEnding.setHours(0, 0, 0, 0);

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
        console.log(
          `Collected data for range: ${startDate} to ${endDate}, ${dayData.length} samples`
        );
        const averageLuminance =
          dayData.reduce((acc, curr) => acc + curr.luminance, 0) /
          dayData.length;
        resolve(averageLuminance);
      }
    };
  });
}

async function getTotalTrackedSites() {
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
}

async function captureScreenshot() {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(dataUrl);
      }
    });
  });
}

async function sampleActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab) return null;

    const response = await captureScreenshot().then(
      (dataUrl) => (typeof dataUrl !== 'string' ? null : dataUrl),
      (err) => {
        throw new Error({ message: err.message });
      }
    );

    if (!response) return null;

    return {
      sample: average_luma_in_nits_from_data_uri(response),
      url: tab.url,
    };
  } catch (err) {
    console.log(`[SAMPLE - ${new Date().toISOString()}] skipped sample:`, {
      message: err.message,
    });
    return null;
  }
}

async function broadcastStats() {
  try {
    await chrome.runtime.sendMessage({
      action: 'stats_update',
      stats: {
        currentLuminance: latestSample?.luminance ?? null,
        totalTrackedSites: await getTotalTrackedSites(),
        cpuUsage: null,
      },
    });
  } catch (err) {
    console.log(
      `[STATS  - ${new Date().toISOString()}] skipped stats update:`,
      { message: err }
    );
    return;
  }
}

async function sampleLoop() {
  const t0 = performance.now();

  try {
    const response = await sampleActiveTab();
    if (response) {
      await saveLuminanceData(response.sample, response.url);
      await broadcastStats();
      console.log(
        `[SAMPLE - ${new Date().toISOString()}] saved sample ${
          response.sample
        } for ${response.url} `
      );
    }
  } catch (err) {
    console.error(
      `[SAMPLE - ${new Date().toISOString()}] Sample loop error:`,
      err
    );
  }
  const elapsed = performance.now() - t0;
  setTimeout(sampleLoop, Math.max(0, SAMPLE_INTERVAL - elapsed));
}

async function main() {
  // init
  await initWasmModule();
  hello_wasm();
  openDatabase().catch(console.error);

  sampleLoop();
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
      return false;
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

    case 'get_total_tracked_sites': {
      getTotalTrackedSites()
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

// duplicate stats broadcast, for accesss to processes ( CPU Usage )
chrome.processes.onUpdated.addListener(async (processes) => {
  try {
    const [currentTab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!currentTab) return;

    let activeProcessId = await chrome.processes.getProcessIdForTab(
      currentTab.id
    );
    let activeProcess = processes[activeProcessId];

    const response = await chrome.runtime.sendMessage({
      action: 'stats_update',
      stats: {
        currentLuminance: latestSample?.luminance ?? null,
        totalTrackedSites: await getTotalTrackedSites(),
        cpuUsage: activeProcess.cpu,
      },
    });
    console.log(
      `[STATS  - ${new Date().toISOString()}] updated stats: `,
      response
    );
  } catch (err) {
    console.log(
      `[STATS  - ${new Date().toISOString()}] skipped stats update:`,
      { message: err }
    );
    return;
  }
});

main();
