import Messenger, { type ExtensionAdapter } from "@/background/messenger";
import {
  getDisplayDimensions,
  getDisplayWorkArea,
  refreshDisplayInfo,
} from "@/utils/display";
import { sampleActiveTab as sampleTab } from "@/utils/sampling";
import { estimateSavingsWh } from "@/utils/savings";
import db from "@/utils/storage";
import initWasmModule, { DisplayTech, hello_wasm } from "@/wasm/wasm_mod.js";

const SAMPLE_INTERVAL = 1000;

const messengerAdapter: ExtensionAdapter = {
  async collect() {
    const latest = await db.QUERIES.getLatestLuminanceData();
    const totalTrackedSites = await db.QUERIES.getTotalTrackedSites();

    const storedDisplayInfo = await db.QUERIES.getDisplayInfo();

    const displayInfo = storedDisplayInfo ?? {
      dimensions: getDisplayDimensions(),
      workArea: getDisplayWorkArea(),
    };

    return {
      currentLuminance: latest?.luminance ?? 0,
      totalTrackedSites,
      // TODO: compute these accurately once the implementation exists
      savings: { currentSite: 0, today: 0, week: 0, total: 0 },
      potentialSavingMWh: 0,
      displayInfo,
    };
  },

  async loadConfig() {
    // TODO
    return Promise.resolve();
  },

  async handleThemeDetected({ isDark }) {
    if (!isDark) return;
  },
};

Messenger.init(messengerAdapter);

async function sampleLoop(): Promise<void> {
  const t0 = performance.now();

  try {
    const response = await sampleTab();
    if (response) {
      const savings_wh = estimateSavingsWh(
        response.dataUrl ?? "<NO_SITE>",
        getDisplayDimensions(),
        1,
        DisplayTech.LCD,
      );
      await db.MUTATIONS.saveLuminanceData(response.sample, response.url ?? "");
      const savings = await db.MUTATIONS.updateSavings({
        url: response.url ?? "<NO_SITE>",
        toSaveSavings: savings_wh,
      });

      Messenger.reportChanges({
        currentLuminance: response.sample,
        totalTrackedSites: await db.QUERIES.getTotalTrackedSites(),
        savings,
      });
    }
  } catch (err) {
    console.error(
      "[SAMPLE]",
      `${new Date().toISOString()} Sample loop error:`,
      err,
    );
  }

  const elapsed = performance.now() - t0;
  setTimeout(sampleLoop, Math.max(0, SAMPLE_INTERVAL - elapsed));
}

async function main() {
  await initWasmModule({
    module_or_path: chrome.runtime.getURL("wasm/wasm_mod_bg.wasm"),
  });
  await refreshDisplayInfo();
  hello_wasm();
  sampleLoop();
}

// TODO: use the messenger instead
chrome.system.display.onDisplayChanged.addListener(refreshDisplayInfo);

main().catch((err) => {
  console.error("[DARKWATT]", "Background main() failed:", err);
});
