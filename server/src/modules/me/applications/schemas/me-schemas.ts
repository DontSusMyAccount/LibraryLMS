import type {
  BorrowingPolicy,
  FineRecord,
  LoanRecord,
  ReservationRecord,
  UserPublic,
} from "../../../../shared";

export interface IGetMeQuery {
  userId: string;
}

export interface IGetMeResult {
  user: UserPublic;
  policy: BorrowingPolicy | null;
  unpaidFineTotal: number;
  activeLoanCount: number;
}

export interface IListMyLoansQuery {
  userId: string;
}

export interface IMyLoanItem {
  loan: LoanRecord;
  bookId: string;
  bookTitle: string;
  bookCoverUrl?: string;
  copyCode: string;
  overdue: boolean;
  daysOverdue: number;
  canRenew: boolean;
}

export interface IListMyLoansResult {
  loans: IMyLoanItem[];
}

export interface IRenewMyLoanCommand {
  id: string;
  userId: string;
}

export interface IRenewMyLoanResult {
  loan: LoanRecord;
  dueDate: string;
}

export interface ICreateMyReservationCommand {
  bookId: string;
  userId: string;
}

export interface ICreateMyReservationResult {
  reservation: ReservationRecord;
}

export interface IListMyReservationsQuery {
  userId: string;
}

export interface IMyReservationItem {
  reservation: ReservationRecord;
  bookTitle: string;
  bookCoverUrl?: string;
}

export interface IListMyReservationsResult {
  reservations: IMyReservationItem[];
}

export interface ICancelMyReservationCommand {
  id: string;
  userId: string;
}

export interface ICancelMyReservationResult {
  reservation: ReservationRecord;
}

export interface IListMyFinesQuery {
  userId: string;
}

export interface IListMyFinesResult {
  fines: FineRecord[];
  unpaidTotal: number;
}

export interface ISelfCheckoutCommand {
  copyCode: string;
  userId: string;
}

export interface ISelfCheckoutResult {
  loan: LoanRecord;
  dueDate: string;
}
