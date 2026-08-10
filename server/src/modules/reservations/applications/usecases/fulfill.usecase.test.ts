import { describe, expect, it } from "vitest";

import { DomainConflictError, DomainNotFoundError } from "../../../../domains/errors";
import type { AuditLog, LoanRecord, ReservationRecord } from "../../../../shared";
import type { IAuditRepository } from "../../../catalog/applications/ports/audit.repository";
import type { IReservationRepository } from "../ports/reservation.repository";
import { FulfillUsecase } from "./fulfill.usecase";

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

function buildLoan(overrides: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: "loan-1",
    copyId: "c-1",
    userId: "u-1",
    borrowedAt: "2026-08-06T00:00:00.000Z",
    dueAt: "2026-08-20T00:00:00.000Z",
    status: "active",
    renewedCount: 0,
    loanPeriodDays: 14,
    dailyFineRate: 5,
    createdAt: "2026-08-06T00:00:00.000Z",
    ...overrides,
  };
}

function createReservationRepository(
  records: ReservationRecord[],
  loans: LoanRecord[],
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
      item.fulfilledLoanId = input.fulfilledLoanId;
      return item;
    },
    findReadyOverdue: async () => [],
    findActiveLoanById: async (loanId) =>
      loans.find((loan) => loan.id === loanId && loan.status === "active") ?? null,
    getSystemSetting: async () => 3,
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

describe("FulfillUsecase", () => {
  it("ready → fulfilled เชื่อม fulfilledLoanId และบันทึก audit", async () => {
    const records = [buildReservation()];
    const loans = [buildLoan()];
    const auditRepo = createAuditRepository();
    const usecase = new FulfillUsecase(createReservationRepository(records, loans), auditRepo);

    const result = await usecase.execute({
      command: { id: "r-1", loanId: "loan-1" },
      actorId: "u-librarian",
    });

    expect(result.reservation.status).toBe("fulfilled");
    expect(result.reservation.fulfilledLoanId).toBe("loan-1");
    expect(auditRepo.records[0]).toMatchObject({
      action: "reservation.fulfilled",
      entityType: "reservation",
    });
  });

  it("ไม่พบรายการจอง → DomainNotFoundError", async () => {
    const usecase = new FulfillUsecase(
      createReservationRepository([], [buildLoan()]),
      createAuditRepository(),
    );

    await expect(
      usecase.execute({ command: { id: "r-999", loanId: "loan-1" } }),
    ).rejects.toThrowError(DomainNotFoundError);
  });

  it("รายการจองยังไม่พร้อม (waiting) → DomainConflictError", async () => {
    const records = [buildReservation({ status: "waiting" })];
    const usecase = new FulfillUsecase(
      createReservationRepository(records, [buildLoan()]),
      createAuditRepository(),
    );

    await expect(
      usecase.execute({ command: { id: "r-1", loanId: "loan-1" } }),
    ).rejects.toThrowError(DomainConflictError);
  });

  it("ไม่พบ loan ที่ active สำหรับการ fulfill → DomainConflictError", async () => {
    const records = [buildReservation()];
    const usecase = new FulfillUsecase(
      createReservationRepository(records, []),
      createAuditRepository(),
    );

    await expect(
      usecase.execute({ command: { id: "r-1", loanId: "loan-missing" } }),
    ).rejects.toThrowError(DomainConflictError);
  });

  it("loan เป็นของคนอื่น → DomainConflictError (ต้องเป็น active loan ของ user ที่จอง)", async () => {
    const records = [buildReservation()];
    const loans = [buildLoan({ userId: "u-other" })];
    const usecase = new FulfillUsecase(
      createReservationRepository(records, loans),
      createAuditRepository(),
    );

    await expect(
      usecase.execute({ command: { id: "r-1", loanId: "loan-1" } }),
    ).rejects.toThrowError(DomainConflictError);
  });
});
