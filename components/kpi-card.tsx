import { TrendingDownIcon, TrendingUpIcon, MinusIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "brand" | "amber" | "coral" | "mint";

const TONE_CLASSES: Record<Tone, string> = {
  brand: "bg-brand-500/10 text-brand-600 dark:text-brand-300",
  amber: "bg-accent-amber/10 text-accent-amber",
  coral: "bg-accent-coral/10 text-accent-coral",
  mint: "bg-accent-mint/10 text-brand-700 dark:text-brand-300",
};

const toneForTone = TONE_CLASSES;

const NUMBER_FORMATTER = new Intl.NumberFormat("th-TH");

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: Tone;
  delta?: number | null;
}

function KpiCard({ icon: Icon, label, value, tone = "brand", delta = null }: KpiCardProps) {
  const isUp = delta !== null && delta > 0;
  const isDown = delta !== null && delta < 0;
  const DeltaIcon = isUp ? TrendingUpIcon : isDown ? TrendingDownIcon : MinusIcon;

  return (
    <div className="rounded-lg bg-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div
          className={cn("flex size-11 items-center justify-center rounded-full", toneForTone[tone])}
        >
          <Icon className="size-5" />
        </div>
        {delta !== null && (
          <span
            data-slot="kpi-delta"
            className={cn(
              "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs tabular-nums font-medium",
              isUp && "bg-accent-mint/15 text-brand-700 dark:text-brand-300",
              isDown && "bg-accent-coral/15 text-accent-coral",
              delta === 0 && "bg-muted text-muted-foreground",
            )}
          >
            <DeltaIcon className="size-3" />
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-display font-bold tracking-tight text-foreground tabular-nums">
          {NUMBER_FORMATTER.format(value)}
        </p>
      </div>
    </div>
  );
}

export { KpiCard };

export type { KpiCardProps, Tone };
