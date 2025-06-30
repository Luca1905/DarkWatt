import type { stats } from "../models/stats.ts";
import { warn } from "../utils/logger.ts";

export async function broadcastStats(partialStats: Partial<stats>) {
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
