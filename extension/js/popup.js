console.log("popup loaded");

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Toolbar button clicked");
  const data = await getLuminanceData();
  if (data) {
    document.getElementById('current-luminance').textContent = `${data.luminance.toFixed(2)} nits`;
  }
});

async function getLuminanceData() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'get_luminance_data',
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting luminance data:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}