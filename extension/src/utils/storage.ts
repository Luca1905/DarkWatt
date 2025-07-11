import type {
  DisplayInfo,
  LuminanceRecord,
  SavingsRecord,
  SavingsStats,
  SavingsSummary,
} from "@/definitions";
import { inXDaysISO, tomorrowISO } from "./time";

export interface StorageKey<T> {
  name: string;
  defaultValue: T;
}

export class StorageService {
  private cache = new Map<string, any>();

  async get<T>(key: StorageKey<T>): Promise<T> {
    if (this.cache.has(key.name)) {
      return this.cache.get(key.name);
    }
    try {
      const result = await chrome.storage.local.get(key.name);
      const value = result[key.name] ?? key.defaultValue;
      this.cache.set(key.name, value);
      return value;
    } catch (err) {
      console.error(`Error reading "${key.name}"`, err);
      return key.defaultValue;
    }
  }

  async set<T>(key: StorageKey<T>, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key.name]: value });
      this.cache.set(key.name, value);
    } catch (err) {
      console.error(`Error writing "${key.name}"`, err);
    }
  }

  clearCache(keyName?: string) {
    if (keyName) {
      this.cache.delete(keyName);
    } else {
      this.cache.clear();
    }
  }
}

const storage = new StorageService();

const LUMINANCE_KEY: StorageKey<LuminanceRecord[]> = {
  name: "luminanceRecords",
  defaultValue: [],
};
const DISPLAY_INFO_KEY: StorageKey<DisplayInfo | null> = {
  name: "displayInfo",
  defaultValue: null,
};
const SAVINGS_RECORDS_KEY: StorageKey<SavingsRecord> = {
  name: "savingsRecords",
  defaultValue: {},
};
const SAVINGS_STATS_KEY: StorageKey<SavingsStats> = {
  name: "savingsToday",
  defaultValue: {
    today: {
      savings: 0,
      reset: tomorrowISO(),
    },
    week: {
      savings: 0,
      reset: inXDaysISO(7),
    },
    total: {
      savings: 0,
      since: new Date().toISOString(),
    },
  },
};

export const QUERIES = {
  async getAllLuminanceData(): Promise<LuminanceRecord[]> {
    return storage.get(LUMINANCE_KEY);
  },

  async getLatestLuminanceData(): Promise<LuminanceRecord | null> {
    const all = await storage.get(LUMINANCE_KEY);
    return all.length ? all[all.length - 1] : null;
  },

  async getLuminanceAverageForDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const start = startDate.getTime();
    const end = endDate.getTime();
    const all = await storage.get(LUMINANCE_KEY);
    const inRange = all.filter((r) => {
      const t = new Date(r.date).getTime();
      return t >= start && t <= end;
    });
    if (!inRange.length) return 0;
    const sum = inRange.reduce((acc, cur) => acc + cur.luminance, 0);
    return sum / inRange.length;
  },

  async getLuminanceDataForDate(date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return this.getLuminanceAverageForDateRange(startOfDay, endOfDay);
  },

  async getTotalTrackedSites(): Promise<number> {
    const all = await storage.get(LUMINANCE_KEY);
    return new Set(all.map((r) => r.url)).size;
  },

  async getDisplayInfo(): Promise<DisplayInfo | null> {
    return storage.get(DISPLAY_INFO_KEY);
  },

  async getSavingsForSite(url: string): Promise<number> {
    const records = await storage.get(SAVINGS_RECORDS_KEY);
    return records[url] ?? 0;
  },

  async getSavingsStats(): Promise<SavingsStats> {
    const stats = await storage.get(SAVINGS_STATS_KEY);
    return stats;
  },
};

export const MUTATIONS = {
  async saveLuminanceData(nits: number, url: string): Promise<void> {
    const newRecord: LuminanceRecord = {
      luminance: nits,
      url,
      date: new Date().toISOString(),
    };
    const all = await storage.get(LUMINANCE_KEY);
    const updated = [...all, newRecord];
    await storage.set(LUMINANCE_KEY, updated);
  },

  async saveDisplayInfo(info: DisplayInfo): Promise<void> {
    await storage.set(DISPLAY_INFO_KEY, info);
  },

  async refreshSavingsStats() {
    const now = new Date();
    const stats = await storage.get(SAVINGS_STATS_KEY);

    if (now > new Date(stats.today.reset)) {
      stats.today = {
        savings: 0,
        reset: tomorrowISO(),
      };
    }

    if (now > new Date(stats.week.reset)) {
      stats.week = {
        savings: 0,
        reset: inXDaysISO(7),
      };
    }

    await storage.set(SAVINGS_STATS_KEY, stats);
  },

  async addToSavingsStats(newSavings: number) {
    this.refreshSavingsStats();
    const stats = await storage.get(SAVINGS_STATS_KEY);
    stats.today.savings += newSavings;
    stats.week.savings += newSavings;
    stats.total.savings += newSavings;

    await storage.set(SAVINGS_STATS_KEY, stats);
  },

  async addToSavingsRecords(data: {
    url: string;
    newSavings: number;
  }): Promise<SavingsSummary> {
    const stats = await storage.get(SAVINGS_STATS_KEY);
    const records = await storage.get(SAVINGS_RECORDS_KEY);
    const prev = records[data.url] ?? 0;
    const updatedForSite = prev + data.newSavings;
    const newRecords: SavingsRecord = {
      ...records,
      [data.url]: updatedForSite,
    };
    await storage.set(SAVINGS_RECORDS_KEY, newRecords);

    // compute total across all sites
    const total = Object.values(newRecords).reduce((sum, v) => sum + v, 0);
    console.log(newRecords);

    return {
      currentSite: updatedForSite,
      today: stats.today.savings,
      week: stats.week.savings,
      total,
    };
  },
};

export default {
  QUERIES,
  MUTATIONS,
};
