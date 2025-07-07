let dimensions: { width: number; height: number } = {
  width: 0,
  height: 0,
};

let workArea: { width: number; height: number } = {
  width: 0,
  height: 0,
};

const CSS_DPI = 96;

function displayLengthFromInfo(
  displayInfo: chrome.system.display.DisplayUnitInfo,
): typeof dimensions {
  if (!displayInfo) return { width: 0, height: 0 };

  const { width: pixelW, height: pixelH } = displayInfo.workArea;
  const dsf = displayInfo.displayZoomFactor || 1;

  const widthInches = pixelW / dsf / CSS_DPI;
  const heightInches = pixelH / dsf / CSS_DPI;

  return { width: widthInches, height: heightInches };
}

export async function refreshDisplayInfo() {
  try {
    const displays = await chrome.system.display.getInfo();
    const primaryDisplay = displays.find((d) => d.isPrimary) || displays[0];
    if (!primaryDisplay) {
      console.error("[DISPLAY]", "no display connected");
      return;
    }
    dimensions = displayLengthFromInfo(primaryDisplay);
    workArea = primaryDisplay.workArea;
    console.log("[DISPLAY]", "primaryDisplay:", primaryDisplay);
  } catch (err) {
    console.error("[DISPLAY]", "Failed to fetch:", err);
  }
}

export function getDisplayDimensions() {
  return { ...dimensions };
}

export function getDisplayWorkArea() {
  return { ...workArea };
}
