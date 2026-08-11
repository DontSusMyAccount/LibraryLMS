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
  finesTotal: number;
  isSuspended: boolean;
  maxRenewals: number;
}

export interface CheckoutCartItem {
  copyCode: string;
  error: string | null;
}

export interface DueDateStampData {
  copyCodes: string[];
  dueDate: string;
  memberName: string;
}

export type CirculationTab = "checkout" | "checkin" | "overdue";

export type { CheckinResult, CheckoutResult, UserPublic };
