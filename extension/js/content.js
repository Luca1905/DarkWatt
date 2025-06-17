console.log('CONTENT SCRIPT LOADED');

(async () => {
  const screenshotDataUrl = await chrome.runtime.sendMessage({ action: 'capture_screenshot' });
  if (!screenshotDataUrl) {
    console.error('Failed to capture screenshot');
    return false;
  }

  const img = document.createElement('img');
  img.src = screenshotDataUrl;
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = () => {
      console.error('Failed to load screenshot image');
      resolve();
    };
  });

  const sampleSize = 16;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const pixels = Array.from(imageData.data);

  const luminance = await chrome.runtime.sendMessage({
    action: 'average_luma_in_nits',
    data: pixels,
  });

  if (typeof luminance !== 'number') {
    console.error('Failed to compute luminance, response:', luminance);
  } else {
    console.log('Average luminance (nits):', luminance);
  }
})();
