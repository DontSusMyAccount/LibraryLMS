"use client";

import type { ReservationListItem } from "@/app/features/reservations/reservation.types";
import {
  RESERVATION_STATUS_LABELS,
  statusToneFor,
} from "@/app/features/reservations/reservation.status";
import { formatThaiDate } from "@/app/features/reservations/reservation.format";
import { cn } from "@/lib/utils";

function memberLabel(item: ReservationListItem): string {
  return item.borrowerName ?? `สมาชิก #${item.userId.slice(0, 8)}`;
}

interface QueueDetailProps {
  bookTitle: string;
  items: ReservationListItem[];
}

function QueueDetail({ bookTitle, items }: QueueDetailProps) {
  return (
    <div data-slot="queue-detail" className="flex flex-col gap-3">
      <h3 className="text-label font-medium text-foreground">
        คิวรอหนังสือ «{bookTitle}» — FIFO ตามลำดับการจอง
      </h3>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">ไม่พบรายการคิวสำหรับเล่มนี้</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {items.map((item, index) => {
            const tone = statusToneFor(item.status);
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-sm bg-muted/40 px-3 py-2"
              >
                <span
                  data-slot="queue-position"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                    index === 0
                      ? "bg-brand-500/15 text-brand-700 dark:text-brand-300"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {memberLabel(item)}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    จองเมื่อ {formatThaiDate(item.reservedAt)}
                  </p>
                </div>
                <span
                  data-slot={`queue-badge-${item.status}`}
                  className={cn(
                    "inline-flex h-5 shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-medium whitespace-nowrap",
                    tone.badgeClass,
                  )}
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full", tone.dotClass)} />
                  {RESERVATION_STATUS_LABELS[item.status]}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export { QueueDetail };

export type { QueueDetailProps };
