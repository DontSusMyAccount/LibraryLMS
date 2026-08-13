import type { ReservationRecord } from "@libsys/shared";

export interface MyReservationItem {
  reservation: ReservationRecord;
  bookTitle: string;
  bookCoverUrl?: string;
}
