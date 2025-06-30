import { warn } from "../utils/logger.js";

/** @returns {Promise<string>} */
export async function captureScreenshot() {
	return new Promise((resolve, reject) => {
		chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
			if (chrome.runtime.lastError) {
				warn("CAPTURE", "captureVisibleTab failed:", chrome.runtime.lastError);
				reject(chrome.runtime.lastError);
			} else {
				resolve(dataUrl);
			}
		});
	});
}
