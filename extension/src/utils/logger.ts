export const log = (tag: string, ...args: unknown[]) =>
	console.log(`[${tag}]`, ...args);
export const warn = (tag: string, ...args: unknown[]) =>
	console.warn(`[${tag}]`, ...args);
export const error = (tag: string, ...args: unknown[]) =>
	console.error(`[${tag}]`, ...args);

export const getCurrentTab = async () => {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	return tab;
};
