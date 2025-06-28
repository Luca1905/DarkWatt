import initWasmModule, {
  hello_wasm,
  average_luma_relative,
  average_luma_in_nits,
  average_luma_in_nits_from_data_uri,
  estimate_saved_energy_mwh_from_data_uri,
  DisplayTech,
} from './wasm/wasm_mod.js';

import db from './storage.js';

import { log, warn, error } from './utils/logger.js';

const SAMPLE_INTERVAL = 1000;

let currentPageMode = 'unknown';
let displayDimensions = { width: 0, height: 0 };

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
      dataUrl: response,
      sample: average_luma_in_nits_from_data_uri(response),
      url: tab.url,
    };
  } catch (err) {
    warn(
      'SAMPLE',
      `${new Date().toISOString()} skipped sample:`,
      err.toString()
    );
    return null;
  }
}

async function broadcastStats(partialStats = {}) {
  try {
    await chrome.runtime.sendMessage({
      action: 'stats_update',
      stats: partialStats,
    });
  } catch (err) {
    warn('STATS', `${new Date().toISOString()} skipped stats update:`, {
      message: err,
    });
  }
}

async function sampleLoop() {
  const t0 = performance.now();

  try {
    const response = await sampleActiveTab();
    if (response) {
      await db.MUTATIONS.saveLuminanceData(response.sample, response.url);
      updateSavings(response.dataUrl);
      await broadcastStats({
        currentLuminance: response.sample,
        totalTrackedSites: await db.QUERIES.getTotalTrackedSites(),
      });
    }
  } catch (err) {
    error('SAMPLE', `${new Date().toISOString()} Sample loop error:`, err);
  }
  const elapsed = performance.now() - t0;
  setTimeout(sampleLoop, Math.max(0, SAMPLE_INTERVAL - elapsed));
}

function updateSavings(dataUrl) {
  const { width, height } = displayDimensions;
  const hours = 1;
  const tech = DisplayTech.LCD;

  const savingMWh = estimate_saved_energy_mwh_from_data_uri(
    Math.round(width),
    Math.round(height),
    hours,
    tech,
    dataUrl
  );
  broadcastStats({ potentialSavingMWh: savingMWh });
}

async function main() {
  // init
  await initWasmModule();

  await refreshDisplayInfo();

  hello_wasm();
  // initial database setup is handled by QUERIES and MUTATIONS as needed

  sampleLoop();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'average_luma': {
      try {
        const data = new Uint8Array(request.data);
        const result = average_luma_relative(data);
        sendResponse(result);
      } catch (err) {
        error('LUMA', 'Error computing luma:', err);
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
        error('LUMA', 'Error computing luma:', err);
        sendResponse(null);
      }
      return false;
    }

    case 'get_current_luminance_data': {
      db.QUERIES.getLatestLuminanceData()
        .then((data) => sendResponse(data))
        .catch((err) => {
          error('DB', 'Error fetching luminance data:', err);
          sendResponse(null);
        });
      return true;
    }

    case 'get_all_luminance_data': {
      db.QUERIES.getAllLuminanceData()
        .then((data) => sendResponse(data))
        .catch((err) => {
          error('DB', 'Error fetching luminance data:', err);
          sendResponse(null);
        });
      return true;
    }

    case 'get_luminance_data_for_date': {
      db.QUERIES.getLuminanceDataForDate(request.date)
        .then((data) => sendResponse(data))
        .catch((err) => {
          error('DB', 'Error fetching luminance data:', err);
          sendResponse(null);
        });
      return true;
    }

    case 'get_luminance_data_for_date_range': {
      db.QUERIES.getLuminanceAverageForDateRange(
        request.startDate,
        request.endDate
      )
        .then((data) => sendResponse(data))
        .catch((err) => {
          error('DB', 'Error fetching luminance data:', err);
          sendResponse(null);
        });
      return true;
    }

    case 'get_total_tracked_sites': {
      db.QUERIES.getTotalTrackedSites()
        .then((data) => sendResponse(data))
        .catch((err) => {
          error('DB', 'Error fetching luminance data:', err);
          sendResponse(null);
        });
      return true;
    }

    case 'page_mode_detected': {
      currentPageMode = request.mode || 'unknown';

      if (currentPageMode === 'light') {
        captureScreenshot()
          .then((dataUrl) => updateSavings(dataUrl))
          .catch((err) => {
            error('DARKWATT', 'error calculating savings:', err);
          })
          .finally(() => sendResponse({ status: 'ok' }));
        return true;
      } else {
        sendResponse({ status: 'ok' });
        return false;
      }
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

    const activeProcessId = await chrome.processes.getProcessIdForTab(
      currentTab.id
    );
    const activeProcess = processes[activeProcessId];

    if (activeProcess && typeof activeProcess.cpu === 'number') {
      await broadcastStats({ cpuUsage: activeProcess.cpu });
    }
  } catch (err) {
    warn('STATS', 'Error sending stats update:', err);
  }
});

function displayLengthsFromInfo(displayInfo) {
  if (!displayInfo) return { width: 0, height: 0 };

  const CSS_DPI = 96;
  const { width: pixelW, height: pixelH } = displayInfo.workArea;
  const dsf = displayInfo.deviceScaleFactor || 1;

  const widthInches = pixelW / dsf / CSS_DPI;
  const heightInches = pixelH / dsf / CSS_DPI;

  return { width: widthInches, height: heightInches };
}

async function refreshDisplayInfo() {
  try {
    const displays = await chrome.system.display.getInfo();
    const primaryDisplay = displays.find((d) => d.isPrimary) || displays[0];
    log('DISPLAY', 'primaryDisplay:', primaryDisplay);
    displayDimensions = displayLengthsFromInfo(primaryDisplay);
    log('DISPLAY', 'displayDimensions:', displayDimensions);
    broadcastStats({ displayInfo: displayDimensions });
  } catch (err) {
    error('DISPLAY', 'Failed to fetch:', err);
  }
}

chrome.system.display.onDisplayChanged.addListener(refreshDisplayInfo);

main();
