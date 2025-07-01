import { broadcastStats } from "./stats";

let dimensions: { width: number; height: number } = {
	width: 0,
	height: 0,
};

const CSS_DPI = 96;

function displayLengthFromInfo(
	displayInfo: chrome.system.display.DisplayUnitInfo,
): typeof dimensions {
	if (!displayInfo) return { width: 0, height: 0 };

	const { width: pixelW, height: pixelH } = displayInfo.workArea;
	const dsf = displayInfo.displayZoomFactor || 1;

	const widthInches = pixelW / dsf / CSS_DPI;
	const heightInches = pixelH / dsf / CSS_DPI;

	return { width: widthInches, height: heightInches };
}

export async function refreshDisplayInfo() {
	try {
		const displays = await chrome.system.display.getInfo();
		const primaryDisplay = displays.find((d) => d.isPrimary) || displays[0];
		if (!primaryDisplay) {
			console.error("[DISPLAY]", "no display connected");
			return;
		}
		console.log("[DISPLAY]", "primaryDisplay:", primaryDisplay);
		dimensions = displayLengthFromInfo(primaryDisplay);
		console.log("[DISPLAY]", "primaryDisplay:", primaryDisplay);
		broadcastStats({ displayInfo: dimensions });
	} catch (err) {
		console.error("[DISPLAY]", "Failed to fetch:", err);
	}
}

export function getDisplayDimensions() {
	return { ...dimensions };
}

// TODO: move to higher layer
chrome.system.display.onDisplayChanged.addListener(refreshDisplayInfo);
