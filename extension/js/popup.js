console.log('popup loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Toolbar button clicked');
  const currentLuminanceData = await getCurrentLuminanceData();
  if (currentLuminanceData) {
    document.getElementById(
      'current-luminance'
    ).textContent = `${currentLuminanceData.luminance.toFixed(2)} nits`;
  }
  const totalTrackedSites = await getTotalTrackedSites();
  console.log('Tracked sites: ', totalTrackedSites);
  if (typeof totalTrackedSites === 'number') {
    document.getElementById(
      'total-sites'
    ).textContent = `${totalTrackedSites} sites`;
  }
});

async function getCurrentLuminanceData() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'get_current_luminance_data',
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error getting luminance data:',
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
            'Error getting luminance data:',
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
            'Error getting luminance data:',
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
