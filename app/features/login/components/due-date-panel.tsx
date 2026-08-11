"use client";

import { useMemo } from "react";
import { format, setDate } from "date-fns";
import { th } from "date-fns/locale";
import { BookMarkedIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const HIGHLIGHT_DAYS = [3, 9, 15, 22, 27];

interface SlipRow {
  index: number;
  title: string;
  dueDay: number;
}

const SLIP_ROWS: SlipRow[] = [
  { index: 1, title: "คณิตศาสตร์พื้นฐาน", dueDay: 5 },
  { index: 2, title: "วรรณคดีไทย", dueDay: 14 },
  { index: 3, title: "วิทยาศาสตร์ ม.ต้น", dueDay: 21 },
];

interface DueDatePanelProps {
  className?: string;
}

export function DueDatePanel({ className }: DueDatePanelProps) {
  const now = useMemo(() => new Date(), []);
  const monthLabel = format(now, "LLLL yyyy", { locale: th });
  const stampLabel = format(now, "d MMMM yyyy", { locale: th });

  return (
    <section data-slot="due-date-panel" className={cn("flex flex-col gap-6", className)}>
      <div className="relative rounded-lg bg-card p-6 shadow-card">
        <header className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex size-11 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300">
            <BookMarkedIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-title font-semibold text-foreground">บัตรกำหนดคืน</h2>
            <p className="text-sm text-muted-foreground">หอสมุด Library LMS · {monthLabel}</p>
          </div>
        </header>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-caption font-medium text-muted-foreground">
              <th className="py-1 pr-2 text-left font-medium">ลำดับ</th>
              <th className="py-1 text-left font-medium">ชื่อหนังสือ</th>
              <th className="py-1 pl-2 text-right font-medium">กำหนดคืน</th>
            </tr>
          </thead>
          <tbody>
            {SLIP_ROWS.map((row) => (
              <tr key={row.index} className="border-t border-border/70 text-foreground">
                <td className="py-2.5 pr-2 tabular-nums text-muted-foreground">{row.index}</td>
                <td className="py-2.5">{row.title}</td>
                <td className="py-2.5 pl-2 text-right tabular-nums">
                  {formatDue(now, row.dueDay)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="mt-4 flex items-center justify-between border-t border-dashed border-border pt-3 text-caption text-muted-foreground">
          <span>กรุณาส่งคืนหนังสือภายในกำหนด</span>
          <span className="tabular-nums">{stampLabel}</span>
        </footer>

        <div
          data-slot="circulation-stamp"
          aria-hidden="true"
          className="pointer-events-none absolute -right-5 -bottom-7 hidden rotate-[-10deg] sm:block"
        >
          <div className="flex size-28 flex-col items-center justify-center rounded-full border-2 border-accent-coral/50 text-center outline-2 outline-offset-4 outline-accent-coral/25">
            <span className="text-[11px] font-semibold tracking-wide text-accent-coral">
              กำหนดคืน
            </span>
            <span className="mt-1 text-[10px] tabular-nums text-accent-coral">
              {format(now, "d MMM", { locale: th })}
            </span>
          </div>
        </div>
      </div>

      <div data-slot="mini-calendar-dots" className="rounded-lg bg-card p-5 shadow-card">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-label font-medium text-foreground">รอบเดือน</h2>
          <span className="text-caption text-muted-foreground">{monthLabel}</span>
        </header>
        <div className="grid grid-cols-7 gap-1 text-center text-caption text-muted-foreground">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="py-0.5">
              {label}
            </span>
          ))}
          {buildMonthCells(now).map((cell) => (
            <span key={cell.key} className="flex flex-col items-center py-0.5">
              <span
                className={cn(
                  "flex size-6 items-center justify-center tabular-nums",
                  cell.isToday && "rounded-full bg-brand-500 font-medium text-white",
                )}
              >
                {cell.day ?? ""}
              </span>
              <span className={cn("mt-0.5 size-1 rounded-full", cell.hasDot && "bg-brand-500")} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatDue(now: Date, day: number): string {
  return format(setDate(now, day), "d MMM", { locale: th });
}

interface MonthCell {
  key: string;
  day: number | null;
  isToday: boolean;
  hasDot: boolean;
}

function buildMonthCells(now: Date): MonthCell[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDay = now.getDate();

  const cells: MonthCell[] = [];
  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ key: `pad-${index}`, day: null, isToday: false, hasDot: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      key: `day-${day}`,
      day,
      isToday: day === todayDay,
      hasDot: HIGHLIGHT_DAYS.includes(day),
    });
  }
  return cells;
}
