console.log('[UI] popup loaded');

const appState = {
  currentLuminance: null,
  totalTrackedSites: null,
  todaySavings: null,
  weekSavings: null,
  totalSavings: null,
  potentialSaving: null,
};

const stateSubscribers = new Set();

function subscribeToState(callback) {
  stateSubscribers.add(callback);
  callback({ ...appState });
  return () => stateSubscribers.delete(callback);
}

function updateState(updates) {
  let hasChanges = false;
  for (const key in updates) {
    if (appState[key] !== updates[key]) {
      appState[key] = updates[key];
      hasChanges = true;
    }
  }
  if (hasChanges) {
    const snapshot = { ...appState };
    stateSubscribers.forEach((fn) => fn(snapshot));
  }
}

function renderStats(applicationState) {
  const getElementById = (elementId) => document.getElementById(elementId);

  const currentLuminanceElement = getElementById('current-luminance');
  currentLuminanceElement.textContent =
    typeof applicationState.currentLuminance == 'number'
      ? `${applicationState.currentLuminance.toFixed(2)} nits`
      : '-- nits';

  const totalSitesElement = getElementById('total-sites');
  totalSitesElement.textContent =
    typeof applicationState.totalTrackedSites == 'number'
      ? `${applicationState.totalTrackedSites} sites`
      : '--';

  if (typeof applicationState.todaySavings == 'number') {
    const todaySavingsElement = getElementById('today-savings');
    todaySavingsElement.textContent = `${applicationState.todaySavings.toFixed(
      1
    )} mWh`;
  }

  if (typeof applicationState.weekSavings == 'number') {
    const weekSavingsElement = getElementById('week-savings');
    weekSavingsElement.textContent = `${applicationState.weekSavings.toFixed(
      1
    )} mWh`;
  }

  if (typeof applicationState.totalSavings == 'number') {
    const totalSavingsElement = getElementById('total-savings');
    totalSavingsElement.textContent = `${applicationState.totalSavings.toFixed(
      1
    )} mWh`;
  }

  const potentialElement = getElementById('potential-saving');
  if (potentialElement) {
    potentialElement.textContent =
      typeof applicationState.potentialSaving == 'number'
        ? `${applicationState.potentialSaving.toFixed(2)} nits`
        : '--';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [nits, sites] = await Promise.all([
      getCurrentLuminanceData(),
      getTotalTrackedSites(),
    ]);
    if (typeof nits === 'number') updateState({ currentLuminance: nits });
    if (typeof sites === 'number') updateState({ totalTrackedSites: sites });
  } catch (err) {
    console.error(err);
  }
  subscribeToState(renderStats);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'stats_update':
      if (message.stats) updateState(message.stats);
      sendResponse(appState);
      return false;
    default:
      sendResponse(null);
      return false;
  }
});

window.darkWattStateStore = {
  appState: { ...appState },
  updateState,
  subscribeToState,
};

async function getCurrentLuminanceData() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'get_current_luminance_data',
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error getting current luminance data:',
            chrome.runtime.lastError
          );
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      }
    );
  });
}

async function getTotalTrackedSites() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'get_total_tracked_sites',
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error getting total tracked sites:',
            chrome.runtime.lastError
          );
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      }
    );
  });
}

async function getLuminanceAverageForDateRange(startDate, endDate) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'get_luminance_data_for_date_range',
        startDate,
        endDate,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error getting luminance data for date range:',
            chrome.runtime.lastError
          );
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      }
    );
  });
}
