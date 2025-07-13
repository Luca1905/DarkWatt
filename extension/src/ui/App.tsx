"use client";

import { Moon, Zap } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/components/dialog";
import PulseBall from "@/ui/components/pulse-ball";
import { Switch } from "@/ui/components/switch";

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
              <span className="text-green-300">AUTO_DETECT_MODE</span>
              <span className="text-green-400">
                [{settings.autoDetect ? "ON" : "OFF"}]
              </span>
            </div>
            <div className="text-xs text-green-600 mb-2">
              &gt; Automatically scan for dark mode support
            </div>
            <Switch
              checked={settings.autoDetect}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoDetect: checked }))
              }
              className="data-[state=checked]:bg-green-600"
            />
          </div>

          <div className="border border-green-700 p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-300">NOTIFICATIONS</span>
              <span className="text-green-400">
                [{settings.notifications ? "ON" : "OFF"}]
              </span>
            </div>
            <div className="text-xs text-green-600 mb-2">
              &gt; Alert when dark mode opportunities detected
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, notifications: checked }))
              }
              className="data-[state=checked]:bg-green-600"
            />
          </div>

          <div className="border border-green-700 p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-300">FORCE_DARK_MODE</span>
              <span className="text-green-400">
                [{settings.aggressiveMode ? "ON" : "OFF"}]
              </span>
            </div>
            <div className="text-xs text-green-600 mb-2">
              &gt; Override site styling with dark theme
            </div>
            <Switch
              checked={settings.aggressiveMode}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, aggressiveMode: checked }))
              }
              className="data-[state=checked]:bg-green-600"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TerminalAnalyticsDialog() {
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
                <div className="text-green-100 font-bold">2.4kWh</div>
              </div>
              <div>
                <div className="text-green-400 text-xs">SITES_OPT:</div>
                <div className="text-green-100 font-bold">156</div>
              </div>
            </div>
          </div>

          <div className="border border-green-700 p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-green-400">WEEK_TOTAL:</span>
              <span className="text-green-100">847W</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">CO2_REDUCED:</span>
              <span className="text-green-100">1.2kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">BATTERY_EXT:</span>
              <span className="text-green-100">+4.2hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">UPTIME:</span>
              <span className="text-green-100">23d 14h</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DarkWattTerminal() {
  const [_reactorHealth, _setReactorHealth] = useState(85);
  const [energySaved, _setEnergySaved] = useState(247);
  const [darkSites, _setDarkSites] = useState(12);

  return (
    <div className="w-[450px] h-[800px] bg-black text-green-100 font-mono overflow-hidden border-2 border-green-500">
      {/* Terminal Header */}
      <div className="bg-black border-b-2 border-green-500 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-green-400">█</span>
            <div>
              <div className="text-green-400 font-bold">DARKWATT v1.0.0</div>
              <div className="text-green-600 text-xs">
                REACTOR CORE ENERGY SYSTEM
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <TerminalAnalyticsDialog />
            <TerminalSettingsDialog />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-green-400">[STATUS]</span>
            <span className="text-green-300">ACTIVE</span>
            <span className="text-green-600">CORE PULSING...</span>
          </div>
          <div className="text-right">
            <div className="text-green-100">{energySaved}W SAVED</div>
            <div className="text-green-600">TODAY</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center p-4">
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

            <PulseBall />
          </div>
        </div>

        <div className="space-y-3">
          <TerminalStat
            icon={Zap}
            value={`${energySaved}W`}
            label="ENERGY_SAVED"
            trend={{ direction: "up", value: "12%" }}
          />
          <TerminalStat
            icon={Moon}
            value={darkSites.toString()}
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
