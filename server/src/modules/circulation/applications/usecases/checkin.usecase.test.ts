import { describe, expect, it } from "vitest";

import { DomainConflictError, DomainNotFoundError } from "../../../../domains/errors";
import type {
  AuditLog,
  BookCopy,
  BorrowingPolicy,
  FineRecord,
  LoanRecord,
} from "../../../../shared";
import type { IAuditRepository } from "../../../catalog/applications/ports/audit.repository";
import type {
  ICreateFineInput,
  ICreateLoanInput,
  IMemberInfo,
  ILoanRepository,
  IReturnLoanInput,
} from "../ports/loan.repository";
import { CheckinUsecase } from "./checkin.usecase";

const NOW = new Date("2026-08-06T00:00:00.000Z");

interface LoanRepoState {
  members: IMemberInfo[];
  policies: BorrowingPolicy[];
  copies: BookCopy[];
  loans: LoanRecord[];
  fines: FineRecord[];
  hasReservation: boolean;
  recallBufferDays: number;
  nextId: number;
}

function createLoanRepository(state: LoanRepoState): ILoanRepository {
  return {
    findMemberById: async (userId) => state.members.find((member) => member.id === userId) ?? null,
    findPoliciesByRole: async () => state.policies,
    findCopyByCode: async (copyCode) =>
      state.copies.find((copy) => copy.copyCode === copyCode) ?? null,
    findCopyById: async (copyId) => state.copies.find((copy) => copy.id === copyId) ?? null,
    updateCopyStatus: async (copyId, status) => {
      const copy = state.copies.find((item) => item.id === copyId);
      if (copy) {
        copy.status = status;
      }
    },
    countActiveLoansByUser: async () => 0,
    findActiveLoanByCopy: async (copyId) =>
      state.loans.find((loan) => loan.copyId === copyId && loan.status === "active") ?? null,
    findActiveLoanById: async (id) =>
      state.loans.find((loan) => loan.id === id && loan.status === "active") ?? null,
    createLoan: async (input: ICreateLoanInput) => {
      const loan = {
        id: `loan-${state.nextId++}`,
        copyId: input.copyId,
        userId: input.userId,
        borrowedAt: NOW.toISOString(),
        dueAt: input.dueAt,
        status: "active",
        renewedCount: 0,
        loanPeriodDays: input.loanPeriodDays,
        dailyFineRate: input.dailyFineRate,
        checkedOutBy: input.checkedOutBy,
        createdAt: NOW.toISOString(),
      } as LoanRecord;
      state.loans.push(loan);
      return loan;
    },
    returnLoan: async (id: string, input: IReturnLoanInput) => {
      const loan = state.loans.find((item) => item.id === id);
      if (!loan) return null;
      loan.status = input.status;
      loan.returnedAt = input.returnedAt;
      loan.checkedInBy = input.checkedInBy;
      return loan;
    },
    updateRenewal: async () => null,
    recallLoan: async () => null,
    listActiveLoansByUser: async () => [],
    sumUnpaidFinesByUser: async () => 0,
    insertFine: async (input: ICreateFineInput) => {
      const fine = {
        id: `fine-${state.nextId++}`,
        loanId: input.loanId,
        userId: input.userId,
        amount: input.amount,
        reason: input.reason,
        paid: false,
        waived: false,
        createdAt: NOW.toISOString(),
      };
      state.fines.push(fine);
      return fine;
    },
    hasActiveReservation: async () => state.hasReservation,
    getSystemSetting: async () => state.recallBufferDays,
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

function buildState(overrides: Partial<LoanRepoState> = {}): LoanRepoState {
  return {
    members: [
      {
        id: "u-member",
        role: "student",
        memberType: "undergraduate",
        status: "active",
      },
    ],
    policies: [
      {
        id: "p-1",
        role: "student",
        memberType: "undergraduate",
        maxActiveLoans: 5,
        loanPeriodDays: 14,
        maxRenewals: 2,
        gracePeriodDays: 3,
        dailyFineRate: 5,
        maxUnpaidFine: 100,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    copies: [
      {
        id: "c-1",
        bookId: "b-1",
        copyCode: "BK-001",
        status: "borrowed",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    loans: [
      {
        id: "loan-1",
        copyId: "c-1",
        userId: "u-member",
        borrowedAt: "2026-07-01T00:00:00.000Z",
        dueAt: "2026-08-10T00:00:00.000Z",
        status: "active",
        renewedCount: 0,
        loanPeriodDays: 14,
        dailyFineRate: 5,
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ],
    fines: [],
    hasReservation: false,
    recallBufferDays: 7,
    nextId: 100,
    ...overrides,
  };
}

describe("CheckinUsecase", () => {
  it("คืนหนังสือสำเร็จ → loan เป็น returned, copy กลับเป็น available, ไม่มี fine", async () => {
    const state = buildState();
    const auditRepo = createAuditRepository();
    const usecase = new CheckinUsecase(createLoanRepository(state), auditRepo);

    const result = await usecase.execute({
      command: { copyCode: "BK-001" },
      actorId: "u-librarian",
      now: NOW,
    });

    expect(result.loan.status).toBe("returned");
    expect(result.loan.returnedAt).toBe(NOW.toISOString());
    expect(result.loan.checkedInBy).toBe("u-librarian");
    expect(state.copies[0]!.status).toBe("available");
    expect(result.fine).toBeUndefined();
    expect(state.fines).toHaveLength(0);
    expect(auditRepo.records[0]).toMatchObject({
      action: "loan.returned",
      entityType: "loan",
    });
  });

  it("คืนช้าเกิน grace → สร้าง FineRecord = daily_fine_rate × วันที่เกิน", async () => {
    const state = buildState({
      loans: [
        {
          id: "loan-1",
          copyId: "c-1",
          userId: "u-member",
          borrowedAt: "2026-07-01T00:00:00.000Z",
          dueAt: "2026-08-01T00:00:00.000Z",
          status: "active",
          renewedCount: 0,
          loanPeriodDays: 14,
          dailyFineRate: 5,
          createdAt: "2026-07-01T00:00:00.000Z",
        },
      ],
    });
    const usecase = new CheckinUsecase(createLoanRepository(state), createAuditRepository());

    const result = await usecase.execute({
      command: { copyCode: "BK-001" },
      actorId: "u-librarian",
      now: NOW,
    });

    expect(result.fine).toBeDefined();
    expect(result.fine!.amount).toBe(10);
    expect(result.fine!.reason).toBe("overdue");
    expect(result.fine!.userId).toBe("u-member");
    expect(result.fine!.loanId).toBe("loan-1");
    expect(state.fines).toHaveLength(1);
  });

  it("คืนหนังสือที่หาย (copy status = lost) ได้ → loan returned, copy → available", async () => {
    const state = buildState({
      copies: [
        {
          id: "c-1",
          bookId: "b-1",
          copyCode: "BK-001",
          status: "lost",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const usecase = new CheckinUsecase(createLoanRepository(state), createAuditRepository());

    const result = await usecase.execute({
      command: { copyCode: "BK-001" },
      actorId: "u-librarian",
      now: NOW,
    });

    expect(result.loan.status).toBe("returned");
    expect(state.copies[0]!.status).toBe("available");
  });

  it("นาฬิกา server ช้ากว่า DB (returnedAt < borrowedAt) → ยังคืนสำเร็จ โดย clamp returnedAt ≥ borrowedAt", async () => {
    const borrowedAt = "2026-08-06T00:00:03.000Z";
    const state = buildState({
      loans: [
        {
          id: "loan-1",
          copyId: "c-1",
          userId: "u-member",
          borrowedAt,
          dueAt: "2026-08-20T00:00:00.000Z",
          status: "active",
          renewedCount: 0,
          loanPeriodDays: 14,
          dailyFineRate: 5,
          createdAt: borrowedAt,
        },
      ],
    });
    const usecase = new CheckinUsecase(createLoanRepository(state), createAuditRepository());

    const result = await usecase.execute({
      command: { copyCode: "BK-001" },
      actorId: "u-librarian",
      now: new Date("2026-08-06T00:00:00.000Z"),
    });

    expect(result.loan.status).toBe("returned");
    const returnedAtMs = new Date(result.loan.returnedAt as string).getTime();
    // DB เก็บ microsecond → JS Date truncate เหลือ ms → ต้องเผื่ออย่างน้อย 1ms
    expect(returnedAtMs).toBeGreaterThanOrEqual(new Date(borrowedAt).getTime() + 1);
    expect(result.loan.returnedAt).toBe(new Date(new Date(borrowedAt).getTime() + 1).toISOString());
    expect(state.copies[0]!.status).toBe("available");
  });

  it("ไม่พบรายการยืมที่ยัง active ของสำเนานี้ → DomainConflictError", async () => {
    const state = buildState({ loans: [] });
    const usecase = new CheckinUsecase(createLoanRepository(state), createAuditRepository());

    await expect(
      usecase.execute({ command: { copyCode: "BK-001" }, now: NOW }),
    ).rejects.toThrowError(DomainConflictError);
  });

  it("ไม่พบสำเนา → DomainNotFoundError", async () => {
    const state = buildState({ copies: [] });
    const usecase = new CheckinUsecase(createLoanRepository(state), createAuditRepository());

    await expect(
      usecase.execute({ command: { copyCode: "NOT-EXIST" }, now: NOW }),
    ).rejects.toThrowError(DomainNotFoundError);
  });
});
