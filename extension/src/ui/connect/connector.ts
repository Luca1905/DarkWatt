import type { MessageUItoBG } from "@/definitions";
import {
  type ExtensionActions,
  type ExtensionData,
  type MessageBGtoUI,
  MessageTypeBGtoUI,
  MessageTypeUItoBG,
} from "@/definitions";

export default class Connector implements ExtensionActions {
  private changeSubscribers: Set<(data: ExtensionData) => void>;

  constructor() {
    this.changeSubscribers = new Set();
  }

  private async sendRequest<T>(
    type: MessageTypeUItoBG,
    data?: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      chrome.runtime.sendMessage<MessageUItoBG>(
        { type, data },
        (response: { data?: T; error?: string } | null) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response == null) {
            reject(new Error("No response from background script"));
            return;
          }

          const { data: responseData, error } = response;
          if (error) {
            reject(error);
          } else {
            resolve(responseData as T);
          }
        },
      );
    });
  }

  async getData(): Promise<ExtensionData> {
    return await this.sendRequest<ExtensionData>(MessageTypeUItoBG.GET_DATA);
  }

  private onChangesReceived = ({ type, data }: MessageBGtoUI) => {
    if (type === MessageTypeBGtoUI.CHANGES) {
      for (const callback of this.changeSubscribers) {
        callback(data);
      }
    }
  };

  subscribeToChanges(callback: (data: ExtensionData) => void): void {
    this.changeSubscribers.add(callback);
    if (this.changeSubscribers.size === 1) {
      chrome.runtime.onMessage.addListener(this.onChangesReceived);
      chrome.runtime.sendMessage<MessageUItoBG>(
        {
          type: MessageTypeUItoBG.SUBSCRIBE_TO_CHANGES,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[Connector] Error subscribing to changes:",
              chrome.runtime.lastError.message,
            );
          }
        },
      );
    }
  }

  disconnect(): void {
    if (this.changeSubscribers.size > 0) {
      this.changeSubscribers.clear();
      chrome.runtime.onMessage.removeListener(this.onChangesReceived);
      chrome.runtime.sendMessage<MessageUItoBG>(
        {
          type: MessageTypeUItoBG.UNSUBSCRIBE_TO_CHANGES,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[Connector] Error unsubscribing from changes:",
              chrome.runtime.lastError.message,
            );
          }
        },
      );
    }
  }
}
