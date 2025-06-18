console.log('popup loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Toolbar button clicked');
  const latestLuminanceData = await getLatestLuminanceData();
  if (latestLuminanceData) {
    document.getElementById(
      'current-luminance'
    ).textContent = `${data.luminance.toFixed(2)} nits`;
  }

  const lastWeekLuminanceData = await getLuminanceDataForDateRange(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    new Date()
  );
  if (lastWeekLuminanceData) {
    document.getElementById('last-week-luminance').textContent = `${lastWeekLuminanceData.luminance.toFixed(2)} nits`;
  }
});

async function getLatestLuminanceData() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'get_latest_luminance_data',
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

async function getLuminanceDataForDateRange(startDate, endDate) {
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
