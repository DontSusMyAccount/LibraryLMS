import type { BookWithCopies, ReservationRecord } from "@libsys/shared";

import { eden } from "@/app/_shared/lib/eden-client";
import { edenRequest } from "@/app/_shared/lib/eden-helpers";
import type { MyReservationItem } from "@/app/_shared/types/reservation-item";

import type { CheckoutResult } from "../book-detail.types";

export async function fetchBookWithCopies(bookId: string): Promise<BookWithCopies> {
  return edenRequest(await eden.catalog.books({ id: bookId }).get());
}

export async function fetchMyReservations(): Promise<MyReservationItem[]> {
  const result = await edenRequest(await eden.me.reservations.get());
  return result.reservations;
}

export async function checkoutBook(copyCode: string): Promise<CheckoutResult> {
  return edenRequest(await eden.me.checkout.post({ copyCode }));
}

export async function reserveBook(bookId: string): Promise<ReservationRecord> {
  const result = await edenRequest(await eden.me.reservations.post({ bookId }));
  return result.reservation;
}
