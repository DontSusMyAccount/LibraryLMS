"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const THAI_MONTH_NAMES = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function getThaiMonthLabel(year: number, monthIndex: number): string {
  const buddhistYear = year + 543;
  const thaiMonth = THAI_MONTH_NAMES[monthIndex];
  return `${thaiMonth} ${buddhistYear}`;
}

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface CalendarDay {
  day: Date;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasEvent: boolean;
}

function buildCalendarDays(
  displayedMonth: Date,
  value?: Date,
  highlightedDates: Date[] = [],
): CalendarDay[] {
  const monthStart = startOfMonth(displayedMonth);
  const monthEnd = endOfMonth(displayedMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const highlightedKeys = new Set(highlightedDates.map(toDayKey));

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((day) => ({
    day,
    inMonth: isSameMonth(day, displayedMonth),
    isToday: isToday(day),
    isSelected: value !== undefined && isSameDay(day, value),
    hasEvent: highlightedKeys.has(toDayKey(day)),
  }));
}

interface CalendarProps {
  value?: Date;
  highlightedDates?: Date[];
  monthLabel?: string;
  onSelect?: (date: Date) => void;
  className?: string;
}

function Calendar({
  value,
  highlightedDates = [],
  monthLabel,
  onSelect,
  className,
}: CalendarProps) {
  const [displayedMonth, setDisplayedMonth] = React.useState(() =>
    value !== undefined ? startOfMonth(value) : startOfMonth(new Date()),
  );

  const days = buildCalendarDays(displayedMonth, value, highlightedDates);
  const headerLabel =
    monthLabel ?? getThaiMonthLabel(displayedMonth.getFullYear(), displayedMonth.getMonth());

  const showPreviousMonth = () => setDisplayedMonth((month) => subMonths(month, 1));
  const showNextMonth = () => setDisplayedMonth((month) => addMonths(month, 1));

  return (
    <div data-slot="calendar" className={cn("w-full select-none", className)}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          data-slot="calendar-prev"
          aria-label="เดือนก่อนหน้า"
          onClick={showPreviousMonth}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <p data-slot="calendar-month-label" className="text-label font-medium text-foreground">
          {headerLabel}
        </p>
        <button
          type="button"
          data-slot="calendar-next"
          aria-label="เดือนถัดไป"
          onClick={showNextMonth}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={`${label}-${index}`}
            data-slot="calendar-weekday"
            className="pb-1 text-caption text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((calendarDay) => {
          const dayNumber = calendarDay.day.getDate();
          const isHighlighted = calendarDay.isToday || calendarDay.isSelected;
          const interactive = onSelect !== undefined;
          const sharedClassName = cn(
            "relative flex size-8 items-center justify-center rounded-full text-sm transition-colors",
            !calendarDay.inMonth && "text-muted-foreground/40",
            calendarDay.inMonth && !isHighlighted && "text-foreground hover:bg-muted",
            calendarDay.isToday && "bg-brand-500 text-white hover:bg-brand-600",
            calendarDay.isSelected &&
              !calendarDay.isToday &&
              "bg-brand-500/10 text-brand-600 ring-1 ring-brand-500 dark:text-brand-300",
          );

          const dayNode = (
            <div
              data-slot="calendar-day"
              data-date={toDayKey(calendarDay.day)}
              className={sharedClassName}
            >
              <span className="mt-0.5 leading-none">{dayNumber}</span>
              <span
                data-slot="calendar-event-dot"
                className={cn(
                  "absolute bottom-1 size-1 rounded-full bg-brand-400",
                  !calendarDay.hasEvent && "hidden",
                )}
              />
            </div>
          );

          if (interactive) {
            return (
              <button
                key={toDayKey(calendarDay.day)}
                type="button"
                aria-label={`เลือกวันที่ ${dayNumber}`}
                onClick={() => onSelect?.(calendarDay.day)}
                className="flex items-center justify-center"
              >
                {dayNode}
              </button>
            );
          }

          return <div key={toDayKey(calendarDay.day)}>{dayNode}</div>;
        })}
      </div>
    </div>
  );
}

export { Calendar };

export type { CalendarProps };
