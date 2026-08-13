"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BookOpenTextIcon, HistoryIcon, SearchIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { DueDateCard } from "./components/due-date-card";
import { LoanItem } from "./components/loan-item";
import {
  selectActiveLoans,
  selectHistoryLoans,
  selectNearestDueLoan,
  useMyLoans,
} from "./hooks/use-my-loans";

const PAGE_TITLE = "การยืมของฉัน";
const PAGE_SUBTITLE = "ติดตามกำหนดคืน และต่ออายุหนังสือที่ยืมอยู่";
const ACTIVE_SECTION_TITLE = "กำลังยืม";
const HISTORY_SECTION_TITLE = "ประวัติการยืม";
const EMPTY_TITLE = "ยังไม่มีรายการยืม";
const EMPTY_HINT = "ค้นหาหนังสือที่ชอบแล้วยืมได้ทันทีด้วยตัวเอง";
const BROWSE_LABEL = "ไปค้นหาหนังสือ";
const LOAD_ERROR_TITLE = "โหลดข้อมูลไม่สำเร็จ";

function LoansSkeleton() {
  return (
    <div data-slot="loans-skeleton" className="flex flex-col gap-3">
      <Skeleton className="h-40 rounded-lg" />
      {[0, 1].map((item) => (
        <Skeleton key={item} className="h-24 rounded-lg" />
      ))}
    </div>
  );
}

export function MyLoansPage() {
  const { profile, loans, isLoading, isError, errorMessage, renewingId, renewError, load, renew } =
    useMyLoans();

  useEffect(() => {
    void load();
  }, [load]);

  const activeLoans = selectActiveLoans(loans);
  const historyLoans = selectHistoryLoans(loans);
  const nearestDue = selectNearestDueLoan(loans);
  const isEmpty = !isLoading && !isError && loans.length === 0;

  return (
    <div data-slot="my-loans-page" className="flex flex-col gap-5">
      <section data-slot="my-loans-heading">
        <h1 className="text-title font-semibold text-foreground">{PAGE_TITLE}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{PAGE_SUBTITLE}</p>
      </section>

      {isError ? (
        <section
          data-slot="my-loans-error"
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
        <LoansSkeleton />
      ) : isEmpty ? (
        <section
          data-slot="my-loans-empty"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
            <BookOpenTextIcon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">{EMPTY_TITLE}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{EMPTY_HINT}</p>
          <Button type="button" render={<Link href="/search" />}>
            <SearchIcon />
            {BROWSE_LABEL}
          </Button>
        </section>
      ) : (
        <>
          {nearestDue && profile && <DueDateCard loan={nearestDue} profile={profile} />}

          {renewError && (
            <section
              data-slot="renew-error"
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-accent-coral/30 bg-accent-coral/5 px-3 py-2.5 text-sm text-accent-coral"
            >
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{renewError}</p>
            </section>
          )}

          <section data-slot="my-active-loans" className="flex flex-col gap-3">
            <h2 className="text-title font-semibold text-foreground">{ACTIVE_SECTION_TITLE}</h2>
            {activeLoans.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีรายการยืมที่กำลังค้างอยู่</p>
            ) : (
              activeLoans.map((item) => (
                <LoanItem
                  key={item.loan.id}
                  item={item}
                  renewing={renewingId === item.loan.id}
                  onRenew={(loanId) => void renew(loanId)}
                />
              ))
            )}
          </section>

          {historyLoans.length > 0 && (
            <section data-slot="my-loan-history" className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-title font-semibold text-foreground">
                <HistoryIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                {HISTORY_SECTION_TITLE}
              </h2>
              {historyLoans.map((item) => (
                <LoanItem key={item.loan.id} item={item} renewing={false} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default MyLoansPage;
