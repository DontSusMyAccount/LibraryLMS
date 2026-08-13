import type { FineRecord, LoanRecord, ReservationRecord } from "../../../../shared";

export const meRepositoryToken = Symbol("MeRepository").toString();

export interface IMyLoanListItem {
  loan: LoanRecord;
  bookId: string;
  bookTitle: string;
  bookCoverUrl?: string;
  copyCode: string;
}

export interface IMyReservationListItem {
  reservation: ReservationRecord;
  bookTitle: string;
  bookCoverUrl?: string;
}

export interface IMeRepository {
  listLoansByUser(userId: string): Promise<IMyLoanListItem[]>;
  listReservationsByUser(userId: string): Promise<IMyReservationListItem[]>;
  listFinesByUser(userId: string): Promise<FineRecord[]>;
}
