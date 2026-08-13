"use client";

import { useMemo } from "react";
import { parseISO } from "date-fns";
import { CalendarDaysIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";

interface MiniCalendarProps {
  dueDates: string[];
  className?: string;
}

function MiniCalendar({ dueDates, className }: MiniCalendarProps) {
  const highlightedDates = useMemo(
    () => dueDates.map((dueAt) => parseISO(dueAt)).filter((date) => !Number.isNaN(date.getTime())),
    [dueDates],
  );

  return (
    <section
      data-slot="mini-calendar"
      className={`rounded-lg bg-card p-5 shadow-card ${className ?? ""}`}
    >
      <header className="mb-4">
        <h2 className="text-title font-semibold text-foreground">กำหนดคืนหนังสือ</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">จุดสีแสดงวันกำหนดคืนในเดือนนี้</p>
      </header>

      <Calendar highlightedDates={highlightedDates} />

      <footer className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-sm text-muted-foreground">
        <CalendarDaysIcon className="size-4" />
        {dueDates.length > 0
          ? `มีรายการกำหนดคืน ${dueDates.length} รายการในเดือนนี้`
          : "ไม่มีรายการกำหนดคืนในเดือนนี้"}
      </footer>
    </section>
  );
}

export { MiniCalendar };

export type { MiniCalendarProps };
