import {
  type ExtensionAdapter,
  initMessenger,
  reportChanges,
} from "@/background/messenger";
import {
  getDisplayDimensions,
  getDisplayWorkArea,
  refreshDisplayInfo,
} from "@/utils/display";
import { sampleActiveTab as sampleTab } from "@/utils/sampling";
import { calculatePotentialSavingsMWh } from "@/utils/savings";
import db from "@/utils/storage";
import initWasmModule, { hello_wasm } from "@/wasm/wasm_mod.js";

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
      savings: { today: 0, week: 0, total: 0 },
      potentialSavingMWh: 0,
      cpuUsage: 0,
      displayInfo,
    };
  },

  async loadConfig() {
    // TODO
    return Promise.resolve();
  },
};

initMessenger(messengerAdapter);

async function sampleLoop(): Promise<void> {
  const t0 = performance.now();

  try {
    const response = await sampleTab();
    if (response) {
      await db.MUTATIONS.saveLuminanceData(response.sample, response.url ?? "");

      const savingMWh = calculatePotentialSavingsMWh(
        response.dataUrl,
        getDisplayDimensions(),
      );

      reportChanges({
        potentialSavingMWh: savingMWh,
        totalTrackedSites: await db.QUERIES.getTotalTrackedSites(),
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
// @ts-ignore – processes API is not yet in the typings
chrome.processes.onUpdated.addListener(async (processes: any) => {
  try {
    const [currentTab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!currentTab) return;

    // @ts-ignore – processes API typings missing
    const activeProcessId = await chrome.processes.getProcessIdForTab(
      currentTab.id,
    );
    const activeProcess = processes[activeProcessId];

    if (activeProcess && typeof activeProcess.cpu === "number") {
      reportChanges(await messengerAdapter.collect());
    }
  } catch (err) {
    console.warn("[STATS]", "Error sending stats update:", err);
  }
});

// TODO: use the messenger instead
chrome.system.display.onDisplayChanged.addListener(refreshDisplayInfo);

main().catch((err) => {
  console.error("[DARKWATT]", "Background main() failed:", err);
});
