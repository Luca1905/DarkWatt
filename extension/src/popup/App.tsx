import { useEffect, useState, useCallback } from "react";
import {
  getCurrentLuminanceData,
  getTotalTrackedSites,
  getAllLuminanceData,
  getLuminanceAverageForDateRange,
} from "./api";
import type { stats } from "../models/stats";
import type { Nullable } from "../utils/types";
import { Dashboard, TabPanel, MetricGrid, Section } from "./components/Dashboard";
import { StatCard } from "./components/StatCard";
import { Chart } from "./components/Chart";

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

interface ChartData {
  time: string;
  luminance: number;
  date: string;
}

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>(initialState);
  const [activeTab, setActiveTab] = useState('overview');
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
        weekAgo.getTime(),
        now.getTime()
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

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
    <div className="w-[400px] h-[600px] flex flex-col m-0 font-sans bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#2d2d2d] text-white">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#2d2d2d] border-b border-white/10 backdrop-blur-sm">
        <div className="p-4 pb-3">
          <div className="text-center mb-4 animate-[fadeInDown_0.6s_ease-out]">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="icons/icon256.png" alt="DarkWatt" className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold text-white">DarkWatt</h1>
                <p className="text-xs text-neutral-400">Energy Tracker</p>
              </div>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-2 bg-green-400/10 rounded-full px-3 py-1.5 border border-green-400/20">
                         <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Active Monitoring</span>
            </div>
          </div>

          {/* Sticky Tab Navigation */}
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-green-400/20 text-green-400 shadow-sm border border-green-400/30'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon && <span className="text-base">{tab.icon}</span>}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pt-2">
          <TabPanel value="overview" activeTab={activeTab}>
            <Section title="Real-time Metrics" icon="⚡">
              <MetricGrid columns={2} gap="md">
                <StatCard
                  title="Current Luminance"
                  value={state.currentLuminance ?? '--'}
                  unit="nits"
                  icon="💡"
                  isLoading={state.currentLuminance === null}
                  trend={currentTrend?.direction}
                  trendValue={currentTrend?.value}
                  size="lg"
                  className="col-span-2"
                />
                <StatCard
                  title="Potential Savings"
                  value={state.potentialSavingMWh ?? '--'}
                  unit="mWh"
                  icon="💚"
                  isLoading={state.potentialSavingMWh === null}
                />
                <StatCard
                  title="CPU Usage"
                  value={state.cpuUsage ?? '--'}
                  unit="%"
                  icon="🖥️"
                  isLoading={state.cpuUsage === null}
                />
              </MetricGrid>
            </Section>

            <Section title="Energy Savings" icon="🌱">
              <MetricGrid columns={3} gap="sm">
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
              </MetricGrid>
            </Section>

            <Section title="Activity" icon="📍">
              <StatCard
                title="Tracked Websites"
                value={state.totalTrackedSites ?? '--'}
                icon="🌐"
                isLoading={state.totalTrackedSites === null}
                size="md"
              />
            </Section>
          </TabPanel>

          <TabPanel value="analytics" activeTab={activeTab}>
            <Section 
              title="Luminance Trends" 
              subtitle="Last 24 hours"
              icon="📈"
            >
              <Chart data={chartData} height={180} type="area" />
            </Section>

            <Section title="Weekly Summary" icon="📅">
              <MetricGrid columns={2} gap="md">
                <StatCard
                  title="Weekly Average"
                  value={weeklyAverage ?? '--'}
                  unit="nits"
                  icon="📊"
                  isLoading={weeklyAverage === null}
                />
                <StatCard
                  title="Data Points"
                  value={chartData.length}
                  icon="🔢"
                />
              </MetricGrid>
            </Section>

            <Section title="Environmental Impact" icon="🌍">
              <div className="bg-gradient-to-r from-green-400/10 to-blue-400/10 rounded-xl p-3 border border-green-400/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🌱</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Carbon Footprint</h3>
                    <p className="text-xs text-neutral-400">Estimated CO₂ reduction</p>
                  </div>
                </div>
                <div className="text-xl font-bold text-green-400">
                  {state.totalSavings ? (state.totalSavings * 0.0005).toFixed(3) : '--'} kg CO₂
                </div>
              </div>
            </Section>
          </TabPanel>

          <TabPanel value="settings" activeTab={activeTab}>
            <Section title="Display Information" icon="🖥️">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-neutral-400">Width</span>
                    <div className="text-sm font-semibold text-white">
                      {state.displayInfo?.width?.toFixed(1) ?? '--'} inches
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-400">Height</span>
                    <div className="text-sm font-semibold text-white">
                      {state.displayInfo?.height?.toFixed(1) ?? '--'} inches
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="About" icon="ℹ️">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  DarkWatt monitors your screen's luminance and calculates potential energy savings 
                  from using dark mode. The extension tracks your browsing patterns and provides 
                  insights into your environmental impact.
                </p>
              </div>
            </Section>
          </TabPanel>
        </div>
      </div>
    </div>
  );
}; 
