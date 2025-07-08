/**
 * The following code contains a workaround for extensions designed to prevent page from knowing when it is hidden
 * GitHub issue: https://github.com/darkreader/darkreader/issues/10004
 * GitHub PR: https://github.com/darkreader/darkreader/pull/10047
 */

import { type MessageCStoBG, MessageTypeCStoBG } from "@/definitions";
import {
  runColorSchemeChangeDetector,
  stopColorSchemeChangeDetector,
} from "@/utils/media-query";

let listener: (() => void) | null = null;

let documentIsVisible_ = !document.hidden;
function documentIsVisible(): boolean {
  return documentIsVisible_;
}

function watchForDocumentVisibility(): void {
  document.addEventListener("visibilitychange", listener!, {
    capture: true,
    passive: true,
  });
  window.addEventListener("pageshow", listener!, {
    capture: true,
    passive: true,
  });
  window.addEventListener("focus", listener!, { capture: true, passive: true });
}

function stopWatchingForDocumentVisibility(): void {
  document.removeEventListener("visibilitychange", listener!, {
    capture: true,
  });
  window.removeEventListener("pageshow", listener!, {
    capture: true,
  });
  window.removeEventListener("focus", listener!, {
    capture: true,
  });
}

function setListener(callback: () => void): void {
  const alreadyWatching = Boolean(listener);
  listener = () => {
    if (!document.hidden) {
      removeListener();
      callback();
      documentIsVisible_ = true;
    }
  };
  if (!alreadyWatching) {
    watchForDocumentVisibility();
  }
}

function removeListener(): void {
  stopWatchingForDocumentVisibility();
  listener = null;
}

function sendMessage(message: MessageCStoBG): void {
  try {
    chrome.runtime.sendMessage<MessageCStoBG>(message);
  } catch (err) {
    console.error(err);
  }
}

function notifyThemeChange(isDark: boolean): void {
  sendMessage({ type: MessageTypeCStoBG.THEME_CHANGE, data: { isDark } });
}

function updateEventListeners(): void {
  if (documentIsVisible()) {
    runColorSchemeChangeDetector(notifyThemeChange);
  } else {
    stopColorSchemeChangeDetector();
  }
}

setListener(updateEventListeners);
updateEventListeners();
