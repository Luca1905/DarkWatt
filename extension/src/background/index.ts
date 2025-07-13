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
    try {
      const latest = await db.QUERIES.getLatestLuminanceData();
      const totalTrackedSites = await db.QUERIES.getTotalTrackedSites();
      const savingsStats = await db.QUERIES.getSavingsStats();

      const storedDisplayInfo = await db.QUERIES.getDisplayInfo();

      const displayInfo = storedDisplayInfo ?? {
        dimensions: getDisplayDimensions(),
        workArea: getDisplayWorkArea(),
      };

      return {
        currentLuminance: latest?.luminance ?? 0,
        totalTrackedSites,
        savings: {
          currentSite: 0, // This will be updated with real data from the current site
          today: savingsStats.today.savings,
          week: savingsStats.week.savings,
          total: savingsStats.total.savings,
        },
        displayInfo,
      };
    } catch (error) {
      console.error("[DARKWATT] Error collecting data:", error);
      // Return fallback data instead of throwing
      return {
        currentLuminance: 0,
        totalTrackedSites: 0,
        savings: {
          currentSite: 0,
          today: 0,
          week: 0,
          total: 0,
        },
        displayInfo: {
          dimensions: getDisplayDimensions(),
          workArea: getDisplayWorkArea(),
        },
      };
    }
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
console.log("[DARKWATT] Messenger initialized successfully");

async function sampleLoop(): Promise<void> {
  const t0 = performance.now();

  try {
    const response = await sampleTab();
    if (response) {
      const newSavings = estimateSavingsWh(
        response.dataUrl ?? "<NO_SITE>",
        getDisplayDimensions(),
        1,
        DisplayTech.LCD,
      );

      await Promise.all([
        db.MUTATIONS.saveLuminanceData(response.sample, response.url ?? ""),
        db.MUTATIONS.addToSavingsStats(newSavings),
        db.MUTATIONS.addToSavingsRecords({
          url: response.url ?? "<NO_URL>",
          newSavings,
        }),
      ]);

      const [currentSite, savingsStats, storedDisplayInfo] = await Promise.all([
        db.QUERIES.getSavingsForSite(response.url ?? "<NO_URL>"),
        db.QUERIES.getSavingsStats(),
        db.QUERIES.getDisplayInfo(),
      ]);

      Messenger.reportChanges({
        currentLuminance: response.sample,
        totalTrackedSites: await db.QUERIES.getTotalTrackedSites(),
        savings: {
          currentSite,
          today: savingsStats.today.savings,
          week: savingsStats.week.savings,
          total: savingsStats.total.savings,
        },
        displayInfo: storedDisplayInfo ?? {
          dimensions: getDisplayDimensions(),
          workArea: getDisplayWorkArea(),
        },
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
  try {
    await initWasmModule({
      module_or_path: chrome.runtime.getURL("wasm/wasm_mod_bg.wasm"),
    });
    console.log("[DARKWATT] WASM module initialized successfully");
  } catch (error) {
    console.error("[DARKWATT] Failed to initialize WASM module:", error);
    // Continue without WASM if it fails
  }
  
  try {
    await refreshDisplayInfo();
    console.log("[DARKWATT] Display info refreshed successfully");
  } catch (error) {
    console.error("[DARKWATT] Failed to refresh display info:", error);
  }
  
  try {
    hello_wasm();
    console.log("[DARKWATT] WASM hello_wasm called successfully");
  } catch (error) {
    console.error("[DARKWATT] Failed to call hello_wasm:", error);
  }
  
  console.log("[DARKWATT] Starting sample loop...");
  sampleLoop();
}

// TODO: use the messenger instead
chrome.system.display.onDisplayChanged.addListener(refreshDisplayInfo);

console.log("[DARKWATT] Background script starting...");

main().catch((err) => {
  console.error("[DARKWATT] Background main() failed:", err);
});
