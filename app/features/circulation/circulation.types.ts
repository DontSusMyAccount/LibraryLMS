import type { CheckinResult, CheckoutResult, LoanRecord, UserPublic } from "@libsys/shared";

export interface ActiveLoanItem {
  loan: LoanRecord;
  overdue: boolean;
  daysOverdue: number;
  hasActiveReservation: boolean;
}

export interface MemberCardData {
  user: UserPublic;
  activeLoans: ActiveLoanItem[];
  activeLoansCount: number;
  overdueCount: number;
  finesTotal: number | null;
  isSuspended: boolean;
  maxRenewals: number;
}

export interface CheckoutCartItem {
  copyCode: string;
  error: string | null;
}

export type { DueDateStampData } from "@/app/_shared/types/due-date-stamp";

export type CirculationTab = "checkout" | "checkin" | "overdue";

export type { CheckinResult, CheckoutResult, UserPublic };
