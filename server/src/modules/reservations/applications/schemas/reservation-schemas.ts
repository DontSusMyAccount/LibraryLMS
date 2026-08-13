import type { Paginated, ReservationRecord, ReservationStatus } from "../../../../shared";

export interface ICreateReservationCommand {
  bookId: string;
  userId: string;
  branchId?: string;
}

export interface ICreateReservationResult {
  reservation: ReservationRecord;
}

export interface IListReservationsQuery {
  status?: ReservationStatus;
  page?: number;
  limit?: number;
}

export type IListReservationsResult = Paginated<ReservationRecord>;

export interface IMarkReadyCommand {
  id: string;
}

export interface IMarkReadyResult {
  reservation: ReservationRecord;
}

export interface IFulfillCommand {
  id: string;
  loanId: string;
}

export interface IFulfillResult {
  reservation: ReservationRecord;
}

export interface IExpireOverdueResult {
  expiredCount: number;
  promotedCount: number;
}
