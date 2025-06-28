import { average_luma_in_nits_from_data_uri } from '../wasm/wasm_mod.js';
import { captureScreenshot } from './capture.js';
import { warn } from '../utils/logger.js';

/**
 * @returns {Promise<{dataUrl:string, sample:number, url:string}|null>}
 */
export async function sampleActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return null;

    // Take screenshot
    const dataUrl = await captureScreenshot();
    if (typeof dataUrl !== 'string') return null;

    return {
      dataUrl,
      sample: average_luma_in_nits_from_data_uri(dataUrl),
      url: tab.url,
    };
  } catch (err) {
    warn('SAMPLE', `${new Date().toISOString()} skipped sample:`, err?.toString?.());
    return null;
  }
} 