import { describe, expect, it } from "vitest";

import { DomainForbiddenError, DomainNotFoundError } from "../../../../domains/errors";
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
import { RenewUsecase } from "./renew.usecase";

const NOW = new Date("2026-08-06T00:00:00.000Z");

interface LoanRepoState {
  members: IMemberInfo[];
  policies: BorrowingPolicy[];
  copies: BookCopy[];
  loans: LoanRecord[];
  fines: FineRecord[];
  hasReservation: boolean;
  nextId: number;
}

function createLoanRepository(state: LoanRepoState): ILoanRepository {
  return {
    findMemberById: async (userId) => state.members.find((member) => member.id === userId) ?? null,
    findPoliciesByRole: async () => state.policies,
    findCopyByCode: async () => null,
    findCopyById: async (copyId) => state.copies.find((copy) => copy.id === copyId) ?? null,
    updateCopyStatus: async () => {},
    countActiveLoansByUser: async () => 0,
    findActiveLoanByCopy: async () => null,
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
    getSystemSetting: async () => 7,
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
        dueAt: "2026-08-15T00:00:00.000Z",
        status: "active",
        renewedCount: 1,
        loanPeriodDays: 14,
        dailyFineRate: 5,
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ],
    fines: [],
    hasReservation: false,
    nextId: 100,
    ...overrides,
  };
}

describe("RenewUsecase", () => {
  it("ต่ออายุสำเร็จ → dueAt ขยายอีก loan_period_days และ renewedCount เพิ่มขึ้น", async () => {
    const state = buildState();
    const auditRepo = createAuditRepository();
    const usecase = new RenewUsecase(createLoanRepository(state), auditRepo);

    const result = await usecase.execute({
      command: { id: "loan-1" },
      actorId: "u-librarian",
    });

    expect(result.loan.renewedCount).toBe(2);
    expect(result.loan.dueAt).toBe(new Date("2026-08-29T00:00:00.000Z").toISOString());
    expect(result.dueDate).toBe(result.loan.dueAt);
    expect(auditRepo.records[0]).toMatchObject({
      action: "loan.renewed",
      entityType: "loan",
      entityId: "loan-1",
    });
  });

  it("ต่ออายุเกินจำนวนครั้งสูงสุด → DomainForbiddenError", async () => {
    const state = buildState({
      loans: [
        {
          id: "loan-1",
          copyId: "c-1",
          userId: "u-member",
          borrowedAt: "2026-07-01T00:00:00.000Z",
          dueAt: "2026-08-15T00:00:00.000Z",
          status: "active",
          renewedCount: 3,
          loanPeriodDays: 14,
          dailyFineRate: 5,
          createdAt: "2026-07-01T00:00:00.000Z",
        },
      ],
    });
    const usecase = new RenewUsecase(createLoanRepository(state), createAuditRepository());

    await expect(usecase.execute({ command: { id: "loan-1" } })).rejects.toThrowError(
      DomainForbiddenError,
    );
  });

  it("มีคิวจอง active บนหนังสือ → DomainForbiddenError", async () => {
    const state = buildState({ hasReservation: true });
    const usecase = new RenewUsecase(createLoanRepository(state), createAuditRepository());

    await expect(usecase.execute({ command: { id: "loan-1" } })).rejects.toThrowError(
      DomainForbiddenError,
    );
  });

  it("ไม่พบ loan ที่ active → DomainNotFoundError", async () => {
    const state = buildState({ loans: [] });
    const usecase = new RenewUsecase(createLoanRepository(state), createAuditRepository());

    await expect(usecase.execute({ command: { id: "loan-ghost" } })).rejects.toThrowError(
      DomainNotFoundError,
    );
  });
});
