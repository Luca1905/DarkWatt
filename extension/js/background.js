import initWasmModule, {
  hello_wasm,
  average_luma_in_nits,
} from './wasm/wasm_mod.js';

(async () => {
  await initWasmModule();
  hello_wasm();
})();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture_screenshot') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Error capturing screenshot:', chrome.runtime.lastError);
        sendResponse(null);
      } else {
        sendResponse(dataUrl);
      }
    });
    return true;
  }

  if (request.action === 'average_luma_in_nits') {
    const data = new Uint8Array(request.data);
    const result = average_luma_in_nits(data);
    sendResponse(result);
    return false;
  }

  sendResponse(null);
  return false;
});