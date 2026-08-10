import { addDays } from "date-fns";
import { describe, expect, it } from "vitest";

import { DomainConflictError, DomainNotFoundError } from "../../../../domains/errors";
import type { AuditLog, ReservationRecord } from "../../../../shared";
import type { IAuditRepository } from "../../../catalog/applications/ports/audit.repository";
import type { IReservationRepository } from "../ports/reservation.repository";
import { MarkReadyUsecase } from "./mark-ready.usecase";

const NOW = new Date("2026-08-06T00:00:00.000Z");

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

function createReservationRepository(
  records: ReservationRecord[],
  pickupDays: unknown,
): IReservationRepository {
  return {
    findMemberById: async () => null,
    findBookById: async () => null,
    findActiveByUserAndBook: async () => null,
    findById: async (id) => records.find((item) => item.id === id) ?? null,
    createReservation: async () => buildReservation(),
    listReservations: async ({ page, limit }) => ({
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    }),
    findByBookQueue: async () => [],
    countActiveByBook: async () => 0,
    updateStatus: async (id, input) => {
      const item = records.find((entry) => entry.id === id);
      if (!item) return null;
      item.status = input.status;
      item.readyAt = input.readyAt;
      item.pickupDeadline = input.pickupDeadline;
      return item;
    },
    findReadyOverdue: async () => [],
    findActiveLoanById: async () => null,
    getSystemSetting: async () => pickupDays,
  };
}

function createAuditRepository(): IAuditRepository & { records: AuditLog[] } {
  const records: AuditLog[] = [];
  return {
    records,
    record: async (input) => {
      const log: AuditLog = {
        id: `log-${records.length + 1}`,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      records.push(log);
      return log;
    },
  };
}

describe("MarkReadyUsecase", () => {
  it("waiting → ready ตั้ง readyAt = now และ pickupDeadline = now + pickup days (จาก system_settings)", async () => {
    const records = [buildReservation()];
    const auditRepo = createAuditRepository();
    const usecase = new MarkReadyUsecase(createReservationRepository(records, 3), auditRepo);

    const result = await usecase.execute({
      command: { id: "r-1" },
      actorId: "u-librarian",
      now: NOW,
    });

    expect(result.reservation.status).toBe("ready");
    expect(result.reservation.readyAt).toBe(NOW.toISOString());
    expect(result.reservation.pickupDeadline).toBe(addDays(NOW, 3).toISOString());
    expect(auditRepo.records[0]).toMatchObject({
      action: "reservation.ready",
      entityType: "reservation",
    });
  });

  it("อ่าน pickup days จาก system_settings ได้ (ค่าไม่ใช่ 3)", async () => {
    const records = [buildReservation()];
    const usecase = new MarkReadyUsecase(
      createReservationRepository(records, 5),
      createAuditRepository(),
    );

    const result = await usecase.execute({ command: { id: "r-1" }, now: NOW });

    expect(result.reservation.pickupDeadline).toBe(addDays(NOW, 5).toISOString());
  });

  it("default pickup days = 3 เมื่อไม่มี system_settings", async () => {
    const records = [buildReservation()];
    const usecase = new MarkReadyUsecase(
      createReservationRepository(records, null),
      createAuditRepository(),
    );

    const result = await usecase.execute({ command: { id: "r-1" }, now: NOW });

    expect(result.reservation.pickupDeadline).toBe(addDays(NOW, 3).toISOString());
  });

  it("ไม่พบรายการจอง → DomainNotFoundError", async () => {
    const usecase = new MarkReadyUsecase(
      createReservationRepository([], 3),
      createAuditRepository(),
    );

    await expect(usecase.execute({ command: { id: "r-999" }, now: NOW })).rejects.toThrowError(
      DomainNotFoundError,
    );
  });

  it("รายการจองไม่ได้อยู่สถานะ waiting → DomainConflictError", async () => {
    const records = [buildReservation({ status: "fulfilled", fulfilledLoanId: "loan-1" })];
    const usecase = new MarkReadyUsecase(
      createReservationRepository(records, 3),
      createAuditRepository(),
    );

    await expect(usecase.execute({ command: { id: "r-1" }, now: NOW })).rejects.toThrowError(
      DomainConflictError,
    );
  });
});
