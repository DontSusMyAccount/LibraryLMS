"use client";

import { Fragment, useMemo } from "react";
import {
  CalendarClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PackageCheckIcon,
} from "lucide-react";

import type { ReservationListItem } from "@/app/features/reservations/reservation.types";
import {
  RESERVATION_STATUS_LABELS,
  statusToneFor,
} from "@/app/features/reservations/reservation.status";
import { formatThaiDate } from "@/app/features/reservations/reservation.format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QueueDetail } from "@/components/queue-detail";

function memberLabel(item: ReservationListItem): string {
  return item.borrowerName ?? `สมาชิก #${item.userId.slice(0, 8)}`;
}

function buildBookQueueMap(
  reservations: ReservationListItem[],
): Map<string, ReservationListItem[]> {
  const map = new Map<string, ReservationListItem[]>();
  for (const reservation of reservations) {
    const queue = map.get(reservation.bookId) ?? [];
    queue.push(reservation);
    map.set(reservation.bookId, queue);
  }
  for (const queue of map.values()) {
    queue.sort((a, b) => a.reservedAt.localeCompare(b.reservedAt));
  }
  return map;
}

interface ReservationTableProps {
  reservations: ReservationListItem[];
  queueReservations: ReservationListItem[];
  expandedBookId: string | null;
  isBusy: boolean;
  onToggleExpand: (bookId: string) => void;
  onMarkReady: (id: string) => void;
  errorMessage: string | null;
}

function ReservationTable({
  reservations,
  queueReservations,
  expandedBookId,
  isBusy,
  onToggleExpand,
  onMarkReady,
  errorMessage,
}: ReservationTableProps) {
  const queueByBook = useMemo(() => buildBookQueueMap(queueReservations), [queueReservations]);

  return (
    <div className="flex flex-col gap-3">
      <Table data-slot="reservation-table">
        <TableHeader>
          <TableRow>
            <TableHead className="w-14" />
            <TableHead>สถานะ</TableHead>
            <TableHead>ผู้จอง</TableHead>
            <TableHead>หนังสือ</TableHead>
            <TableHead>วันที่จอง</TableHead>
            <TableHead>กำหนดรับ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((item) => {
            const tone = statusToneFor(item.status);
            const isExpanded = expandedBookId === item.bookId;
            const queue = queueByBook.get(item.bookId) ?? [];
            return (
              <Fragment key={item.id}>
                <TableRow data-state={isExpanded ? "selected" : undefined}>
                  <TableCell className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleExpand(item.bookId)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "ย่อคิวของเล่มนี้" : "ขยายคิวของเล่มนี้"}
                      className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {isExpanded ? (
                        <ChevronDownIcon className="size-4" />
                      ) : (
                        <ChevronRightIcon className="size-4" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="ghost" className={tone.badgeClass}>
                      <span className={`size-1.5 shrink-0 rounded-full ${tone.dotClass}`} />
                      {RESERVATION_STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{memberLabel(item)}</TableCell>
                  <TableCell className="max-w-[260px]">
                    <p className="truncate font-medium text-foreground">
                      {item.bookTitle ?? "ไม่พบชื่อหนังสือ"}
                    </p>
                    {item.bookAuthor && (
                      <p className="mt-0.5 text-caption text-muted-foreground">{item.bookAuthor}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatThaiDate(item.reservedAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(() => {
                      const deadline = item.pickupDeadline;
                      if (!deadline) {
                        return (
                          <span className="text-caption text-muted-foreground/70">
                            รอหนังสือว่าง
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClockIcon className="size-3.5 text-muted-foreground" />
                          {formatThaiDate(deadline)}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.status === "waiting" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onMarkReady(item.id)}
                        disabled={isBusy}
                      >
                        <PackageCheckIcon />
                        พร้อมให้ยืม
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="!border-b-0">
                    <TableCell colSpan={7} className="bg-muted/30 px-4 pt-1 pb-4">
                      <QueueDetail bookTitle={item.bookTitle ?? "ไม่พบชื่อหนังสือ"} items={queue} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      {errorMessage != null && (
        <p
          data-slot="reservation-table-error"
          role="status"
          className="text-sm font-medium text-accent-coral"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export { ReservationTable };

export type { ReservationTableProps };
