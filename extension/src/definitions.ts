export interface ExtensionActions {
  getData(): Promise<ExtensionData>;
}

interface Savings {
  today: number;
  week: number;
  total: number;
}

export interface ExtensionData {
  currentLuminance: number;
  totalTrackedSites: number;
  savings: Savings;
  potentialSavingMWh: number;
  displayInfo: {
    dimensions: {
      width: number;
      height: number;
    };
    workArea: {
      width: number;
      height: number;
    };
  };
}

export enum MessageTypeCStoBG {
  DARK_THEME_DETECTED = "cs-bg-dark-theme-detected",
  DARK_THEME_NOT_DETECTED = "cs-bg-dark-theme-not-detected",
  THEME_CHANGE = "cs-bg-theme-change",
}
export interface MessageCStoBG {
  id?: string;
  scriptId?: string;
  type: MessageTypeCStoBG;
  data?: any;
}

export enum MessageTypeUItoBG {
  GET_DATA = "ui-bg-get-data",
  LOAD_CONFIG = "ui-bg-load-config",
  SUBSCRIBE_TO_CHANGES = "ui-bg-subscribe-to-changes",
  UNSUBSCRIBE_TO_CHANGES = "ui-bg-unsubscribe-to-changes",
}
export interface MessageUItoBG {
  type: MessageTypeUItoBG;
  data?: any;
  error?: Error;
}

export enum MessageTypeBGtoUI {
  CHANGES = "bg-ui-changes",
}
export interface MessageBGtoUI {
  type: MessageTypeBGtoUI;
  data?: any;
  error?: Error;
}
