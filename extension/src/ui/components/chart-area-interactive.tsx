"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/ui/components/chart";

export const description = "An interactive area chart";

const chartConfig = {
  luminance: {
    label: "Luminance (nits)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export interface ChartData {
  date: string;
  luminance: number;
}

const timeRangeToMs = {
  "30s": 30 * 1000,
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

export function ChartAreaInteractive({
  chartData,
  timeRange,
}: {
  chartData: ChartData[];
  timeRange:
    | "30s"
    | "1m"
    | "5m"
    | "15m"
    | "30m"
    | "1h"
    | "2h"
    | "4h"
    | "8h"
    | "12h"
    | "24h";
}) {
  const latestRecordTs = chartData.length
    ? new Date(chartData[chartData.length - 1].date).getTime()
    : Date.now();

  const sorted = [...chartData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const recent = sorted.filter(
    (d) =>
      latestRecordTs - new Date(d.date).getTime() <= timeRangeToMs[timeRange],
  );

  const displayData = (recent.length ? recent : sorted).slice(-30);

  const latestTs = displayData.length
    ? new Date(displayData[displayData.length - 1].date).getTime()
    : latestRecordTs;

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Screen Luminance</CardTitle>
          <CardDescription>Last {timeRange} • 1 s resolution</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={displayData}>
            <defs>
              <linearGradient id="fillLuma" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-luminance)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-luminance)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const deltaSec = Math.round(
                  (latestTs - new Date(value).getTime()) / 1000,
                );
                return deltaSec === 0 ? "now" : `${deltaSec}s ago`;
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    const ts = new Date(value).getTime();
                    const deltaSec = Math.round((latestTs - ts) / 1000);
                    return deltaSec === 0 ? "now" : `${deltaSec}s ago`;
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="luminance"
              type="monotone"
              fill="url(#fillLuma)"
              stroke="var(--color-luminance)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
