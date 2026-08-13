import type { BorrowingPolicy, LoanRecord, UserPublic } from "@libsys/shared";

export interface MeProfile {
  user: UserPublic;
  policy: BorrowingPolicy | null;
  unpaidFineTotal: number;
  activeLoanCount: number;
}

export interface MyLoanItem {
  loan: LoanRecord;
  bookId: string;
  bookTitle: string;
  bookCoverUrl?: string;
  copyCode: string;
  overdue: boolean;
  daysOverdue: number;
  canRenew: boolean;
}

export interface RenewMyLoanResult {
  loan: LoanRecord;
  dueDate: string;
}
