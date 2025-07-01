import type { stats } from "../models/stats.ts";

export async function broadcastStats(partialStats: Partial<stats>) {
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
