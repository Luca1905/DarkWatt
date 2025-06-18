console.log('popup loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Toolbar button clicked');
  const currentLuminanceData = await getCurrentLuminanceData();
  if (currentLuminanceData) {
    document.getElementById(
      'current-luminance'
    ).textContent = `${currentLuminanceData.luminance.toFixed(2)} nits`;
  }

  const lastWeekAverageLuminance = await getLuminanceAverageForDateRange(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    new Date().toISOString()
  );
  if (lastWeekAverageLuminance) {
    document.getElementById(
      'week-savings'
    ).textContent = `${lastWeekAverageLuminance.toFixed(2)} nits`;
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
