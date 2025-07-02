export async function getCurrentLuminanceData(): Promise<number | null> {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{ action: "get_current_luminance_data" },
			(response) => {
				if (chrome.runtime.lastError) {
					console.error(
						"[UI]",
						"Error getting current luminance data:",
						chrome.runtime.lastError,
					);
					reject(chrome.runtime.lastError);
				} else {
					resolve(response as number | null);
				}
			},
		);
	});
}

export async function getTotalTrackedSites(): Promise<number | null> {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{ action: "get_total_tracked_sites" },
			(response) => {
				if (chrome.runtime.lastError) {
					console.error(
						"[UI]",
						"Error getting total tracked sites:",
						chrome.runtime.lastError,
					);
					reject(chrome.runtime.lastError);
				} else {
					resolve(response as number | null);
				}
			},
		);
	});
}

export async function getLuminanceAverageForDateRange(
	startDate: number,
	endDate: number,
): Promise<number | null> {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{ action: "get_luminance_data_for_date_range", startDate, endDate },
			(response) => {
				if (chrome.runtime.lastError) {
					console.error(
						"[UI]",
						"Error getting luminance range:",
						chrome.runtime.lastError,
					);
					reject(chrome.runtime.lastError);
				} else {
					resolve(response as number | null);
				}
			},
		);
	});
}

export async function getAllLuminanceData(): Promise<
	Array<{ luminance: number; url: string; date: string }>
> {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{ action: "get_all_luminance_data" },
			(response) => {
				if (chrome.runtime.lastError) {
					console.error(
						"[UI]",
						"Error getting all luminance data:",
						chrome.runtime.lastError,
					);
					reject(chrome.runtime.lastError);
				} else {
					resolve(response || []);
				}
			},
		);
	});
}

export async function getLuminanceDataForDate(
	date: Date,
): Promise<number | null> {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{ action: "get_luminance_data_for_date", date: date.toISOString() },
			(response) => {
				if (chrome.runtime.lastError) {
					console.error(
						"[UI]",
						"Error getting luminance for date:",
						chrome.runtime.lastError,
					);
					reject(chrome.runtime.lastError);
				} else {
					resolve(response as number | null);
				}
			},
		);
	});
}
