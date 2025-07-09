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
import {
  documentIsVisible,
  setDocumentVisibilityListener,
} from "@/utils/visibility";

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

setDocumentVisibilityListener(updateEventListeners);
updateEventListeners();
