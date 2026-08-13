import { addDays, isAfter } from "date-fns";

import type { ReservationRecord, ReservationStatus } from "../shared";
import { DomainConflictError } from "./errors";

export const DEFAULT_PICKUP_DEADLINE_DAYS = 3;

const ACTIVE_QUEUE_STATUSES: readonly ReservationStatus[] = ["waiting", "ready", "suspended"];

const ALLOWED_TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  waiting: ["ready", "cancelled", "expired", "suspended"],
  ready: ["fulfilled", "expired", "cancelled"],
  suspended: ["waiting", "cancelled"],
  fulfilled: [],
  expired: [],
  cancelled: [],
};

const DUPLICATE_RESERVATION_MESSAGE = "สมาชิกรายนี้ได้จองหนังสือเล่มนี้ไว้แล้ว";

export function isActiveQueueStatus(status: ReservationStatus): boolean {
  return ACTIVE_QUEUE_STATUSES.includes(status);
}

export function canTransitionReservation(from: ReservationStatus, to: ReservationStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertNoActiveDuplicate(existing: ReservationRecord | null): void {
  if (existing) {
    throw new DomainConflictError(DUPLICATE_RESERVATION_MESSAGE);
  }
}

export function calcPickupDeadline(readyAt: Date, pickupDays: number): Date {
  return addDays(readyAt, pickupDays);
}

export function isPickupExpired(reservation: ReservationRecord, now: Date): boolean {
  if (reservation.status !== "ready" || !reservation.pickupDeadline) {
    return false;
  }
  return isAfter(now, new Date(reservation.pickupDeadline));
}

export function resolvePickupDays(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  return DEFAULT_PICKUP_DEADLINE_DAYS;
}

export function compareReservationQueueOrder(a: ReservationRecord, b: ReservationRecord): number {
  const aTime = new Date(a.reservedAt).getTime();
  const bTime = new Date(b.reservedAt).getTime();
  if (aTime !== bTime) {
    return aTime - bTime;
  }
  return a.id.localeCompare(b.id);
}

export interface AdvanceQueueResult {
  queue: ReservationRecord[];
  promoted: ReservationRecord | null;
}

export function advanceQueue(
  queue: ReservationRecord[],
  now: Date,
  pickupDays: number,
): AdvanceQueueResult {
  const ordered = [...queue].sort(compareReservationQueueOrder);
  const firstWaitingIndex = ordered.findIndex((item) => item.status === "waiting");
  if (firstWaitingIndex === -1) {
    return { queue: ordered, promoted: null };
  }

  const firstWaiting = ordered[firstWaitingIndex]!;
  const readyAt = now.toISOString();
  const pickupDeadline = calcPickupDeadline(now, pickupDays).toISOString();
  const promoted: ReservationRecord = {
    ...firstWaiting,
    status: "ready",
    readyAt,
    pickupDeadline,
  };
  const queueWithPromoted = [...ordered];
  queueWithPromoted[firstWaitingIndex] = promoted;

  return { queue: queueWithPromoted, promoted };
}
