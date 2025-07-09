import { useCallback, useEffect, useRef, useState } from "react";
import type { ExtensionData } from "@/definitions";
import {
  ChartAreaInteractive,
  type ChartData,
} from "@/ui/components/chart-area-interactive";
import { StatCard } from "@/ui/components/StatCard";
import Connector from "@/ui/connect/connector";
import type { LuminanceRecord } from "@/utils/storage";
import storage from "@/utils/storage";
import type { Nullable } from "@/utils/types";

type AppState = { [K in keyof ExtensionData]: Nullable<ExtensionData[K]> };

const initialState: AppState = {
  currentLuminance: null,
  totalTrackedSites: null,
  savings: { today: null, week: null, total: null },
  potentialSavingMWh: null,
  displayInfo: {
    dimensions: { width: null, height: null },
    workArea: { width: null, height: null },
  },
};

export const App: React.FC = () => {
  const isMounted = useRef(false);
  const [state, setState] = useState<AppState>(initialState);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [weeklyAverage, setWeeklyAverage] = useState<number | null>(null);

  const safeSetState = useCallback((updates: Partial<AppState>) => {
    if (isMounted.current) setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const loadChartData = useCallback(async () => {
    const data = await storage.QUERIES.getAllLuminanceData();
    const filtered = data.filter(
      (r: LuminanceRecord) =>
        Date.now() - new Date(r.date).getTime() <= 86_400_000,
    );
    const points = 20;
    const sample =
      filtered.length <= points
        ? filtered
        : Array.from(
            { length: points },
            (_, i) => filtered[Math.floor((i * filtered.length) / points)],
          );
    const mapped = sample.map((r: LuminanceRecord) => ({
      time: new Date(r.date).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      luminance: r.luminance,
      date: r.date,
    }));
    if (isMounted.current) setChartData(mapped);
  }, []);

  const loadWeeklyAverage = useCallback(async () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 604_800_000);
    const avg = await storage.QUERIES.getLuminanceAverageForDateRange(
      weekAgo,
      now,
    );
    if (isMounted.current) setWeeklyAverage(avg);
  }, []);

  const hydrate = useCallback(
    async (incoming?: Partial<AppState>) => {
      if (incoming) safeSetState(incoming);
      await Promise.all([loadChartData(), loadWeeklyAverage()]);
      const info = await storage.QUERIES.getDisplayInfo();
      if (info) safeSetState({ displayInfo: info } as Partial<AppState>);
    },
    [loadChartData, loadWeeklyAverage, safeSetState],
  );

  useEffect(() => {
    isMounted.current = true;
    console.log('load')
    const connector = new Connector();

    // @ts-ignore
    window.connector = { connector };

    connector.getData().then(hydrate);
    connector.subscribeToChanges(hydrate);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        console.log("unload");
        connector.disconnect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      isMounted.current = false;
      connector.disconnect();
    };
  }, [hydrate]);

  // @ts-ignore
  window.darkWattStateStore = { appState: state };

  const getTrend = (current: number | null, average: number | null) => {
    if (!current || !average) return undefined;
    const diff = current - average;
    const pct = Math.abs((diff / average) * 100).toFixed(1);
    return {
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
      value: `${pct}%`,
    } as const;
  };

  const currentTrend = getTrend(state.currentLuminance, weeklyAverage);

  return (
    <div className="w-[420px] h-[640px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white flex flex-col">
      <div className="relative bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-sm border-b border-slate-700/50 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="assets/images/darkwatt-icon-256.png"
                  alt="DarkWatt"
                  className="w-10 h-10 rounded-lg"
                />
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

        <div className="px-6 pb-4">
          <div className="flex bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
              { id: "analytics", label: "Analytics", icon: "📈" },
              { id: "settings", label: "Settings", icon: "⚙️" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === t.id
                    ? "bg-green-400/20 text-green-400 shadow-lg shadow-green-400/10 border border-green-400/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <span className="text-base">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6">
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  Live Monitoring
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  <StatCard
                    title="Current Screen Luminance"
                    value={state.currentLuminance ?? "--"}
                    unit="nits"
                    icon="💡"
                    isLoading={state.currentLuminance === null}
                    trend={currentTrend?.direction}
                    trendValue={currentTrend?.value}
                    size="lg"
                    floatingPointRepresentation
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard
                      title="Potential Savings"
                      value={state.potentialSavingMWh ?? "--"}
                      unit="mWh"
                      icon="💚"
                      isLoading={state.potentialSavingMWh === null}
                      size="md"
                      floatingPointRepresentation
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">🌱</span>
                  Energy Savings
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard
                    title="Today"
                    value={state.savings.today ?? "--"}
                    unit="mWh"
                    isLoading={state.savings.today === null}
                    size="sm"
                    floatingPointRepresentation
                  />
                  <StatCard
                    title="This Week"
                    value={state.savings.week ?? "--"}
                    unit="mWh"
                    isLoading={state.savings.week === null}
                    size="sm"
                    floatingPointRepresentation
                  />
                  <StatCard
                    title="Total"
                    value={state.savings.total ?? "--"}
                    unit="mWh"
                    isLoading={state.savings.total === null}
                    size="sm"
                    floatingPointRepresentation
                  />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">📍</span>
                  Activity Overview
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    title="Tracked Websites"
                    value={state.totalTrackedSites ?? "--"}
                    icon="🌐"
                    isLoading={state.totalTrackedSites === null}
                    size="md"
                    floatingPointRepresentation={false}
                  />
                  <StatCard
                    title="Weekly Average"
                    value={weeklyAverage ?? "--"}
                    unit="nits"
                    icon="📊"
                    isLoading={weeklyAverage === null}
                    size="md"
                    floatingPointRepresentation
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">📈</span>
                  Luminance Trends
                </h2>
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                  <ChartAreaInteractive chartData={chartData} timeRange="30s" />
                </div>
              </div>

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
                    floatingPointRepresentation={false}
                  />
                  <StatCard
                    title="Avg. Luminance"
                    value={weeklyAverage ?? "--"}
                    unit="nits"
                    icon="📊"
                    isLoading={weeklyAverage === null}
                    size="md"
                    floatingPointRepresentation
                  />
                </div>
              </div>

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
                      <h3 className="text-base font-semibold text-white">
                        Carbon Footprint
                      </h3>
                      <p className="text-sm text-slate-400">
                        Estimated CO₂ reduction
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {state.savings.total
                      ? (state.savings.total * 0.0005).toFixed(3)
                      : "--"}{" "}
                    kg CO₂
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Based on average energy grid carbon intensity
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">🖥️</span>
                  Display Information
                </h2>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {state.displayInfo?.dimensions?.width &&
                        state.displayInfo?.dimensions?.height
                          ? Math.sqrt(
                              state.displayInfo.dimensions.width ** 2 +
                                state.displayInfo.dimensions.height ** 2,
                            ).toFixed(1)
                          : "--"}
                      </div>
                      <div className="text-sm text-slate-400">
                        Diagonal (inches)
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {state.displayInfo?.dimensions?.width &&
                        state.displayInfo?.dimensions?.height
                          ? (() => {
                              const gcd = (a: number, b: number): number =>
                                b === 0 ? a : gcd(b, a % b);
                              const w = Math.round(
                                state.displayInfo.dimensions.width * 10,
                              );
                              const h = Math.round(
                                state.displayInfo.dimensions.height * 10,
                              );
                              const d = gcd(w, h);
                              return `${w / d}:${h / d}`;
                            })()
                          : "--"}
                      </div>
                      <div className="text-sm text-slate-400">Aspect Ratio</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">⚙️</span>
                  System Status
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-white">
                        Monitoring Active
                      </span>
                    </div>
                    <span className="text-xs text-green-400">Running</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      <span className="text-sm font-medium text-white">
                        Data Collection
                      </span>
                    </div>
                    <span className="text-xs text-blue-400">Enabled</span>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">ℹ️</span>
                  About DarkWatt
                </h2>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    DarkWatt monitors your screen's luminance and calculates
                    potential energy savings from using dark mode themes and
                    reducing screen brightness.
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
