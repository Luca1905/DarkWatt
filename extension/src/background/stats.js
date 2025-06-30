import { warn } from "../utils/logger.js";

/**
 * @param {Record<string, any>} partialStats
 */
export async function broadcastStats(partialStats = {}) {
	try {
		await chrome.runtime.sendMessage({
			action: "stats_update",
			stats: partialStats,
		});
	} catch (err) {
		warn("STATS", `${new Date().toISOString()} skipped stats update:`, {
			message: err,
		});
	}
}
