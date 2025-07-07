import type { ExtensionData } from "../definitions";

export async function broadcastStats(partialStats: Partial<ExtensionData>) {
  try {
    await chrome.runtime.sendMessage({
      action: "stats_update",
      stats: partialStats,
    });
  } catch (err) {
    console.warn(
      "[STATS]",
      `${new Date().toISOString()} skipped stats update:`,
      {
        message: err,
      },
    );
  }
}
