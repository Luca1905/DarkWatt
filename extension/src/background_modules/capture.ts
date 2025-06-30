import { warn } from "../utils/logger.ts";

export async function captureScreenshot(): Promise<string> {
	return new Promise((resolve, reject) => {
		chrome.tabs.captureVisibleTab({ format: "png" }, (dataUrl) => {
			if (chrome.runtime.lastError) {
				warn("CAPTURE", "captureVisibleTab failed:", chrome.runtime.lastError);
				reject(chrome.runtime.lastError);
			} else {
				resolve(dataUrl);
			}
		});
	});
}
