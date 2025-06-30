import {
	DisplayTech,
	estimate_saved_energy_mwh_from_data_uri,
} from "../wasm/wasm_mod.js";

/**
 * @param {string} dataUrl PNG data URI
 * @param {{width:number,height:number}} displayDimensions inches
 * @param {number} hours default 1
 * @param {DisplayTech} tech LCD/OLED
 * @returns {number} mWh (integer)
 */
export function calculatePotentialSavingsMWh(
	dataUrl,
	{ width, height },
	hours = 1,
	tech = DisplayTech.LCD,
) {
	const wh = estimate_saved_energy_mwh_from_data_uri(
		Math.round(width),
		Math.round(height),
		hours,
		tech,
		dataUrl,
	);
	return wh * 1000;
}
