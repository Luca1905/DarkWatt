import { useEffect, useState, useCallback } from "react";
import {
  getCurrentLuminanceData,
  getTotalTrackedSites,
} from "./api"
import type { stats } from "../models/stats";
import type { Nullable } from "../utils/types";

type AppState = { [K in keyof stats]: Nullable<stats[K]> };
const initialState: AppState = {
  currentLuminance: null,
  totalTrackedSites: null,
  todaySavings: null,
  weekSavings: null,
  totalSavings: null,
  potentialSavingMWh: null,
  cpuUsage: null,
  displayInfo: null,
};

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>(initialState);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [nits, sites] = await Promise.all([
          getCurrentLuminanceData(),
          getTotalTrackedSites(),
        ]);
        if (typeof nits === "number") updateState({ currentLuminance: nits });
        if (typeof sites === "number") updateState({ totalTrackedSites: sites });
      } catch (err) {
        console.error("[UI]", "popup init error:", err);
      }
    })();
  }, [updateState]);

  useEffect(() => {
    const listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0] = (
      message,
      _sender,
      sendResponse,
    ) => {
      switch (message.action) {
        case "stats_update":
          if (message.stats) updateState(message.stats as Partial<AppState>);
          sendResponse(state);
          return false;
        default:
          sendResponse(null);
          return false;
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [state, updateState]);

  // @ts-ignore
  window.darkWattStateStore = { appState: state, updateState };

  console.log("[UI]", "Popup render", state);

  return (
    <div className="min-w-[20rem] p-4 text-sm text-gray-200 bg-gray-900">
      <h1 className="mb-4 text-xl font-semibold text-center">DarkWatt</h1>

      <div className="space-y-2">
        <Stat
          label="Current luminance"
          value={formatNumber(state.currentLuminance, "nits", 2)}
        />
        <Stat
          label="Tracked sites"
          value={
            typeof state.totalTrackedSites === "number"
              ? `${state.totalTrackedSites} sites`
              : "--"
          }
        />
        <Stat
          label="Today savings"
          value={formatNumber(state.todaySavings, "mWh")}
        />
        <Stat
          label="Week savings"
          value={formatNumber(state.weekSavings, "mWh")}
        />
        <Stat
          label="Total savings"
          value={formatNumber(state.totalSavings, "mWh")}
        />
        <Stat
          label="Potential saving"
          value={formatNumber(state.potentialSavingMWh, "mWh")}
        />
        <Stat
          label="CPU usage"
          value={formatNumber(state.cpuUsage, "%")}
        />
      </div>
    </div>
  );
};

interface StatProps {
  label: string;
  value: string;
}

const Stat: React.FC<StatProps> = ({ label, value }) => (
  <div className="flex items-center justify-between rounded bg-gray-800 py-1 px-2">
    <span className="font-medium">{label}</span>
    <span className="text-right">{value}</span>
  </div>
);

function formatNumber(
  value: number | null,
  unit: string,
  fractionDigits = 1,
): string {
  if (typeof value === "number") {
    return `${value.toFixed(fractionDigits)} ${unit}`;
  }
  return `-- ${unit}`;
} 
