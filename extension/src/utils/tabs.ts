export const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};

export async function queryTabs(query: chrome.tabs.QueryInfo) {
  return chrome.tabs.query(query);
}

export async function getActiveTab() {
  const tab = (
    await queryTabs({
      active: true,
      lastFocusedWindow: true,
      windowType: "normal",
    })
  )[0];

  if (!tab) {
    return null;
  }

  return tab;
}

export async function getActiveTabUrl() {
  const tab = await getActiveTab();
  return tab?.url;
}
