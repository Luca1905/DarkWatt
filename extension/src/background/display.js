import { error, log } from "../utils/logger.js";
import { broadcastStats } from "./stats.js";

let dimensions = { width: 0, height: 0 };

const CSS_DPI = 96;

function displayLengthsFromInfo(displayInfo) {
	if (!displayInfo) return { width: 0, height: 0 };

	const { width: pixelW, height: pixelH } = displayInfo.workArea;
	const dsf = displayInfo.deviceScaleFactor || 1;

	const widthInches = pixelW / dsf / CSS_DPI;
	const heightInches = pixelH / dsf / CSS_DPI;

	return { width: widthInches, height: heightInches };
}

export async function refreshDisplayInfo() {
	try {
		const displays = await chrome.system.display.getInfo();
		const primaryDisplay = displays.find((d) => d.isPrimary) || displays[0];
		log("DISPLAY", "primaryDisplay:", primaryDisplay);
		dimensions = displayLengthsFromInfo(primaryDisplay);
		log("DISPLAY", "displayDimensions:", dimensions);
		broadcastStats({ displayInfo: dimensions });
	} catch (err) {
		error("DISPLAY", "Failed to fetch:", err);
	}
}

export function getDisplayDimensions() {
	return { ...dimensions };
}

chrome.system.display.onDisplayChanged.addListener(refreshDisplayInfo);
