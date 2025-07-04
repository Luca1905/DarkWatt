import { useEffect, useState, useCallback } from "react";
import {
  getCurrentLuminanceData,
  getTotalTrackedSites,
  getAllLuminanceData,
  getLuminanceAverageForDateRange,
} from "./api";
import type { stats } from "../models/stats";
import type { Nullable } from "../utils/types";
import { StatCard } from "./components/StatCard";
import { ChartAreaInteractive, type ChartData } from "@/components/ui/chart-area-interactive";

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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [weeklyAverage, setWeeklyAverage] = useState<number | null>(null);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const loadChartData = useCallback(async () => {
    try {
      const data = await getAllLuminanceData();
      const filteredData = data.filter(record => {
        const recordTime = new Date(record.date).getTime();
        const now = Date.now();
        return now - recordTime <= 24 * 60 * 60 * 1000;
      });

      const desiredPoints = 20;
      let sampledData = [];
      if (filteredData.length <= desiredPoints) {
        sampledData = filteredData;
      } else {
        const step = filteredData.length / desiredPoints;
        for (let i = 0; i < desiredPoints; i++) {
          sampledData.push(filteredData[Math.floor(i * step)]);
        }
      }

      const chartPoints = sampledData.map(record => ({
        time: new Date(record.date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        luminance: record.luminance,
        date: record.date
      }));

      setChartData(chartPoints);
    } catch (err) {
      console.error("[UI]", "Error loading chart data:", err);
    }
  }, []);

  const loadWeeklyAverage = useCallback(async () => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const average = await getLuminanceAverageForDateRange(
        weekAgo,
        now,
      );
      setWeeklyAverage(average);
    } catch (err) {
      console.error("[UI]", "Error loading weekly average:", err);
    }
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

        // Load additional data
        await Promise.all([loadChartData(), loadWeeklyAverage()]);
      } catch (err) {
        console.error("[UI]", "popup init error:", err);
      }
    })();
  }, [updateState, loadChartData, loadWeeklyAverage]);

  useEffect(() => {
    const listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0] = (
      message,
      _sender,
      sendResponse,
    ) => {
      switch (message.action) {
        case "stats_update":
          if (message.stats) {
            updateState(message.stats as Partial<AppState>);
            // Refresh chart data when stats update
            loadChartData();
          }
          sendResponse(state);
          return false;
        default:
          sendResponse(null);
          return false;
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [state, updateState, loadChartData]);

  // @ts-ignore
  window.darkWattStateStore = { appState: state, updateState };

  const getTrend = (current: number | null, average: number | null) => {
    if (!current || !average) return undefined;
    const diff = current - average;
    const percentChange = ((diff / average) * 100).toFixed(1);
    return {
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
      value: `${Math.abs(Number(percentChange))}%`
    } as const;
  };

  const currentTrend = getTrend(state.currentLuminance, weeklyAverage);

  return (
    <div className="w-[420px] h-[640px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white flex flex-col">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-sm border-b border-slate-700/50 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src="icons/icon48.png" alt="DarkWatt" className="w-10 h-10 rounded-lg" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">DarkWatt</h1>
                <p className="text-xs text-slate-400">Energy Monitor</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-400/10 rounded-full px-3 py-1.5 border border-green-400/20">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Live</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6 pb-4">
          <div className="flex bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'analytics', label: 'Analytics', icon: '📈' },
              { id: 'settings', label: 'Settings', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-green-400/20 text-green-400 shadow-lg shadow-green-400/10 border border-green-400/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
              {/* Primary Metrics */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  Live Monitoring
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  <StatCard
                    title="Current Screen Luminance"
                    value={state.currentLuminance ?? '--'}
                    unit="nits"
                    icon="💡"
                    isLoading={state.currentLuminance === null}
                    trend={currentTrend?.direction}
                    trendValue={currentTrend?.value}
                    size="lg"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard
                      title="Potential Savings"
                      value={state.potentialSavingMWh ?? '--'}
                      unit="mWh"
                      icon="💚"
                      isLoading={state.potentialSavingMWh === null}
                      size="md"
                    />
                    <StatCard
                      title="CPU Usage"
                      value={state.cpuUsage ?? '--'}
                      unit="%"
                      icon="🖥️"
                      isLoading={state.cpuUsage === null}
                      size="md"
                    />
                  </div>
                </div>
              </div>

              {/* Energy Savings */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">🌱</span>
                  Energy Savings
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard
                    title="Today"
                    value={state.todaySavings ?? '--'}
                    unit="mWh"
                    isLoading={state.todaySavings === null}
                    size="sm"
                  />
                  <StatCard
                    title="This Week"
                    value={state.weekSavings ?? '--'}
                    unit="mWh"
                    isLoading={state.weekSavings === null}
                    size="sm"
                  />
                  <StatCard
                    title="Total"
                    value={state.totalSavings ?? '--'}
                    unit="mWh"
                    isLoading={state.totalSavings === null}
                    size="sm"
                  />
                </div>
              </div>

              {/* Activity Overview */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">📍</span>
                  Activity Overview
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    title="Tracked Websites"
                    value={state.totalTrackedSites ?? '--'}
                    icon="🌐"
                    isLoading={state.totalTrackedSites === null}
                    size="md"
                  />
                  <StatCard
                    title="Weekly Average"
                    value={weeklyAverage ?? '--'}
                    unit="nits"
                    icon="📊"
                    isLoading={weeklyAverage === null}
                    size="md"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
              {/* Chart Section */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">📈</span>
                  Luminance Trends
                </h2>
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                  <ChartAreaInteractive chartData={chartData} />
                </div>
              </div>

              {/* Analytics Summary */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  Summary Statistics
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    title="Data Points"
                    value={chartData.length}
                    icon="🔢"
                    size="md"
                  />
                  <StatCard
                    title="Avg. Luminance"
                    value={weeklyAverage ?? '--'}
                    unit="nits"
                    icon="📊"
                    isLoading={weeklyAverage === null}
                    size="md"
                  />
                </div>
              </div>

              {/* Environmental Impact */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">🌍</span>
                  Environmental Impact
                </h2>
                <div className="bg-gradient-to-r from-green-400/10 to-emerald-400/10 rounded-xl p-4 border border-green-400/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-green-400/20 rounded-full flex items-center justify-center">
                      <span className="text-xl">🌱</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Carbon Footprint</h3>
                      <p className="text-sm text-slate-400">Estimated CO₂ reduction</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {state.totalSavings ? (state.totalSavings * 0.0005).toFixed(3) : '--'} kg CO₂
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Based on average energy grid carbon intensity
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
              {/* Display Information */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">🖥️</span>
                  Display Information
                </h2>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {state.displayInfo?.width?.toFixed(1) ?? '--'}
                      </div>
                      <div className="text-sm text-slate-400">Width (inches)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {state.displayInfo?.height?.toFixed(1) ?? '--'}
                      </div>
                      <div className="text-sm text-slate-400">Height (inches)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">⚙️</span>
                  System Status
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-white">Monitoring Active</span>
                    </div>
                    <span className="text-xs text-green-400">Running</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      <span className="text-sm font-medium text-white">Data Collection</span>
                    </div>
                    <span className="text-xs text-blue-400">Enabled</span>
                  </div>
                </div>
              </div>

              {/* About */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">ℹ️</span>
                  About DarkWatt
                </h2>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    DarkWatt monitors your screen's luminance and calculates potential energy savings
                    from using dark mode themes and reducing screen brightness.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Version 1.0.0</span>
                    <span>•</span>
                    <span>Built with ❤️ for sustainability</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 
