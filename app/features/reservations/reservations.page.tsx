"use client";

import { useEffect } from "react";
import { InboxIcon, RefreshCcwIcon, TriangleAlertIcon } from "lucide-react";

import { ReservationTable } from "@/components/reservation-table";
import { StatusFilter } from "@/components/status-filter";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

import { useReservations } from "./hooks/use-reservations";

const PAGE_TITLE = "คิวจอง";
const PAGE_SUBTITLE = "จัดการคิวสำรองและรอรับหนังสือที่สมาชิกจองไว้";
const EMPTY_TITLE = "ยังไม่มีรายการคิวจอง";
const EMPTY_HINT = "ลองปรับสถานะการกรอง หรือรอรายการจองใหม่จากสมาชิก";
const LOAD_ERROR_TITLE = "โหลดรายการคิวจองไม่สำเร็จ";
const RETRY_LABEL = "ลองใหม่อีกครั้ง";
const TOTAL_LABEL = "รายการ";

function ReservationSkeleton() {
  return (
    <div data-slot="reservation-skeleton" className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-14 rounded-lg" />
      ))}
    </div>
  );
}

export function ReservationsPage() {
  const {
    reservations,
    status,
    page,
    total,
    totalPages,
    isLoading,
    isError,
    errorMessage,
    expandedBookId,
    isBusy,
    loadReservations,
    setStatus,
    setPage,
    markReady,
    toggleExpand,
  } = useReservations();

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const isEmpty = !isLoading && reservations.length === 0;

  return (
    <div data-slot="reservations-page" className="flex flex-col gap-6">
      <section
        data-slot="reservations-heading"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-title font-semibold text-foreground">{PAGE_TITLE}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{PAGE_SUBTITLE}</p>
        </div>
      </section>

      <section
        data-slot="reservations-toolbar"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <StatusFilter value={status} onChange={(nextStatus) => void setStatus(nextStatus)} />
      </section>

      {isError ? (
        <section
          data-slot="reservations-error"
          className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-accent-coral/10 text-accent-coral">
            <TriangleAlertIcon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">{LOAD_ERROR_TITLE}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {errorMessage ?? "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่"}
          </p>
          <Button type="button" variant="outline" onClick={() => void loadReservations()}>
            <RefreshCcwIcon />
            {RETRY_LABEL}
          </Button>
        </section>
      ) : isLoading && reservations.length === 0 ? (
        <section data-slot="reservations-loading" className="rounded-lg bg-card p-5 shadow-card">
          <ReservationSkeleton />
        </section>
      ) : isEmpty ? (
        <section
          data-slot="reservations-empty"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
            <InboxIcon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">{EMPTY_TITLE}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{EMPTY_HINT}</p>
        </section>
      ) : (
        <section data-slot="reservations-list" className="rounded-lg bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="tabular-nums font-medium text-foreground">{total}</span>{" "}
              {TOTAL_LABEL}
            </p>
          </div>
          <ReservationTable
            reservations={reservations}
            expandedBookId={expandedBookId}
            isBusy={isBusy}
            onToggleExpand={toggleExpand}
            onMarkReady={(id) => void markReady(id)}
            errorMessage={isBusy ? errorMessage : null}
          />
          {totalPages > 1 && (
            <div className="mt-4 flex justify-end">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(nextPage) => void setPage(nextPage)}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default ReservationsPage;
