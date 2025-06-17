console.log('CONTENT SCRIPT LOADED');

let db;

async function captureScreenshot() {
  const screenshotDataUrl = await chrome.runtime.sendMessage({
    action: 'capture_screenshot',
  });
  if (!screenshotDataUrl) {
    console.error('Failed to capture screenshot');
    return null;
  }
  return screenshotDataUrl;
}

async function loadImage(dataUrl) {
  const img = document.createElement('img');
  img.src = dataUrl;
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = () => {
      console.error('Failed to load screenshot image');
      resolve();
    };
  });
  return img;
}

function getImagePixels(img) {
  const sampleSize = 16;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  return Array.from(imageData.data);
}

async function calculateLuminance(pixels) {
  const luminance = await chrome.runtime.sendMessage({
    action: 'average_luma_in_nits',
    data: pixels,
  });

  if (typeof luminance !== 'number') {
    console.error('Failed to compute luminance, response:', luminance);
    return null;
  }
  console.log('Average luminance (nits):', luminance);
  return luminance;
}

function initDatabase() {
  return new Promise((resolve, reject) => {
    const DBOpenRequest = window.indexedDB.open('darkWatt-storage', 1);
    DBOpenRequest.onerror = (event) => {
      console.error('Error opening database:', event.target.error);
      reject(event.target.error);
    };
    DBOpenRequest.onsuccess = () => {
      db = DBOpenRequest.result;
      resolve();
    };
    DBOpenRequest.onupgradeneeded = (event) => {
      db = event.target.result;
      const objectStore = db.createObjectStore('darkWatt-storage', {
        keyPath: 'date',
      });
      objectStore.createIndex('date', 'date', { unique: true });
    };
  });
}

function saveLuminanceData(luminance) {
  const transaction = db.transaction('darkWatt-storage', 'readwrite');
  transaction.onerror = (event) => {
    console.error(
      'Error saving luminance data to database:',
      event.target.error
    );
  };
  transaction.oncomplete = () => {
    console.log('Transaction completed');
  };

  const objectStore = transaction.objectStore('darkWatt-storage');
  const objectStoreRequest = objectStore.add({
    date: new Date().toISOString(),
    luminance,
  });
  objectStoreRequest.onsuccess = () => {
    console.log('Request successful.');
  };
}

async function processScreenshot() {
  const screenshotDataUrl = await captureScreenshot();
  if (!screenshotDataUrl) return;

  const img = await loadImage(screenshotDataUrl);
  const pixels = getImagePixels(img);
  const luminance = await calculateLuminance(pixels);

  if (luminance !== null) {
    saveLuminanceData(luminance);
  }
}

(async () => {
  try {
    if (document.visibilityState !== 'visible') return;
    await initDatabase();

    (async function run() {
      try {
        if (!chrome.runtime?.id) {
          console.log(
            'Extension context invalidated. Stopping screenshot processing.'
          );
          return;
        }
        await processScreenshot();
        setTimeout(run, 1000);
      } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
          console.log(
            'Extension context invalidated. Stopping screenshot processing.'
          );
        } else {
          console.error('Error in screenshot processing loop:', error);
        }
      }
    })();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
})();
