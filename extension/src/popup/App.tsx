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
    <div className="w-[380px] min-h-auto max-h-[600px] overflow-y-auto m-0 p-4 font-sans bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="text-center mb-6 animate-[fadeInDown_0.6s_ease-out]">
        <div className="text-2xl font-bold text-green-400 mb-2 transition-all duration-300 ease-in-out cursor-default hover:scale-105 hover:text-green-500">
          ⚡ DarkWatt
        </div>
        <p className="text-sm text-neutral-400 m-0 transition-colors duration-300 ease-in-out">
          Dark Mode Energy Tracker
        </p>
      </div>

      {/* Power Indicator */}
      <button 
        type="button"
        className="flex items-center justify-center bg-gradient-to-br from-green-400/15 to-green-500/10 rounded-xl p-4 mb-5 border border-green-400/20 cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden hover:bg-gradient-to-br hover:from-green-400/25 hover:to-green-500/15 hover:border-green-400/40 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(74,222,128,0.2)] active:-translate-y-0.5 active:scale-[0.98] focus:outline-2 focus:outline-green-400 focus:outline-offset-2 animate-[fadeInUp_0.6s_ease-out_0.1s_both] before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:transition-all before:duration-600 before:ease-in-out hover:before:left-full w-full"
        aria-label="Power tracking status"
      >
        <svg 
          className="w-[22px] h-[22px] mr-2.5 fill-green-400 transition-all duration-300 ease-in-out drop-shadow-[0_0_4px_rgba(74,222,128,0.3)] hover:fill-green-500 hover:rotate-[15deg] hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] animate-[pulse_2s_infinite]" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <span className="text-sm text-green-400 font-medium transition-all duration-300 ease-in-out text-shadow-[0_0_4px_rgba(74,222,128,0.2)] hover:text-green-500 hover:text-shadow-[0_0_8px_rgba(74,222,128,0.4)]">
          Tracking Power Savings
        </span>
      </button>

      {/* Stats Container */}
      <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10 backdrop-blur-[10px] transition-all duration-300 ease-in-out animate-[fadeInUp_0.6s_ease-out_0.2s_both] grid grid-cols-2 gap-y-3 gap-x-4 hover:bg-white/8 hover:border-green-400/30 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)]">
        <StatItem
          label="Current Luminance"
          value={formatNumber(state.currentLuminance, "nits", 2)}
          isLoading={state.currentLuminance === null}
        />
        <StatItem
          label="Today's Savings"
          value={formatNumber(state.todaySavings, "mWh")}
          isLoading={state.todaySavings === null}
        />
        <StatItem
          label="This Week"
          value={formatNumber(state.weekSavings, "mWh")}
          isLoading={state.weekSavings === null}
        />
        <StatItem
          label="Total Saved"
          value={formatNumber(state.totalSavings, "mWh")}
          isLoading={state.totalSavings === null}
        />
        <StatItem
          label="Total tracked websites"
          value={
            typeof state.totalTrackedSites === "number"
              ? `${state.totalTrackedSites}`
              : "--"
          }
          isLoading={state.totalTrackedSites === null}
        />
        <StatItem
          label="Potential Savings (1h)"
          value={formatNumber(state.potentialSavingMWh, "mWh")}
          isLoading={state.potentialSavingMWh === null}
        />
        <StatItem
          label="CPU Usage (tab)"
          value={formatNumber(state.cpuUsage, "%")}
          isLoading={state.cpuUsage === null}
          className="col-span-1"
        />
      </div>
    </div>
  );
};

interface StatItemProps {
  label: string;
  value: string;
  isLoading?: boolean;
  className?: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, isLoading = false, className = "" }) => (
  <div className={`flex flex-col items-start gap-0.5 py-1 rounded-md transition-all duration-200 ease-in-out hover:bg-white/5 hover:px-2 ${className}`}>
    <span className="text-sm text-neutral-300 transition-colors duration-200 ease-in-out group-hover:text-white">
      {label}
    </span>
    <span 
      className={`text-lg font-semibold text-green-400 transition-all duration-200 ease-in-out relative after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-green-400 after:to-green-500 after:transition-all after:duration-300 after:ease-in-out hover:after:w-full ${
        isLoading 
          ? 'bg-gradient-to-r from-green-400 via-green-500 to-green-400 bg-[length:200%_100%] animate-[shimmer_2s_infinite] bg-clip-text text-transparent' 
          : ''
      }`}
    >
      {value}
    </span>
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
