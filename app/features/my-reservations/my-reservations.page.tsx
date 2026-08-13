"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  BookOpenTextIcon,
  CalendarClockIcon,
  CalendarX2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatThaiDate } from "@/app/features/circulation/circulation.format";

import { useMyReservations } from "./hooks/use-my-reservations";
import type { ReservationStatus } from "@libsys/shared";

const PAGE_TITLE = "การจองของฉัน";
const PAGE_SUBTITLE = "ติดตามคิวรอหนังสือที่คุณจองไว้";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  waiting: "รอคิว",
  ready: "พร้อมรับ",
  fulfilled: "สำเร็จแล้ว",
  expired: "หมดอายุ",
  cancelled: "ยกเลิก",
  suspended: "ระงับ",
};

const STATUS_VARIANTS: Record<
  ReservationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  waiting: "default",
  ready: "secondary",
  fulfilled: "outline",
  expired: "destructive",
  cancelled: "outline",
  suspended: "destructive",
};

const EMPTY_TITLE = "ยังไม่มีคิวจอง";
const EMPTY_HINT = "เมื่อหนังสือที่ต้องการถูกยืมหมด ลองกดจองจากหน้ารายละเอียดหนังสือ";
const BROWSE_LABEL = "ไปค้นหาหนังสือ";
const LOAD_ERROR_TITLE = "โหลดคิวจองไม่สำเร็จ";

export function MyReservationsPage() {
  const {
    reservations,
    isLoading,
    isError,
    errorMessage,
    cancellingId,
    cancelError,
    load,
    cancel,
  } = useMyReservations();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div data-slot="my-reservations-page" className="flex flex-col gap-5">
      <section data-slot="my-reservations-heading">
        <h1 className="text-title font-semibold text-foreground">{PAGE_TITLE}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{PAGE_SUBTITLE}</p>
      </section>

      {isError ? (
        <section
          data-slot="my-reservations-error"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-accent-coral/10 text-accent-coral">
            <TriangleAlertIcon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">{LOAD_ERROR_TITLE}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {errorMessage ?? "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่"}
          </p>
          <Button type="button" variant="outline" onClick={() => void load()}>
            ลองใหม่อีกครั้ง
          </Button>
        </section>
      ) : isLoading ? (
        <div data-slot="my-reservations-loading" className="flex flex-col gap-3">
          {[0, 1].map((item) => (
            <Skeleton key={item} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <section
          data-slot="my-reservations-empty"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
            <CalendarX2Icon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">{EMPTY_TITLE}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{EMPTY_HINT}</p>
          <Button type="button" render={<Link href="/search" />}>
            <BookOpenTextIcon />
            {BROWSE_LABEL}
          </Button>
        </section>
      ) : (
        <>
          {cancelError && (
            <section
              data-slot="cancel-error"
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-accent-coral/30 bg-accent-coral/5 px-3 py-2.5 text-sm text-accent-coral"
            >
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{cancelError}</p>
            </section>
          )}

          <section data-slot="my-reservation-list" className="flex flex-col gap-3">
            {reservations.map((item) => {
              const { reservation, bookTitle, bookCoverUrl } = item;
              const isWaiting = reservation.status === "waiting";
              return (
                <Card key={reservation.id} data-slot="reservation-item" size="sm" className="gap-3">
                  <CardContent className="flex items-start gap-3">
                    <Link
                      href={`/books/${reservation.bookId}`}
                      aria-label={`ดูรายละเอียด ${bookTitle}`}
                      className="shrink-0 rounded-md focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:outline-none"
                    >
                      <div className="flex size-14 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {bookCoverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={bookCoverUrl}
                            alt={`ปกหนังสือ ${bookTitle}`}
                            className="size-full object-cover"
                          />
                        ) : (
                          <BookOpenTextIcon
                            className="size-6 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/books/${reservation.bookId}`}
                          className="line-clamp-2 text-sm leading-snug font-semibold text-foreground hover:text-brand-600 focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:outline-none dark:hover:text-brand-300"
                        >
                          {bookTitle}
                        </Link>
                        <Badge variant={STATUS_VARIANTS[reservation.status]}>
                          {STATUS_LABELS[reservation.status]}
                        </Badge>
                      </div>

                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClockIcon className="size-3.5" aria-hidden="true" />
                        จองเมื่อ {formatThaiDate(reservation.reservedAt)}
                      </p>

                      {reservation.status === "ready" && reservation.pickupDeadline && (
                        <p className="mt-0.5 text-xs font-medium text-brand-700 dark:text-brand-300">
                          รับหนังสือภายใน {formatThaiDate(reservation.pickupDeadline)} ที่เคาน์เตอร์
                        </p>
                      )}

                      {isWaiting && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          disabled={cancellingId === reservation.id}
                          onClick={() => void cancel(reservation.id)}
                        >
                          <XIcon />
                          {cancellingId === reservation.id ? "กำลังยกเลิก..." : "ยกเลิกคิวจอง"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

export default MyReservationsPage;
