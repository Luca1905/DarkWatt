import { getSRGBLightness, parse as parseColor } from "@/utils/color";

function hasDefinedDarkTheme() {
	const rootStyle = getComputedStyle(document.documentElement);
	if (rootStyle.filter.includes("invert(1)")) {
		return true;
	}

	const CELL_SIZE = 256;
	const MAX_ROW_COUNT = 4;
	const winWidth = innerWidth;
	const winHeight = innerHeight;
	const stepX = Math.floor(
		winWidth / Math.min(MAX_ROW_COUNT, Math.ceil(winWidth / CELL_SIZE)),
	);
	const stepY = Math.floor(
		winHeight / Math.min(MAX_ROW_COUNT, Math.ceil(winHeight / CELL_SIZE)),
	);

	const processedElements = new Set<Element>();

	for (let y = Math.floor(stepY / 2); y < winHeight; y += stepY) {
		for (let x = Math.floor(stepX / 2); x < winWidth; x += stepX) {
			const element = document.elementFromPoint(x, y);
			if (!element || processedElements.has(element)) {
				continue;
			}
			processedElements.add(element);
			const style =
				element === document.documentElement
					? rootStyle
					: getComputedStyle(element);
			const bgColor = parseColor(style.backgroundColor);
			if (!bgColor) {
				return false;
			}
			if (bgColor.a === 1) {
				const bgLightness = getSRGBLightness(bgColor.r, bgColor.g, bgColor.b);
				if (bgLightness > 0.5) {
					return false;
				}
			} else {
				const textColor = parseColor(style.color);
				if (!textColor) {
					return false;
				}
				const textLightness = getSRGBLightness(
					textColor.r,
					textColor.g,
					textColor.b,
				);
				if (textLightness < 0.5) {
					return false;
				}
			}
		}
	}

	const rootColor = parseColor(rootStyle.backgroundColor);
	if (!rootColor) {
		return false;
	}

	const bodyColor = document.body
		? parseColor(getComputedStyle(document.body).backgroundColor)
		: { r: 0, g: 0, b: 0, a: 0 };
	if (!bodyColor) {
		return false;
	}
	const rootLightness =
		1 -
		rootColor.a! +
		rootColor.a! * getSRGBLightness(rootColor.r, rootColor.g, rootColor.b);
	const finalLightness =
		(1 - bodyColor.a!) * rootLightness +
		bodyColor.a! * getSRGBLightness(bodyColor.r, bodyColor.g, bodyColor.b);
	return finalLightness < 0.5;
}

export function isDark() {
	const darkSheets = Array.from(document.styleSheets).filter((s) =>
		(s.ownerNode as HTMLElement)?.classList.contains("darkreader"),
	);
	darkSheets.forEach((sheet) => (sheet.disabled = true));

	const detectedThemeDark = hasDefinedDarkTheme();

	darkSheets.forEach((sheet) => (sheet.disabled = false));

	return detectedThemeDark;
}
