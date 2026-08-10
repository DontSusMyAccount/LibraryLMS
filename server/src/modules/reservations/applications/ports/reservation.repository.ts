import type {
  BookTitle,
  LoanRecord,
  Paginated,
  ReservationRecord,
  ReservationStatus,
  UserStatus,
} from "../../../../shared";

export const reservationRepositoryToken = Symbol("ReservationRepository").toString();

export interface IReservationMemberInfo {
  id: string;
  status: UserStatus;
}

export interface IActiveLoanWithBook {
  loan: LoanRecord;
  bookId: string;
}

export interface ICreateReservationInput {
  bookId: string;
  userId: string;
  branchId?: string;
  reservedAt: string;
}

export interface IUpdateReservationInput {
  status: ReservationStatus;
  readyAt?: string;
  pickupDeadline?: string;
  fulfilledLoanId?: string;
}

export interface IReservationListQuery {
  status?: ReservationStatus;
  page: number;
  limit: number;
}

export interface IReservationRepository {
  findMemberById(userId: string): Promise<IReservationMemberInfo | null>;
  findBookById(bookId: string): Promise<BookTitle | null>;
  findActiveByUserAndBook(userId: string, bookId: string): Promise<ReservationRecord | null>;
  findById(id: string): Promise<ReservationRecord | null>;
  createReservation(input: ICreateReservationInput): Promise<ReservationRecord>;
  listReservations(query: IReservationListQuery): Promise<Paginated<ReservationRecord>>;
  findByBookQueue(bookId: string): Promise<ReservationRecord[]>;
  countActiveByBook(bookId: string): Promise<number>;
  updateStatus(id: string, input: IUpdateReservationInput): Promise<ReservationRecord | null>;
  findReadyOverdue(now: Date): Promise<ReservationRecord[]>;
  findActiveLoanWithBook(loanId: string): Promise<IActiveLoanWithBook | null>;
  getSystemSetting(key: string): Promise<unknown>;
}
