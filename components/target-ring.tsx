import { TargetIcon } from "lucide-react";

import type { MonthlyTarget } from "@/app/features/dashboard/dashboard.types";

const RADIUS = 52;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface TargetRingProps {
  target: MonthlyTarget;
  className?: string;
}

function clampPercent(achieved: number, target: number): number {
  if (target <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((achieved / target) * 100));
}

export function TargetRing({ target, className }: TargetRingProps) {
  const percent = clampPercent(target.achieved, target.target);
  const dashOffset = CIRCUMFERENCE * (1 - percent / 100);

  return (
    <section
      data-slot="target-ring"
      className={`flex flex-col rounded-lg bg-card p-5 shadow-card ${className ?? ""}`}
    >
      <header className="mb-4">
        <h2 className="text-title font-semibold text-foreground">เป้าหมายรายเดือน</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">รายการยืมที่ครบเป้าหมาย</p>
      </header>

      <div className="relative mx-auto size-[132px]">
        <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
          <circle
            cx="66"
            cy="66"
            r={RADIUS}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          <circle
            cx="66"
            cy="66"
            r={RADIUS}
            fill="none"
            stroke="var(--color-brand-500)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 66 66)"
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-display font-bold tabular-nums text-foreground">{percent}%</span>
          <span className="text-caption tabular-nums text-muted-foreground">
            {target.achieved.toLocaleString("th-TH")}/{target.target.toLocaleString("th-TH")}
          </span>
        </div>
      </div>

      {target.target === 0 && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <TargetIcon className="size-4" />
          ยังไม่ได้กำหนดเป้าหมาย
        </p>
      )}
    </section>
  );
}
