import { addDays } from "date-fns";
import { describe, expect, it } from "vitest";

import type { AuditLog, ReservationRecord } from "../../../../shared";
import type { IAuditRepository } from "../../../catalog/applications/ports/audit.repository";
import type { IReservationRepository } from "../ports/reservation.repository";
import { ExpireOverdueUsecase } from "./expire.usecase";

const NOW = new Date("2026-08-10T00:00:00.000Z");

function buildReservation(overrides: Partial<ReservationRecord> = {}): ReservationRecord {
  return {
    id: "r-1",
    bookId: "b-1",
    userId: "u-1",
    status: "ready",
    reservedAt: "2026-08-01T00:00:00.000Z",
    readyAt: "2026-08-06T00:00:00.000Z",
    pickupDeadline: "2026-08-09T00:00:00.000Z",
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
    findByBookQueue: async (bookId) =>
      [...records]
        .filter(
          (item) =>
            item.bookId === bookId &&
            (item.status === "waiting" || item.status === "ready" || item.status === "suspended"),
        )
        .sort((a, b) => new Date(a.reservedAt).getTime() - new Date(b.reservedAt).getTime()),
    countActiveByBook: async () => 0,
    updateStatus: async (id, input) => {
      const item = records.find((entry) => entry.id === id);
      if (!item) return null;
      item.status = input.status;
      if (input.readyAt) item.readyAt = input.readyAt;
      if (input.pickupDeadline) item.pickupDeadline = input.pickupDeadline;
      return item;
    },
    findReadyOverdue: async (now) =>
      records.filter(
        (item) =>
          item.status === "ready" &&
          item.pickupDeadline !== undefined &&
          new Date(item.pickupDeadline) < now,
      ),
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

describe("ExpireOverdueUsecase", () => {
  it("ready ที่เลย pickupDeadline → expired และคนถัดไปในคิว (waiting) ถูกเลื่อนเป็น ready", async () => {
    const expired = buildReservation({
      id: "r-1",
      status: "ready",
      readyAt: "2026-08-06T00:00:00.000Z",
      pickupDeadline: "2026-08-09T00:00:00.000Z",
    });
    const next = buildReservation({
      id: "r-2",
      userId: "u-2",
      status: "waiting",
      reservedAt: "2026-08-02T00:00:00.000Z",
    });
    const records = [expired, next];
    const auditRepo = createAuditRepository();
    const usecase = new ExpireOverdueUsecase(createReservationRepository(records, 3), auditRepo);

    const result = await usecase.execute({ actorId: "u-librarian", now: NOW });

    expect(result.expiredCount).toBe(1);
    expect(result.promotedCount).toBe(1);
    expect(records.find((item) => item.id === "r-1")!.status).toBe("expired");
    expect(records.find((item) => item.id === "r-2")!.status).toBe("ready");
    expect(records.find((item) => item.id === "r-2")!.readyAt).toBe(NOW.toISOString());
    expect(records.find((item) => item.id === "r-2")!.pickupDeadline).toBe(
      addDays(NOW, 3).toISOString(),
    );
    expect(auditRepo.records[0]).toMatchObject({
      action: "reservation.expired",
      entityType: "reservation",
    });
    expect(auditRepo.records[1]).toMatchObject({
      action: "reservation.ready",
      entityType: "reservation",
    });
  });

  it("ready ที่ยังไม่ถึง pickupDeadline → ไม่ถูก expire", async () => {
    const records = [
      buildReservation({
        id: "r-1",
        status: "ready",
        readyAt: "2026-08-10T00:00:00.000Z",
        pickupDeadline: addDays(NOW, 2).toISOString(),
      }),
    ];
    const usecase = new ExpireOverdueUsecase(
      createReservationRepository(records, 3),
      createAuditRepository(),
    );

    const result = await usecase.execute({ now: NOW });

    expect(result.expiredCount).toBe(0);
    expect(records[0]!.status).toBe("ready");
  });

  it("ไม่มีคิวคนถัดไป → มีแค่ expired ไม่มี promoted", async () => {
    const records = [
      buildReservation({
        id: "r-1",
        status: "ready",
        readyAt: "2026-08-06T00:00:00.000Z",
        pickupDeadline: "2026-08-09T00:00:00.000Z",
      }),
    ];
    const usecase = new ExpireOverdueUsecase(
      createReservationRepository(records, 3),
      createAuditRepository(),
    );

    const result = await usecase.execute({ now: NOW });

    expect(result.expiredCount).toBe(1);
    expect(result.promotedCount).toBe(0);
    expect(records[0]!.status).toBe("expired");
  });

  it("waiting ยังไม่ผ่าน pickup deadline → คงสถานะ waiting", async () => {
    const records = [buildReservation({ id: "r-1", status: "waiting", pickupDeadline: undefined })];
    const usecase = new ExpireOverdueUsecase(
      createReservationRepository(records, 3),
      createAuditRepository(),
    );

    const result = await usecase.execute({ now: NOW });

    expect(result.expiredCount).toBe(0);
    expect(records[0]!.status).toBe("waiting");
  });
});
