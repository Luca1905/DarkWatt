import initWasmModule, {
  hello_wasm,
  average_luma_relative,
  average_luma_in_nits,
} from './wasm/wasm_mod.js';

import db from './storage.js';

import { warn, error } from './utils/logger.js';

import { sampleActiveTab as sampleTab } from './background/sampling.js';
import { calculatePotentialSavingsMWh } from './background/savings.js';
import { broadcastStats as sendStats } from './background/stats.js';
import { refreshDisplayInfo, getDisplayDimensions } from './background/display.js';

const SAMPLE_INTERVAL = 1000;

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

async function sampleLoop() {
  const t0 = performance.now();

  try {
    const response = await sampleTab();
    if (response) {
      await db.MUTATIONS.saveLuminanceData(response.sample, response.url);

      const savingMWh = calculatePotentialSavingsMWh(
        response.dataUrl,
        getDisplayDimensions(),
      );

      await sendStats({
        currentLuminance: response.sample,
        potentialSavingMWh: savingMWh,
        totalTrackedSites: await db.QUERIES.getTotalTrackedSites(),
      });
    }
  } catch (err) {
    error('SAMPLE', `${new Date().toISOString()} Sample loop error:`, err);
  }

  const elapsed = performance.now() - t0;
  setTimeout(sampleLoop, Math.max(0, SAMPLE_INTERVAL - elapsed));
}

async function main() {
  await initWasmModule();

  await refreshDisplayInfo();

  hello_wasm();

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
          .then((dataUrl) => {
            const savingMWh = calculatePotentialSavingsMWh(
              dataUrl,
              getDisplayDimensions(),
            );
            return sendStats({ potentialSavingMWh: savingMWh });
          })
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
      await sendStats({ cpuUsage: activeProcess.cpu });
    }
  } catch (err) {
    warn('STATS', 'Error sending stats update:', err);
  }
});


main();
