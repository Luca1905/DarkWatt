import { isDark } from "@/utils/theme-detector";

const sendBackgroundMessage = (
	action: string,
	payload: Record<string, unknown> = {},
): void => {
	try {
		chrome.runtime.sendMessage({ action, ...payload });
	} catch (err) {
		console.warn("[SCRIPT] Unable to send background message:", err);
	}
};

const init = (): void => {
	const isDarkMode = isDark() ? "dark": "light";
	console.log(`[SCRIPT] Detected page mode: ${isDarkMode}`);
	sendBackgroundMessage("page_mode_detected", { isDarkMode });
};

const onDomReady = (cb: () => void): void => {
	if (
		document.readyState === "complete" ||
		document.readyState === "interactive"
	) {
		cb();
	} else {
		window.addEventListener("DOMContentLoaded", cb, { once: true });
	}
};

onDomReady(init);
