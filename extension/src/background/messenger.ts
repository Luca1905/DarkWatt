import {
  type ExtensionData,
  type MessageBGtoUI,
  type MessageCStoBG,
  MessageTypeBGtoUI,
  MessageTypeCStoBG,
  MessageTypeUItoBG,
  type MessageUItoBG,
} from "@/definitions";

export interface ExtensionAdapter {
  collect(): Promise<ExtensionData>;
  loadConfig(): Promise<void>;
  handleThemeDetected(): void;
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

function onCSMessage({ type }: MessageCStoBG): void {
  switch (type) {
    case MessageTypeCStoBG.DARK_THEME_NOT_DETECTED: {
      adapter.handleThemeDetected();
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
      sendResponse({});
      return false;

    case MessageTypeUItoBG.UNSUBSCRIBE_TO_CHANGES:
      changeListenerCount = Math.max(changeListenerCount - 1, 0);
      sendResponse({});
      return false;

    case MessageTypeUItoBG.LOAD_CONFIG:
      adapter.loadConfig();
      sendResponse({});
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
