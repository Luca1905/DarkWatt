export type PageTheme = "dark" | "light";

const DARK_CLASS_NAMES: readonly string[] = [
	"dark",
	"dark-mode",
	"theme-dark",
	"mode-dark",
	"night",
	"darktheme",
	"dark_background",
];

const THEME_ATTR_NAMES: readonly string[] = [
	"data-theme",
	"theme",
	"data-color-mode",
	"color-scheme",
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

// Parses `rgb()`, `rgba()` or hex colours (3/6/8-digit) into channels.
export const parseRgb = (cssColor: string): [number, number, number] | null => {
	if (!cssColor) return null;

	// rgb/rgba
	const rgbMatch = cssColor.match(/rgba?\(([^)]+)\)/);
	if (rgbMatch) {
		const channels = rgbMatch[1]
			.split(",")
			.slice(0, 3)
			.map((v) => Number.parseInt(v.trim(), 10)) as [number, number, number];
		return channels.some((x) => Number.isNaN(x)) ? null : channels;
	}

	// Hex – #rgb, #rrggbb, #rrggbbaa
	const hexMatch = cssColor.match(/^#([0-9a-fA-F]{3,8})$/);
	if (hexMatch) {
		let hex = hexMatch[1];
		if (hex.length === 3) {
			hex = hex
				.split("")
				.map((c) => c + c)
				.join("");
		}
		if (hex.length === 6 || hex.length === 8) {
			const r = Number.parseInt(hex.slice(0, 2), 16);
			const g = Number.parseInt(hex.slice(2, 4), 16);
			const b = Number.parseInt(hex.slice(4, 6), 16);
			return [r, g, b];
		}
	}

	return null;
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

const hasDarkClass = (el: Element | null): boolean => {
	if (!el || !("classList" in el)) return false;
	return DARK_CLASS_NAMES.some((cls) => el.classList.contains(cls));
};

const hasDarkAttribute = (el: Element | null): boolean => {
	if (!el) return false;
	return THEME_ATTR_NAMES.some((attr) => {
		const val = el.getAttribute?.(attr);
		return typeof val === "string" && val.toLowerCase().includes("dark");
	});
};

const tokensIncludeDarkOnly = (tokens: string[]): boolean => {
	const normalized = tokens.map((t) => t.trim().toLowerCase()).filter(Boolean);
	return normalized.includes("dark") && !normalized.includes("light");
};

const hasDarkColorSchemeCSS = (el: Element | null): boolean => {
	if (!el) return false;
	const scheme = getComputedStyle(el).getPropertyValue("color-scheme");
	if (!scheme) return false;
	return tokensIncludeDarkOnly(scheme.split(/[\s,]/));
};

const hasDarkMetaColorScheme = (): boolean => {
	const meta = document.querySelector<HTMLMetaElement>(
		'meta[name="color-scheme"]',
	);
	const content = meta?.getAttribute("content") ?? "";
	if (!content) return false;
	return tokensIncludeDarkOnly(content.split(/[\s,]/));
};

export const detectPageTheme = (): PageTheme => {
	const htmlEl = document.documentElement;
	const bodyEl = document.body;

	// 1. Explicit author hints (fast & cheap)
	if (hasDarkMetaColorScheme()) return "dark";
	if (hasDarkColorSchemeCSS(htmlEl) || hasDarkColorSchemeCSS(bodyEl))
		return "dark";
	if (hasDarkClass(htmlEl) || hasDarkClass(bodyEl)) return "dark";
	if (hasDarkAttribute(htmlEl) || hasDarkAttribute(bodyEl)) return "dark";

	// 2. Fallback – analyse background luminance
	if (isDarkByBg(bodyEl) || isDarkByBg(htmlEl)) return "dark";

	return "light";
};

export const __internal = {
	hasDarkClass,
	hasDarkAttribute,
	isDarkByBg,
	hasDarkColorSchemeCSS,
	hasDarkMetaColorScheme,
	relativeLuminance,
	srgbToLinear,
};
