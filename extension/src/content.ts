(() => {
	const DARK_CLASS_NAMES: readonly string[] = [
		"dark",
		"dark-mode",
		"theme-dark",
		"mode-dark",
		"night",
		"darktheme",
		"dark_background",
	];

	const SRGB_MAX = 255 as const;
	const SRGB_THRESHOLD = 0.04045 as const;
	const SRGB_DIVISOR = 12.92 as const;
	const SRGB_OFFSET = 0.055 as const;
	const SRGB_SCALE = 1.055 as const;
	const SRGB_GAMMA = 2.4 as const;

	const LUMINANCE_R_COEFF = 0.2126 as const;
	const LUMINANCE_G_COEFF = 0.7152 as const;
	const LUMINANCE_B_COEFF = 0.0722 as const;

	const DARK_LUMINANCE_THRESHOLD = 0.2 as const;

	const srgbToLinear = (channel: number): number => {
		const normalized = channel / SRGB_MAX;
		return normalized <= SRGB_THRESHOLD
			? normalized / SRGB_DIVISOR
			: ((normalized + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_GAMMA;
	};

	const relativeLuminance = (r: number, g: number, b: number): number =>
		LUMINANCE_R_COEFF * srgbToLinear(r) +
		LUMINANCE_G_COEFF * srgbToLinear(g) +
		LUMINANCE_B_COEFF * srgbToLinear(b);

	const parseRgb = (cssColor: string): [number, number, number] | null => {
		const match = cssColor.match(/rgba?\(([^)]+)\)/);
		if (!match) return null;

		const channels = match[1]
			.split(",")
			.slice(0, 3)
			.map((v) => Number.parseInt(v.trim(), 10)) as [number, number, number];

		return channels.some((x) => Number.isNaN(x)) ? null : channels;
	};

	const hasDarkClass = (el: Element | null): boolean => {
		if (!el || !("classList" in el)) return false;
		return DARK_CLASS_NAMES.some((cls) => el.classList.contains(cls));
	};

	const isDarkByBg = (element: Element | null): boolean => {
		if (!element) return false;
		const style = getComputedStyle(element);
		const bg = style.backgroundColor || style.color;
		if (!bg || bg === "transparent") return false;

		const rgb = parseRgb(bg);
		if (!rgb) return false;

		return relativeLuminance(...rgb) < DARK_LUMINANCE_THRESHOLD;
	};

	const detectPageMode = (): "dark" | "light" => {
		const body = document.body;

		if (hasDarkClass(body)) {
			console.log("[SCRIPT] Detected dark class");
			return "dark";
		}
		if (isDarkByBg(body)) {
			console.log("[SCRIPT] Detected dark background");
			return "dark";
		}

		return "light";
	};

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
		const mode = detectPageMode();
		console.log(`[SCRIPT] Detected page mode: ${mode}`);
		sendBackgroundMessage("page_mode_detected", { mode });
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
})();
