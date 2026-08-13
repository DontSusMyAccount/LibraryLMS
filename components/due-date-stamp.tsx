"use client";

import { BookMarkedIcon, LibraryIcon } from "lucide-react";
import { motion } from "framer-motion";

import type { DueDateStampData } from "@/app/features/circulation/circulation.types";
import { formatThaiDate, formatThaiShortDate } from "@/app/features/circulation/circulation.format";

interface DueDateStampProps {
  stamp: DueDateStampData;
  className?: string;
}

export function DueDateStamp({ stamp, className }: DueDateStampProps) {
  const copyLabel =
    stamp.copyCodes.length === 1 ? stamp.copyCodes[0] : `${stamp.copyCodes.length} รายการ`;

  return (
    <motion.section
      data-slot="due-date-stamp"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
      className={`relative overflow-hidden rounded-lg bg-card p-6 shadow-card ${className ?? ""}`}
    >
      <header className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex size-11 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300">
          <BookMarkedIcon className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-title font-semibold text-foreground">บัตรกำหนดคืน</h2>
          <p className="truncate text-sm text-muted-foreground">
            <LibraryIcon className="mr-1 inline size-3.5 text-brand-500" />
            Library LMS · {stamp.memberName}
          </p>
        </div>
      </header>

      <div className="mt-5 text-center">
        <p className="text-caption font-medium tracking-wide text-muted-foreground">
          กำหนดส่งคืนภายในวันที่
        </p>
        <p className="mt-1 text-[28px] leading-tight font-bold tabular-nums text-foreground">
          {formatThaiDate(stamp.dueDate)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          สำเนาที่ขอด้วย:{" "}
          <span className="font-medium tabular-nums text-foreground">{copyLabel}</span>
        </p>
      </div>

      <motion.div
        data-slot="circulation-stamp"
        aria-hidden="true"
        initial={{ scale: 0.4, opacity: 0, rotate: -24 }}
        animate={{ scale: 1, opacity: 1, rotate: -8 }}
        transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.15 }}
        className="pointer-events-none absolute right-6 -bottom-5"
      >
        <div className="flex size-24 flex-col items-center justify-center rounded-full border-2 border-accent-coral/60 text-center outline-2 outline-offset-4 outline-accent-coral/25 sm:size-28">
          <span className="text-xs font-bold tracking-wider text-accent-coral">กำหนดคืน</span>
          <span className="mt-1 text-[11px] font-semibold tabular-nums text-accent-coral">
            {formatThaiShortDate(stamp.dueDate)}
          </span>
          <span className="text-[10px] text-accent-coral">ตามจริง</span>
        </div>
      </motion.div>
    </motion.section>
  );
}

export type { DueDateStampProps };
