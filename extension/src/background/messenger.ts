import {
  type ExtensionData,
  type MessageBGtoUI,
  type MessageCStoBG,
  MessageTypeBGtoUI,
  MessageTypeUItoBG,
  type MessageUItoBG,
} from "@/definitions";

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

function messageListener(
  message: MessageUItoBG | MessageCStoBG,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (
    response: { data?: ExtensionData; error?: string } | "unsupportedSender",
  ) => void,
) {
  onUIMessage(message as MessageUItoBG, sendResponse);
  return [MessageTypeUItoBG.GET_DATA].includes(
    message.type as MessageTypeUItoBG,
  );
}

function onUIMessage(
  { type, data: _ }: MessageUItoBG,
  sendResponse: (response: { data?: ExtensionData; error?: string }) => void,
) {
  switch (type) {
    case MessageTypeUItoBG.GET_DATA:
      adapter.collect().then((data) => sendResponse({ data }));
      break;

    case MessageTypeUItoBG.SUBSCRIBE_TO_CHANGES:
      changeListenerCount++;
      break;

    case MessageTypeUItoBG.UNSUBSCRIBE_TO_CHANGES:
      changeListenerCount--;
      break;

    case MessageTypeUItoBG.LOAD_CONFIG:
      adapter.loadConfig();
      break;

    default:
      break;
  }
}

export function reportChanges(data: Partial<ExtensionData>): void {
  if (changeListenerCount > 0) {
    chrome.runtime.sendMessage<MessageBGtoUI>({
      type: MessageTypeBGtoUI.CHANGES,
      data,
    });
  }
}
