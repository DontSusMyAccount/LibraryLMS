import type { LoanRecord, ReservationRecord } from "@libsys/shared";

export interface CheckoutResult {
  loan: LoanRecord;
  dueDate: string;
}

export interface ReserveResult {
  reservation: ReservationRecord;
}

export type { MyReservationItem } from "@/app/_shared/types/reservation-item";
