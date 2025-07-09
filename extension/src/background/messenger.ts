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

export default class Messenger {
  private static adapter: ExtensionAdapter;
  private static changeListenerCount: number;

  static init(a: ExtensionAdapter): void {
    Messenger.adapter = a;
    Messenger.changeListenerCount = 0;

    chrome.runtime.onMessage.addListener(Messenger.messageListener);
  }

  static messageListener(
    message: MessageUItoBG | MessageCStoBG,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: { data?: ExtensionData; error?: string }) => void,
  ): boolean | undefined {
    if (Messenger.isUIMessage(message)) {
      Messenger.onUIMessage(message, sendResponse);
    }

    if (Messenger.isCSMessage(message)) {
      Messenger.onCSMessage(message);
    }

    return [MessageTypeUItoBG.GET_DATA].includes(
      message.type as MessageTypeUItoBG,
    );
  }

  static isUIMessage(msg: { type: string }): msg is MessageUItoBG {
    return (Object.values(MessageTypeUItoBG) as string[]).includes(msg.type);
  }

  static isCSMessage(msg: { type: string }): msg is MessageCStoBG {
    return (Object.values(MessageTypeCStoBG) as string[]).includes(msg.type);
  }

  static onCSMessage({ type }: MessageCStoBG): void {
    switch (type) {
      case MessageTypeCStoBG.DARK_THEME_NOT_DETECTED: {
        Messenger.adapter.handleThemeDetected();
        break;
      }
      default:
        break;
    }
  }

  static onUIMessage(
    { type, data: _ }: MessageUItoBG,
    sendResponse: (response: { data?: ExtensionData; error?: string }) => void,
  ) {
    switch (type) {
      case MessageTypeUItoBG.GET_DATA:
        Messenger.adapter
          .collect()
          .then((data) => sendResponse({ data }))
          .catch((err) => sendResponse({ error: err?.toString?.() }));
        break;

      case MessageTypeUItoBG.SUBSCRIBE_TO_CHANGES:
        Messenger.changeListenerCount++;
        sendResponse({});
        break;

      case MessageTypeUItoBG.UNSUBSCRIBE_TO_CHANGES:
        Messenger.changeListenerCount--;
        sendResponse({});
        break;

      case MessageTypeUItoBG.LOAD_CONFIG:
        Messenger.adapter.loadConfig();
        sendResponse({});
        break;

      default:
        break;
    }
  }

  static reportChanges(data: Partial<ExtensionData>): void {
    console.log("[REP] ", data);
    if (Messenger.changeListenerCount > 0) {
      chrome.runtime.sendMessage<MessageBGtoUI>({
        type: MessageTypeBGtoUI.CHANGES,
        data,
      });
    }
  }
}
