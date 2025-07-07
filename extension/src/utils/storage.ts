export interface LuminanceRecord {
  luminance: number;
  url: string;
  date: string;
}

const STORAGE_KEY = "luminanceRecords" as const;
const DISPLAY_INFO_KEY = "displayInfo" as const;

let _cache: LuminanceRecord[] | null = null;
let _displayInfoCache: {
  dimensions: { width: number; height: number };
  workArea: { width: number; height: number };
} | null = null;

function ensureArray(value: unknown): LuminanceRecord[] {
  if (Array.isArray(value)) {
    return value as LuminanceRecord[];
  }
  return [];
}

async function getAllRecords(): Promise<LuminanceRecord[]> {
  if (_cache) return _cache;
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const records = ensureArray(result[STORAGE_KEY]);
  _cache = records;
  return records;
}

async function getDisplayInfo(): Promise<{
  dimensions: { width: number; height: number };
  workArea: { width: number; height: number };
} | null> {
  if (_displayInfoCache) return _displayInfoCache;
  const result = await chrome.storage.local.get(DISPLAY_INFO_KEY);
  const info = result[DISPLAY_INFO_KEY] ?? null;
  _displayInfoCache = info;
  return info;
}

const QUERIES = {
  async getAllLuminanceData(): Promise<LuminanceRecord[]> {
    return getAllRecords();
  },

  async getLatestLuminanceData(): Promise<LuminanceRecord | null> {
    const records = await getAllRecords();
    return records.length ? records[records.length - 1] : null;
  },

  async getLuminanceAverageForDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const start = startDate.getTime();
    const end = endDate.getTime();
    const records = await getAllRecords();
    const inRange = records.filter((r) => {
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
    const records = await getAllRecords();
    const uniqueUrls = new Set(records.map((r) => r.url));
    return uniqueUrls.size;
  },

  async getDisplayInfo() {
    return getDisplayInfo();
  },
};

const MUTATIONS = {
  async saveLuminanceData(nits: number, url: string): Promise<void> {
    const record: LuminanceRecord = {
      luminance: nits,
      url,
      date: new Date().toISOString(),
    };

    const records = await getAllRecords();
    const updated = [...records, record];
    _cache = updated;
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  },

  async saveDisplayInfo(info: {
    dimensions: { width: number; height: number };
    workArea: { width: number; height: number };
  }): Promise<void> {
    _displayInfoCache = info;
    await chrome.storage.local.set({ [DISPLAY_INFO_KEY]: info });
  },
};

export default {
  QUERIES,
  MUTATIONS,
};
