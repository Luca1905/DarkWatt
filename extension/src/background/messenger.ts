import {
  type ExtensionData,
  type MessageBGtoUI,
  type MessageCStoBG,
  MessageTypeBGtoUI,
  MessageTypeCStoBG,
  MessageTypeUItoBG,
  type MessageUItoBG,
} from "@/definitions";
import { captureScreenshot } from "@/utils/capture";
import { getDisplayDimensions } from "@/utils/display";
import { calculatePotentialSavingsMWh } from "@/utils/savings";

export interface ExtensionAdapter {
  collect: () => Promise<ExtensionData>;
  loadConfig: () => Promise<void>;
}

let adapter: ExtensionAdapter;
let changeListenerCount = 0;

export function initMessenger(a: ExtensionAdapter): void {
  adapter = a;
  changeListenerCount = 0;

  chrome.runtime.onMessage.addListener(messageListener);
}

function isUIMessage(msg: { type: string }): msg is MessageUItoBG {
  return (Object.values(MessageTypeUItoBG) as string[]).includes(msg.type);
}

function isCSMessage(msg: { type: string }): msg is MessageCStoBG {
  return (Object.values(MessageTypeCStoBG) as string[]).includes(msg.type);
}

function messageListener(
  message: MessageUItoBG | MessageCStoBG,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: { data?: ExtensionData; error?: string }) => void,
): boolean | undefined {
  if (isUIMessage(message)) {
    return onUIMessage(message, sendResponse);
  }

  if (isCSMessage(message)) {
    onCSMessage(message);
    sendResponse({});
    return false;
  }

  sendResponse({ error: "unsupportedSender" });
  return false;
}

function onCSMessage(message: MessageCStoBG): void {
  switch (message.type) {
    case MessageTypeCStoBG.DARK_THEME_NOT_DETECTED: {
      captureScreenshot()
        .then((dataUrl) => {
          const savingMWh = calculatePotentialSavingsMWh(
            dataUrl,
            getDisplayDimensions(),
          );
          reportChanges({ potentialSavingMWh: savingMWh });
        })
        .catch((err) => {
          console.error("[DARKWATT] error calculating savings:", err);
        });
      break;
    }
    default:
      break;
  }
}

function onUIMessage(
  { type, data: _ }: MessageUItoBG,
  sendResponse: (response: { data?: ExtensionData; error?: string }) => void,
): boolean {
  switch (type) {
    case MessageTypeUItoBG.GET_DATA:
      adapter
        .collect()
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err?.toString?.() }));
      return true;

    case MessageTypeUItoBG.SUBSCRIBE_TO_CHANGES:
      changeListenerCount = Math.max(changeListenerCount + 1, 0);
      return false;

    case MessageTypeUItoBG.UNSUBSCRIBE_TO_CHANGES:
      changeListenerCount = Math.max(changeListenerCount - 1, 0);
      return false;

    case MessageTypeUItoBG.LOAD_CONFIG:
      adapter.loadConfig();
      return false;

    default:
      break;
  }

  return false;
}

export function reportChanges(data: Partial<ExtensionData>): void {
  if (changeListenerCount > 0) {
    chrome.runtime.sendMessage<MessageBGtoUI>({
      type: MessageTypeBGtoUI.CHANGES,
      data,
    });
  }
}
