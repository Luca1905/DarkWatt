export interface ExtensionActions {
  getData(): void;
}

export interface ExtensionData {
  currentLuminance: number;
  totalTrackedSites: number;
  todaySavings: number;
  weekSavings: number;
  totalSavings: number;
  potentialSavingMWh: number;
  cpuUsage: number;
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
  SUBSCRIBE_TO_CHANGES = "bg-ui-subscribe-to-changes",
  UNSUBSCRIBE_TO_CHANGES = "bg-ui-unsubscribe-to-changes",
}
export interface MessageUItoBG {
  type: MessageTypeUItoBG;
  data?: any;
  error?: any;
}

export enum MessageTypeBGtoUI {
  CHANGES = "bg-ui-changes",
}
export interface MessageBGtoUI {
  type: MessageTypeBGtoUI;
  data?: any;
  error?: any;
}
