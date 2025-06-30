(() => {
	const DARK_CLASS_NAMES = [
		"dark",
		"dark-mode",
		"theme-dark",
		"mode-dark",
		"night",
		"darktheme",
		"dark_background",
	];

	const SRGB_MAX = 255;
	const SRGB_THRESHOLD = 0.04045;
	const SRGB_DIVISOR = 12.92;
	const SRGB_OFFSET = 0.055;
	const SRGB_SCALE = 1.055;
	const SRGB_GAMMA = 2.4;

	const LUMINANCE_R_COEFF = 0.2126;
	const LUMINANCE_G_COEFF = 0.7152;
	const LUMINANCE_B_COEFF = 0.0722;

	const DARK_LUMINANCE_THRESHOLD = 0.2;

	const srgbToLinear = (c) => {
		c /= SRGB_MAX;
		return c <= SRGB_THRESHOLD
			? c / SRGB_DIVISOR
			: Math.pow((c + SRGB_OFFSET) / SRGB_SCALE, SRGB_GAMMA);
	};

	const relativeLuminance = (r, g, b) =>
		LUMINANCE_R_COEFF * srgbToLinear(r) +
		LUMINANCE_G_COEFF * srgbToLinear(g) +
		LUMINANCE_B_COEFF * srgbToLinear(b);

	const parseRgb = (cssColor) => {
		const match = cssColor.match(/rgba?\(([^)]+)\)/);
		if (!match) return null;
		const channels = match[1]
			.split(",")
			.slice(0, 3)
			.map((v) => Number.parseInt(v.trim(), 10));
		return channels.some((x) => Number.isNaN(x)) ? null : channels;
	};

	function hasDarkClass(el) {
		if (!el || !el.classList) return false;
		return DARK_CLASS_NAMES.some((cls) => el.classList.contains(cls));
	}

	function isDarkByBg(element) {
		if (!element) return false;
		const style = getComputedStyle(element);
		const bg = style.backgroundColor || style.color;
		if (!bg || bg === "transparent") return false;

		const rgb = parseRgb(bg);
		if (!rgb) return false;

		return relativeLuminance(...rgb) < DARK_LUMINANCE_THRESHOLD;
	}

	function detectPageMode() {
		const body = document.body;

		if (hasDarkClass(body)) {
			console.log("[SCRIPT] Detected dark class");
			return "dark";
		}
		if (isDarkByBg(body)) {
			console.log(`[SCRIPT] Detected dark background`);
			return "dark";
		}

		return "light";
	}

	function sendBackgroundMessage(action, payload = {}) {
		try {
			chrome.runtime.sendMessage({ action, ...payload });
		} catch (err) {
			console.warn("[SCRIPT] Unable to send background message:", err);
		}
	}
	function init() {
		const mode = detectPageMode();
		console.log(`[SCRIPT] Detected page mode: ${mode}`);
		sendBackgroundMessage("page_mode_detected", { mode });
	}

	const onDomReady = (cb) => {
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

	window.DarkWatt_checkTheme = init;
})();
