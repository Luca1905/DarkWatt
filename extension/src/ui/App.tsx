"use client";

import { Moon, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { ExtensionData } from "@/definitions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/components/dialog";
import PulseBall from "@/ui/components/pulse-ball";
import { Switch } from "@/ui/components/switch";
import Connector from "@/ui/connect/connector";

function TerminalStat({
  icon: Icon,
  value,
  label,
  trend,
}: {
  icon: any;
  value: string;
  label: string;
  trend?: { direction: "up" | "down"; value: string };
}) {
  return (
    <div className="bg-black border border-green-500 p-3 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-green-400">&gt;</span>
          <Icon className="h-4 w-4 text-green-400" />
          <span className="text-green-300 text-sm">{label}:</span>
        </div>
        {trend && (
          <span className="text-green-400 text-xs">
            [{trend.direction === "up" ? "↑" : "↓"}
            {trend.value}]
          </span>
        )}
      </div>
      <div className="mt-1 ml-6">
        <span className="text-green-100 font-bold text-lg">{value}</span>
      </div>
    </div>
  );
}

function TerminalSettingsDialog() {
  const [settings, setSettings] = useState({
    autoDetect: true,
    notifications: true,
    aggressiveMode: false,
    enablePulseBall: true,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-green-400 hover:text-green-300 font-mono text-sm border border-green-500 px-2 py-1 bg-black"
        >
          [CFG]
        </button>
      </DialogTrigger>
      <DialogContent className="bg-black border-2 border-green-500 text-green-100 font-mono rounded-none max-w-md">
        <DialogHeader>
          <DialogTitle className="text-green-400 font-mono">
            === DARKWATT CONFIGURATION ===
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border border-green-700 p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-300">ENABLE_PULSE_BALL</span>
              <span className="text-green-400">
                [{settings.enablePulseBall ? "ON" : "OFF"}]
              </span>
            </div>
            <div className="text-xs text-green-600 mb-2">
              &gt; Show animated pulse ball visualization
            </div>
            <Switch
              checked={settings.enablePulseBall}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, enablePulseBall: checked }))
              }
              className="data-[state=checked]:bg-green-600"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TerminalAnalyticsDialog({ data }: { data: ExtensionData }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-green-400 hover:text-green-300 font-mono text-sm border border-green-500 px-2 py-1 bg-black"
        >
          [LOG]
        </button>
      </DialogTrigger>
      <DialogContent className="bg-black border-2 border-green-500 text-green-100 font-mono rounded-none max-w-md">
        <DialogHeader>
          <DialogTitle className="text-green-400 font-mono">
            === ENERGY ANALYTICS LOG ===
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="border border-green-700 p-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-green-400 text-xs">TOTAL_SAVED:</div>
                <div className="text-green-100 font-bold">
                  {(data.savings.total / 1000).toFixed(2)}kWh
                </div>
              </div>
              <div>
                <div className="text-green-400 text-xs">TRACKED_SITES:</div>
                <div className="text-green-100 font-bold">
                  {data.totalTrackedSites.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="border border-green-700 p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-green-400">WEEK_TOTAL:</span>
              <span className="text-green-100">
                {data.savings.week.toFixed(2)} Watt hours
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">CURRENT_SITE:</span>
              <span className="text-green-100">
                {data.savings.currentSite.toFixed(2)} Watt hours
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">LUMINANCE:</span>
              <span className="text-green-100">
                {data.currentLuminance.toFixed(2)} nits
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">DISPLAY:</span>
              <span className="text-green-100">
                {data.displayInfo.dimensions.width}x
                {data.displayInfo.dimensions.height}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DarkWattTerminal() {
  const [data, setData] = useState<ExtensionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connector] = useState(() => new Connector());

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const initialData = await connector.getData();
        if (isMounted) {
          setData(initialData);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load data");
          setIsLoading(false);
        }
      }
    };

    const handleDataUpdate = (newData: ExtensionData) => {
      if (isMounted) {
        setData(newData);
        setError(null);
      }
    };

    connector.subscribeToChanges(handleDataUpdate);

    loadInitialData();

    return () => {
      isMounted = false;
      connector.disconnect();
    };
  }, [connector]);

  const LUMINANCE_THRESHOLD = 50; // nits
  const isDarkMode = data ? data.currentLuminance < LUMINANCE_THRESHOLD : false;

  if (isLoading) {
    return (
      <div className="w-[450px] h-[800px] bg-black text-green-100 font-mono overflow-hidden border-2 border-green-500 flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-400 mb-2">Loading...</div>
          <div className="text-green-600 text-sm">
            Initializing DarkWatt Core
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-[450px] h-[800px] bg-black text-green-100 font-mono overflow-hidden border-2 border-red-500 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-2">Error</div>
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="w-[450px] h-[800px] bg-black text-green-100 font-mono border-2 border-green-500 overflow-hidden">
      {/* Terminal Header */}
      <div className="bg-black border-b-2 border-green-500 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-green-400">█</span>
            <div>
              <div className="text-green-400 font-bold">DARKWATT v0.2.0</div>
              <div className="text-green-600 text-xs">
                REACTOR CORE ENERGY SYSTEM
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <TerminalAnalyticsDialog data={data} />
            <TerminalSettingsDialog />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-green-400">[STATUS]</span>
            <span className="text-green-300">
              {isDarkMode ? "ACTIVE" : "RESTING"}
            </span>
            <span className="text-green-600">
              {isDarkMode ? "CORE PULSING..." : "CORE IDLE"}
            </span>
          </div>
          <div className="text-right">
            <div className="text-green-100">
              {data.currentLuminance.toFixed(2)} nits
            </div>
            <div className="text-green-600">CURRENT LUMINANCE</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center p-4 overflow-hidden">
        <div className="flex-1 flex items-center justify-center mb-4">
          <div className="w-full">
            <div className="text-center mb-2">
              <div className="text-green-400 font-mono text-sm">
                ╔══════════════════════════════════════════╗
              </div>
              <div className="text-green-400 font-mono text-sm">
                ║ PULSATING REACTOR CORE DISPLAY ║
              </div>
              <div className="text-green-400 font-mono text-sm">
                ╚══════════════════════════════════════════╝
              </div>
            </div>

            <PulseBall
              currentLuminance={data.currentLuminance}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>

        <div className="space-y-3">
          <TerminalStat
            icon={Zap}
            value={`${data.savings.today.toFixed(2)} Watt hours`}
            label="ENERGY_SAVED"
            trend={{ direction: "up", value: "12%" }}
          />
          <TerminalStat
            icon={Moon}
            value={data.totalTrackedSites.toFixed(2)}
            label="DARK_SITES"
          />
        </div>

        <div className="mt-4 text-center text-green-600 text-xs">
          <div>{"─".repeat(42)}</div>
          <div>POWER THE CORE • SAVE THE PLANET</div>
          <div>{"─".repeat(42)}</div>
        </div>
      </div>
    </div>
  );
}
