import type { PaginatedResponse, ReservationRecord, ReservationStatus } from "@libsys/shared";

export interface ReservationListItem extends ReservationRecord {
  bookTitle?: string;
  bookAuthor?: string;
  borrowerName?: string;
}

export interface ListReservationsParams {
  status: ReservationStatus | null;
  page: number;
  limit: number;
}

export type ReservationListPage = PaginatedResponse<ReservationListItem>;
