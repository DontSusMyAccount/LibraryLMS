"use client";

import { ChevronDownIcon } from "lucide-react";

import type { ReservationStatus } from "@libsys/shared";
import { cn } from "@/lib/utils";

import { RESERVATION_STATUS_LABELS } from "@/app/features/reservations/reservation.status";

export const RESERVATION_STATUS_OPTIONS: { value: ReservationStatus; label: string }[] = (
  Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[]
).map((value) => ({
  value,
  label: RESERVATION_STATUS_LABELS[value],
}));

interface StatusFilterProps {
  value: ReservationStatus | null;
  onChange: (status: ReservationStatus | null) => void;
  className?: string;
}

function StatusFilter({ value, onChange, className }: StatusFilterProps) {
  const handleChange = (nextValue: string) => {
    onChange(nextValue ? (nextValue as ReservationStatus) : null);
  };

  return (
    <div className={cn("relative", className)}>
      <select
        data-slot="status-filter"
        value={value ?? ""}
        onChange={(event) => handleChange(event.target.value)}
        aria-label="กรองสถานะคิวจอง"
        className="h-[42px] w-full min-w-0 appearance-none rounded-sm border border-input bg-card py-2 pr-9 pl-3.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 dark:bg-input/30"
      >
        <option value="">ทุกสถานะ</option>
        {RESERVATION_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { StatusFilter };

export type { StatusFilterProps };
