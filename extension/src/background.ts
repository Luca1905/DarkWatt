import {
	getDisplayDimensions,
	refreshDisplayInfo,
} from "./background_modules/display";
import { sampleActiveTab as sampleTab } from "./background_modules/sampling";
import { calculatePotentialSavingsMWh } from "./background_modules/savings";
import { broadcastStats as sendStats } from "./background_modules/stats";
import db, { type LuminanceRecord } from "./storage/storage";
import initWasmModule, {
	average_luma_in_nits,
	average_luma_relative,
	hello_wasm,
} from "./wasm/wasm_mod.js";

const SAMPLE_INTERVAL = 1000;

async function captureScreenshot(): Promise<string> {
	return new Promise((resolve, reject) => {
		chrome.tabs.captureVisibleTab({ format: "png" }, (dataUrl) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(dataUrl as string);
			}
		});
	});
}

async function sampleLoop(): Promise<void> {
	const t0 = performance.now();

	try {
		const response = await sampleTab();
		if (response) {
			await db.MUTATIONS.saveLuminanceData(response.sample, response.url ?? "");

			const savingMWh = calculatePotentialSavingsMWh(
				response.dataUrl,
				getDisplayDimensions(),
			);

			await sendStats({
				currentLuminance: response.sample,
				potentialSavingMWh: savingMWh,
				totalTrackedSites: await db.QUERIES.getTotalTrackedSites(),
			});
		}
	} catch (err) {
		console.error(
			"[SAMPLE]",
			`${new Date().toISOString()} Sample loop error:`,
			err,
		);
	}

	const elapsed = performance.now() - t0;
	setTimeout(sampleLoop, Math.max(0, SAMPLE_INTERVAL - elapsed));
}

async function main() {
	await initWasmModule();
	await refreshDisplayInfo();
	hello_wasm();
	sampleLoop();
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
	switch (request.action) {
		case "average_luma": {
			try {
				const data = new Uint8Array(request.data);
				const result = average_luma_relative(data);
				sendResponse(result);
			} catch (err) {
				console.error("[LUMA]", "Error computing luma:", err);
				sendResponse(null);
			}
			return false;
		}
		case "average_luma_in_nits": {
			try {
				const data = new Uint8Array(request.data);
				const result = average_luma_in_nits(data);
				sendResponse(result);
			} catch (err) {
				console.error("[LUMA]", "Error computing luma:", err);
				sendResponse(null);
			}
			return false;
		}

		case "get_current_luminance_data": {
			db.QUERIES.getLatestLuminanceData()
				.then((data: LuminanceRecord | null) => sendResponse(data))
				.catch((err: unknown) => {
					console.error("[DB]", "Error fetching luminance data:", err);
					sendResponse(null);
				});
			return true;
		}

		case "get_all_luminance_data": {
			db.QUERIES.getAllLuminanceData()
				.then((data: unknown) => sendResponse(data))
				.catch((err: unknown) => {
					console.error("[DB]", "Error fetching luminance data:", err);
					sendResponse(null);
				});
			return true;
		}

		case "get_luminance_data_for_date": {
			db.QUERIES.getLuminanceDataForDate(request.date)
				.then((data: unknown) => sendResponse(data))
				.catch((err: unknown) => {
					console.error("[DB]", "Error fetching luminance data:", err);
					sendResponse(null);
				});
			return true;
		}

		case "get_luminance_data_for_date_range": {
			db.QUERIES.getLuminanceAverageForDateRange(
				request.startDate,
				request.endDate,
			)
				.then((data: unknown) => sendResponse(data))
				.catch((err: unknown) => {
					console.error("[DB]", "Error fetching luminance data:", err);
					sendResponse(null);
				});
			return true;
		}

		case "get_total_tracked_sites": {
			db.QUERIES.getTotalTrackedSites()
				.then((data: unknown) => sendResponse(data))
				.catch((err: unknown) => {
					console.error("[DB]", "Error fetching luminance data:", err);
					sendResponse(null);
				});
			return true;
		}

		case "page_mode_detected": {
			const currentPageMode = request.mode || "unknown";

			if (currentPageMode === "light") {
				captureScreenshot()
					.then((dataUrl) => {
						const savingMWh = calculatePotentialSavingsMWh(
							dataUrl,
							getDisplayDimensions(),
						);
						return sendStats({ potentialSavingMWh: savingMWh });
					})
					.catch((err) => {
						console.error("[DARKWATT]", "error calculating savings:", err);
					})
					.finally(() => sendResponse({ status: "ok" }));
				return true;
			}
			sendResponse({ status: "ok" });
			return false;
		}

		default:
			sendResponse(null);
			return false;
	}
});

// @ts-ignore – processes API is not yet in the typings
// biome-ignore lint/suspicious/noExplicitAny: processes API typings missing
chrome.processes.onUpdated.addListener(async (processes: any) => {
	try {
		const [currentTab] = await chrome.tabs.query({
			active: true,
			lastFocusedWindow: true,
		});
		if (!currentTab) return;

		// @ts-ignore – processes API typings missing
		const activeProcessId = await chrome.processes.getProcessIdForTab(
			currentTab.id,
		);
		const activeProcess = processes[activeProcessId];

		if (activeProcess && typeof activeProcess.cpu === "number") {
			await sendStats({ cpuUsage: activeProcess.cpu });
		}
	} catch (err) {
		console.warn("[STATS]", "Error sending stats update:", err);
	}
});

main().catch((err) => {
	console.error("[DARKWATT]", "Background main() failed:", err);
});
