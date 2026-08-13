import type { ReservationRecord } from "@libsys/shared";

import { eden } from "@/app/_shared/lib/eden-client";
import { edenRequest } from "@/app/_shared/lib/eden-helpers";

import type { MyReservationItem } from "../my-reservations.types";

export async function fetchMyReservations(): Promise<MyReservationItem[]> {
  const result = await edenRequest(await eden.me.reservations.get());
  return result.reservations;
}

export async function cancelMyReservation(reservationId: string): Promise<ReservationRecord> {
  const result = await edenRequest(await eden.me.reservations({ id: reservationId }).delete());
  return result.reservation;
}
