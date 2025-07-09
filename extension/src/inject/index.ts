import { type MessageCStoBG, MessageTypeCStoBG } from "@/definitions";
import { isDark } from "@/inject/detector";

const sendBackgroundMessage = (message: MessageCStoBG): void => {
  try {
    chrome.runtime.sendMessage<MessageCStoBG>(message);
  } catch (err) {
    console.warn("[SCRIPT] Unable to send background message:", err);
  }
};

const init = (): void => {
  const isDarkMode = isDark() ? "dark" : "light";
  sendBackgroundMessage({
    type:
      isDarkMode === "dark"
        ? MessageTypeCStoBG.DARK_THEME_DETECTED
        : MessageTypeCStoBG.DARK_THEME_NOT_DETECTED,
  });
  console.log("[THEME DETECT]: ", isDarkMode);
};

const onDomReady = (cb: () => void): void => {
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    cb();
  } else {
    window.addEventListener("DOMContentLoaded", cb, { once: true });
  }
};

onDomReady(init);
