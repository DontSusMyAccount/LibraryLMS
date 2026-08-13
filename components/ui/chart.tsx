"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  type TooltipPayload,
} from "recharts";

import { cn } from "@/lib/utils";

const DEFAULT_NUMBER_FORMATTER = new Intl.NumberFormat("th-TH");

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: TooltipPayload;
  label?: string | number;
  valueFormatter?: (value: number) => string;
}

function ChartTooltipContent({ active, payload, label, valueFormatter }: ChartTooltipContentProps) {
  if (!active || payload === undefined || payload.length === 0) {
    return null;
  }

  const entry = payload[0];
  const numericValue = Number(entry?.value);
  const displayValue = Number.isFinite(numericValue)
    ? (valueFormatter ?? DEFAULT_NUMBER_FORMATTER.format)(numericValue)
    : String(entry?.value);

  return (
    <div data-slot="chart-tooltip" className="rounded-md bg-popover px-3 py-2 text-sm shadow-pop">
      {label !== undefined && (
        <p data-slot="chart-tooltip-label" className="mb-1 text-caption text-muted-foreground">
          {label}
        </p>
      )}
      <p
        data-slot="chart-tooltip-value"
        className="flex items-center gap-2 font-medium text-foreground"
      >
        <span className="size-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
        <span className="tabular-nums">{displayValue}</span>
      </p>
    </div>
  );
}

interface ChartTooltipProps extends React.ComponentProps<typeof RechartsTooltip> {
  valueFormatter?: (value: number) => string;
}

function ChartTooltip({ valueFormatter, ...props }: ChartTooltipProps) {
  return (
    <RechartsTooltip
      cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
      content={<ChartTooltipContent valueFormatter={valueFormatter} />}
      {...props}
    />
  );
}

interface TrendChartDataPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  data: TrendChartDataPoint[];
  valueFormatter?: (value: number) => string;
  height?: number;
  className?: string;
}

function TrendChart({ data, valueFormatter, height = 280, className }: TrendChartProps) {
  const gradientId = React.useId();

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-brand-300)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--color-brand-500)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-border)"
            strokeOpacity={0.4}
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={44}
            tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
            tickFormatter={(value: number) =>
              (valueFormatter ?? DEFAULT_NUMBER_FORMATTER.format)(value)
            }
          />
          <ChartTooltip valueFormatter={valueFormatter} />
          <Area
            type="natural"
            dataKey="value"
            stroke="var(--color-brand-500)"
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export { TrendChart, ChartTooltip, ChartTooltipContent };

export type { TrendChartDataPoint, TrendChartProps, ChartTooltipContentProps };
