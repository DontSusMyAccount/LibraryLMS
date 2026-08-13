import { describe, expect, it, vi } from "vitest";

import {
  DomainConflictError,
  DomainForbiddenError,
  DomainNotFoundError,
} from "../../../../domains/errors";
import type { ReservationRecord, ReservationStatus } from "../../../../shared";
import type { IAuditRepository } from "../../../shared/applications/ports/audit.repository";
import type { IReservationRepository } from "../../../reservations/applications/ports/reservation.repository";
import { CancelMyReservationUsecase } from "./cancel-my-reservation.usecase";

function buildReservation(overrides: Partial<ReservationRecord> = {}): ReservationRecord {
  return {
    id: "r-1",
    bookId: "b-1",
    userId: "u-1",
    status: "waiting",
    reservedAt: "2026-08-01T00:00:00.000Z",
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("CancelMyReservationUsecase", () => {
  it("เป็นเจ้าของ reservation (waiting) → ยกเลิกสำเร็จ + audit", async () => {
    const reservationRepo: IReservationRepository = {
      findById: async (id: string) => (id === "r-1" ? buildReservation() : null),
      updateStatus: async (id: string, input: { status: ReservationStatus }) =>
        buildReservation({ id, status: input.status }),
    } as unknown as IReservationRepository;
    const audit = {
      record: vi.fn(async () => ({
        id: "log-1",
        userId: "u-1",
        action: "reservation.cancelled",
        entityType: "reservation",
        entityId: "r-1",
        createdAt: "2026-08-01T00:00:00.000Z",
      })),
    } as unknown as IAuditRepository;

    const usecase = new CancelMyReservationUsecase(reservationRepo, audit);
    const result = await usecase.execute({ command: { id: "r-1", userId: "u-1" }, actorId: "u-1" });

    expect(result.reservation.status).toBe("cancelled");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "reservation.cancelled", entityId: "r-1" }),
    );
  });

  it("reservation ไม่ใช่ของตัวเอง → DomainForbiddenError และไม่ update", async () => {
    const updateStatus = vi.fn();
    const reservationRepo: IReservationRepository = {
      findById: async () => buildReservation({ userId: "u-999" }),
      updateStatus,
    } as unknown as IReservationRepository;
    const audit = { record: vi.fn() } as unknown as IAuditRepository;

    const usecase = new CancelMyReservationUsecase(reservationRepo, audit);
    await expect(
      usecase.execute({ command: { id: "r-1", userId: "u-1" }, actorId: "u-1" }),
    ).rejects.toThrowError(DomainForbiddenError);
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("สถานะไม่ใช่ waiting (ready) → DomainConflictError", async () => {
    const reservationRepo: IReservationRepository = {
      findById: async () =>
        buildReservation({ status: "ready", pickupDeadline: "2026-08-20T00:00:00.000Z" }),
    } as unknown as IReservationRepository;
    const audit = { record: vi.fn() } as unknown as IAuditRepository;

    const usecase = new CancelMyReservationUsecase(reservationRepo, audit);
    await expect(
      usecase.execute({ command: { id: "r-1", userId: "u-1" }, actorId: "u-1" }),
    ).rejects.toThrowError(DomainConflictError);
  });

  it("ไม่พบ reservation → DomainNotFoundError", async () => {
    const reservationRepo: IReservationRepository = {
      findById: async () => null,
    } as unknown as IReservationRepository;
    const audit = { record: vi.fn() } as unknown as IAuditRepository;

    const usecase = new CancelMyReservationUsecase(reservationRepo, audit);
    await expect(
      usecase.execute({ command: { id: "r-ghost", userId: "u-1" }, actorId: "u-1" }),
    ).rejects.toThrowError(DomainNotFoundError);
  });
});
