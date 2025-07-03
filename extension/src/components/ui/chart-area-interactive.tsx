"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const description = "An interactive area chart"

const chartConfig = {
  luminance: {
    label: "Luminance (nits)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export interface ChartData {
  date: string,
  luminance: number,
};

export function ChartAreaInteractive({ chartData }: { chartData: ChartData[] }) {
  const now = Date.now()

  const sorted = [...chartData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  const recent = sorted.filter(
    (d) => now - new Date(d.date).getTime() <= 30_000,
  )

  const displayData = (recent.length ? recent : sorted).slice(-30)

  const latestTs = displayData.length
    ? new Date(displayData[displayData.length - 1].date).getTime()
    : now

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Screen Luminance</CardTitle>
          <CardDescription>Last 30&nbsp;seconds • 1 s resolution</CardDescription>
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
                <stop offset="5%" stopColor="var(--color-luminance)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-luminance)" stopOpacity={0.1} />
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
                const deltaSec = Math.round((new Date(value).getTime() - latestTs) / 1000)
                return deltaSec === 0 ? "now" : `${Math.abs(deltaSec)}s`
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    const dateObj = new Date(value)
                    return dateObj.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
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
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
