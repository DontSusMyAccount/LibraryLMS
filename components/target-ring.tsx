import { TargetIcon } from "lucide-react";

import type { MonthlyTarget } from "@/app/features/dashboard/dashboard.types";

interface TargetRingProps {
  target: MonthlyTarget;
  className?: string;
}

/** ขนาด ring (พอร์ตจาก SVG เดิม: เส้นหนา 10px บนวงกลม 132px) */
const RING_SIZE = 132;
const RING_GAP = 10;

function clampPercent(achieved: number, target: number): number {
  if (target <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((achieved / target) * 100));
}

export function TargetRing({ target, className }: TargetRingProps) {
  const percent = clampPercent(target.achieved, target.target);
  const filledDegrees = percent * 3.6;

  return (
    <section
      data-slot="target-ring"
      className={`flex flex-col rounded-lg bg-card p-5 shadow-card ${className ?? ""}`}
    >
      <header className="mb-4">
        <h2 className="text-title font-semibold text-foreground">เป้าหมายรายเดือน</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">รายการยืมที่ครบเป้าหมาย</p>
      </header>

      {/* วงแหวนความคืบหน้า — conic-gradient ล้วน (ไม่มี svg มือ) */}
      <div
        className="relative mx-auto rounded-full"
        role="img"
        aria-label={`ความคืบหน้าเป้าหมาย ${percent}%`}
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          background: `conic-gradient(var(--color-brand-500) ${filledDegrees}deg, var(--color-muted) ${filledDegrees}deg)`,
        }}
      >
        <div className="absolute inset-[10px] flex flex-col items-center justify-center gap-0.5 rounded-full bg-card">
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
