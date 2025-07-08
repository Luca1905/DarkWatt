export async function captureScreenshot(): Promise<string> {
	return new Promise((resolve, reject) => {
		try {
			chrome.tabs.captureVisibleTab({ format: "png" }, (dataUrl) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else {
					resolve(dataUrl);
				}
			});
		} catch (err) {
			reject(err);
		}
	});
}
