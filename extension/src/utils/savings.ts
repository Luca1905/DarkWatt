import {
  type DisplayTech,
  estimate_saved_energy_wh_from_data_uri,
} from "@/wasm/wasm_mod.js";

export function estimateSavingsWh(
  dataUrl: string,
  { width, height }: { width: number; height: number },
  hours: number,
  tech: DisplayTech,
): number {
  return estimate_saved_energy_wh_from_data_uri(
    Math.round(width),
    Math.round(height),
    hours,
    tech,
    dataUrl,
  );
}

