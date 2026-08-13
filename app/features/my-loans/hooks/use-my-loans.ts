"use client";

import { useMyLoansStore } from "../stores/my-loans.store";
import type { MyLoanItem } from "../my-loans.types";

export function useMyLoans() {
  const profile = useMyLoansStore((state) => state.profile);
  const loans = useMyLoansStore((state) => state.loans);
  const isLoading = useMyLoansStore((state) => state.isLoading);
  const isError = useMyLoansStore((state) => state.isError);
  const errorMessage = useMyLoansStore((state) => state.errorMessage);
  const renewingId = useMyLoansStore((state) => state.renewingId);
  const renewError = useMyLoansStore((state) => state.renewError);

  const load = useMyLoansStore((state) => state.load);
  const renew = useMyLoansStore((state) => state.renew);

  return { profile, loans, isLoading, isError, errorMessage, renewingId, renewError, load, renew };
}

/** รายการยืมที่ยังค้าง (active หรือ overdue) */
export function selectActiveLoans(loans: MyLoanItem[]): MyLoanItem[] {
  return loans.filter((item) => item.loan.status === "active" || item.loan.status === "overdue");
}

/** ประวัติที่คืนแล้ว / สูญหาย */
export function selectHistoryLoans(loans: MyLoanItem[]): MyLoanItem[] {
  return loans.filter((item) => item.loan.status === "returned" || item.loan.status === "lost");
}

/** รายการที่ใกล้ครบกำหนดที่สุด (ยังไม่เลยกำหนด) — ใช้ทำ due-date card */
export function selectNearestDueLoan(loans: MyLoanItem[]): MyLoanItem | null {
  const upcoming = loans
    .filter((item) => item.loan.status === "active" && !item.overdue)
    .sort((a, b) => new Date(a.loan.dueAt).getTime() - new Date(b.loan.dueAt).getTime());
  return upcoming[0] ?? null;
}
