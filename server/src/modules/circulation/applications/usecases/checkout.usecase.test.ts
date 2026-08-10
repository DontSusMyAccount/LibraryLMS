import { describe, expect, it } from "vitest";

import {
  DomainConflictError,
  DomainForbiddenError,
  DomainNotFoundError,
} from "../../../../domains/errors";
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
import { CheckoutUsecase } from "./checkout.usecase";

const NOW = new Date("2026-08-01T00:00:00.000Z");

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
    countActiveLoansByUser: async (userId) =>
      state.loans.filter((loan) => loan.userId === userId && loan.status === "active").length,
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
    updateRenewal: async (id, input) => {
      const loan = state.loans.find((item) => item.id === id);
      if (!loan) return null;
      loan.renewedCount = input.renewedCount;
      loan.dueAt = input.dueAt;
      return loan;
    },
    recallLoan: async (id, input) => {
      const loan = state.loans.find((item) => item.id === id);
      if (!loan) return null;
      loan.dueAt = input.dueAt;
      loan.recalledAt = input.recalledAt;
      return loan;
    },
    listActiveLoansByUser: async (userId) =>
      state.loans.filter((loan) => loan.userId === userId && loan.status === "active"),
    sumUnpaidFinesByUser: async (userId) =>
      state.fines
        .filter((fine) => fine.userId === userId && !fine.paid)
        .reduce((total, fine) => total + fine.amount, 0),
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
        status: "available",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    loans: [],
    fines: [],
    hasReservation: false,
    recallBufferDays: 7,
    nextId: 1,
    ...overrides,
  };
}

function buildActiveLoan(overrides: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: "loan-1",
    copyId: "c-other",
    userId: "u-member",
    borrowedAt: NOW.toISOString(),
    dueAt: new Date("2026-08-15T00:00:00.000Z").toISOString(),
    status: "active",
    renewedCount: 0,
    loanPeriodDays: 14,
    dailyFineRate: 5,
    createdAt: NOW.toISOString(),
    ...overrides,
  };
}

describe("CheckoutUsecase", () => {
  it("ยืมสำเร็จ: สร้าง loan ตาม due date ของ policy, copy → borrowed, snapshot policy ลง loan", async () => {
    const state = buildState();
    const auditRepo = createAuditRepository();
    const usecase = new CheckoutUsecase(createLoanRepository(state), auditRepo);

    const result = await usecase.execute({
      command: { userId: "u-member", copyCode: "BK-001" },
      actorId: "u-librarian",
      now: NOW,
    });

    expect(result.loan.userId).toBe("u-member");
    expect(result.loan.copyId).toBe("c-1");
    expect(result.loan.dueAt).toBe(new Date("2026-08-15T00:00:00.000Z").toISOString());
    expect(result.loan.loanPeriodDays).toBe(14);
    expect(result.loan.dailyFineRate).toBe(5);
    expect(state.copies[0]!.status).toBe("borrowed");
    expect(auditRepo.records).toHaveLength(1);
    expect(auditRepo.records[0]).toMatchObject({
      userId: "u-librarian",
      action: "loan.created",
      entityType: "loan",
      entityId: result.loan.id,
    });
  });

  it("สมาชิกยืมได้ครบ max_active_loans → DomainForbiddenError", async () => {
    const state = buildState({
      loans: Array.from({ length: 5 }, (_, index) =>
        buildActiveLoan({ id: `loan-${index + 1}`, copyId: `c-${index + 10}` }),
      ),
    });
    const usecase = new CheckoutUsecase(createLoanRepository(state), createAuditRepository());

    await expect(
      usecase.execute({ command: { userId: "u-member", copyCode: "BK-001" }, now: NOW }),
    ).rejects.toThrowError(DomainForbiddenError);
  });

  it("มียอดค่าปรับค้างชำระเกิน max_unpaid_fine → DomainForbiddenError", async () => {
    const state = buildState({
      fines: [
        {
          id: "f-1",
          loanId: "loan-1",
          userId: "u-member",
          amount: 150,
          reason: "overdue",
          paid: false,
          waived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const usecase = new CheckoutUsecase(createLoanRepository(state), createAuditRepository());

    await expect(
      usecase.execute({ command: { userId: "u-member", copyCode: "BK-001" }, now: NOW }),
    ).rejects.toThrowError("มียอดค่าปรับค้างชำระเกินกำหนด");
  });

  it("สมาชิกถูกระงับ/ไม่พร้อมใช้บริการ → DomainForbiddenError", async () => {
    const state = buildState({
      members: [
        { id: "u-member", role: "student", memberType: "undergraduate", status: "suspended" },
      ],
    });
    const usecase = new CheckoutUsecase(createLoanRepository(state), createAuditRepository());

    await expect(
      usecase.execute({ command: { userId: "u-member", copyCode: "BK-001" }, now: NOW }),
    ).rejects.toThrowError(DomainForbiddenError);
  });

  it("สำเนาไม่พร้อมให้ยืม (ถูกยืมอยู่) → DomainConflictError", async () => {
    const state = buildState({
      copies: [
        {
          id: "c-1",
          bookId: "b-1",
          copyCode: "BK-001",
          status: "borrowed",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const usecase = new CheckoutUsecase(createLoanRepository(state), createAuditRepository());

    await expect(
      usecase.execute({ command: { userId: "u-member", copyCode: "BK-001" }, now: NOW }),
    ).rejects.toThrowError(DomainConflictError);
  });

  it("มี loan ที่ active อยู่แล้วบนสำเนาเดียวกัน → DomainConflictError", async () => {
    const state = buildState({
      loans: [buildActiveLoan({ copyId: "c-1" })],
    });
    const usecase = new CheckoutUsecase(createLoanRepository(state), createAuditRepository());

    await expect(
      usecase.execute({ command: { userId: "u-member", copyCode: "BK-001" }, now: NOW }),
    ).rejects.toThrowError(DomainConflictError);
  });

  it("ไม่พบสำเนา → DomainNotFoundError", async () => {
    const state = buildState({ copies: [] });
    const usecase = new CheckoutUsecase(createLoanRepository(state), createAuditRepository());

    await expect(
      usecase.execute({ command: { userId: "u-member", copyCode: "NOT-EXIST" }, now: NOW }),
    ).rejects.toThrowError(DomainNotFoundError);
  });

  it("ไม่พบสมาชิก → DomainNotFoundError", async () => {
    const state = buildState({ members: [] });
    const usecase = new CheckoutUsecase(createLoanRepository(state), createAuditRepository());

    await expect(
      usecase.execute({ command: { userId: "u-ghost", copyCode: "BK-001" }, now: NOW }),
    ).rejects.toThrowError(DomainNotFoundError);
  });
});
