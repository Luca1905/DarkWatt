import { getCurrentTab, warn } from "../utils/logger";
import { average_luma_in_nits_from_data_uri } from "../wasm/wasm_mod";
import { captureScreenshot } from "./capture";

export type sample = {
  dataUrl: string,
  sample: number,
  url: string,
}

export async function sampleActiveTab() {
  try {
    const tab = await getCurrentTab();
    if (!tab) return null;

    // Take screenshot
    const dataUrl = await captureScreenshot();
    if (typeof dataUrl !== "string") return null;

    return {
      dataUrl,
      sample: average_luma_in_nits_from_data_uri(dataUrl),
      url: tab.url,
    };
  } catch (err) {
    warn(
      "SAMPLE",
      `${new Date().toISOString()} skipped sample:`,
      err?.toString?.(),
    );
    return null;
  }
}
