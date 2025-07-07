import {
  DisplayTech,
  estimate_saved_energy_mwh_from_data_uri,
} from "@/wasm/wasm_mod.js";

export function calculatePotentialSavingsMWh(
  dataUrl: string,
  { width, height }: { width: number; height: number },
  hours = 1,
  tech: DisplayTech = DisplayTech.LCD,
): number {
  const wh = estimate_saved_energy_mwh_from_data_uri(
    Math.round(width),
    Math.round(height),
    hours,
    tech,
    dataUrl,
  );
  return wh * 1000;
}
