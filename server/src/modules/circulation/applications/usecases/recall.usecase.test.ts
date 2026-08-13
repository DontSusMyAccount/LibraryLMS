import { describe, expect, it } from "vitest";

import { DomainNotFoundError } from "../../../../domains/errors";
import type { AuditLog, BookCopy, FineRecord, LoanRecord } from "../../../../shared";
import type { IAuditRepository } from "../../../shared/applications/ports/audit.repository";
import type {
  ICreateFineInput,
  ICreateLoanInput,
  ILoanRepository,
  IReturnLoanInput,
} from "../ports/loan.repository";
import { RecallUsecase } from "./recall.usecase";

const NOW = new Date("2026-08-05T00:00:00.000Z");

interface LoanRepoState {
  loans: LoanRecord[];
  copies: BookCopy[];
  fines: FineRecord[];
  recallBufferDays: number;
  nextId: number;
}

function createLoanRepository(state: LoanRepoState): ILoanRepository {
  return {
    findMemberById: async () => null,
    findPoliciesByRole: async () => [],
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
    updateRenewal: async () => null,
    recallLoan: async (id, input) => {
      const loan = state.loans.find((item) => item.id === id);
      if (!loan) return null;
      loan.dueAt = input.dueAt;
      loan.recalledAt = input.recalledAt;
      return loan;
    },
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
    hasActiveReservation: async () => false,
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
    loans: [
      {
        id: "loan-1",
        copyId: "c-1",
        userId: "u-member",
        borrowedAt: "2026-07-01T00:00:00.000Z",
        dueAt: "2026-08-20T00:00:00.000Z",
        status: "active",
        renewedCount: 0,
        loanPeriodDays: 14,
        dailyFineRate: 5,
        createdAt: "2026-07-01T00:00:00.000Z",
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
    fines: [],
    recallBufferDays: 7,
    nextId: 100,
    ...overrides,
  };
}

describe("RecallUsecase", () => {
  it("recall สำเร็จ → dueAt ย่นเหลือ now + recall buffer และตั้ง recalled_at", async () => {
    const state = buildState();
    const auditRepo = createAuditRepository();
    const usecase = new RecallUsecase(createLoanRepository(state), auditRepo);

    const result = await usecase.execute({
      command: { id: "loan-1" },
      actorId: "u-librarian",
      now: NOW,
    });

    expect(result.loan.dueAt).toBe(new Date("2026-08-12T00:00:00.000Z").toISOString());
    expect(result.loan.recalledAt).toBe(NOW.toISOString());
    expect(result.dueDate).toBe(result.loan.dueAt);
    expect(auditRepo.records[0]).toMatchObject({
      action: "loan.recalled",
      entityType: "loan",
      entityId: "loan-1",
    });
  });

  it("ไม่พบ loan ที่ active → DomainNotFoundError", async () => {
    const state = buildState({ loans: [] });
    const usecase = new RecallUsecase(createLoanRepository(state), createAuditRepository());

    await expect(usecase.execute({ command: { id: "loan-ghost" }, now: NOW })).rejects.toThrowError(
      DomainNotFoundError,
    );
  });
});
