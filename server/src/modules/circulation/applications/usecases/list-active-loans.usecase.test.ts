import { describe, expect, it } from "vitest";

import type { BorrowingPolicy, LoanRecord } from "../../../../shared";
import type { IMemberInfo, ILoanRepository } from "../ports/loan.repository";
import { ListActiveLoansUsecase } from "./list-active-loans.usecase";

const NOW = new Date("2026-08-06T00:00:00.000Z");

function createLoanRepository(
  loans: LoanRecord[],
  members: IMemberInfo[],
  policies: BorrowingPolicy[],
): ILoanRepository {
  return {
    listActiveLoansByUser: async (userId: string) =>
      loans.filter((loan) => loan.userId === userId && loan.status === "active"),
    findMemberById: async (userId: string) =>
      members.find((member) => member.id === userId) ?? null,
    findPoliciesByRole: async () => policies,
  } as unknown as ILoanRepository;
}

function buildLoan(overrides: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: "loan-1",
    copyId: "c-1",
    userId: "u-member",
    borrowedAt: "2026-07-01T00:00:00.000Z",
    dueAt: "2026-08-15T00:00:00.000Z",
    status: "active",
    renewedCount: 0,
    loanPeriodDays: 14,
    dailyFineRate: 5,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

const MEMBER: IMemberInfo = {
  id: "u-member",
  role: "student",
  memberType: "undergraduate",
  status: "active",
};

const POLICY: BorrowingPolicy = {
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
};

describe("ListActiveLoansUsecase", () => {
  it("คืนรายการยืม active พร้อมคำนวณ overdue/วันเกินตาม grace", async () => {
    const loans = [
      buildLoan({ id: "loan-1", copyId: "c-1", dueAt: "2026-08-01T00:00:00.000Z" }),
      buildLoan({ id: "loan-2", copyId: "c-2", dueAt: "2026-08-20T00:00:00.000Z" }),
    ];
    const repo = createLoanRepository(loans, [MEMBER], [POLICY]);
    const usecase = new ListActiveLoansUsecase(repo);

    const result = await usecase.execute({ query: { userId: "u-member" }, now: NOW });

    expect(result.loans).toHaveLength(2);
    expect(result.loans[0]!.overdue).toBe(true);
    expect(result.loans[0]!.daysOverdue).toBe(2);
    expect(result.loans[1]!.overdue).toBe(false);
    expect(result.loans[1]!.daysOverdue).toBe(0);
  });

  it("ไม่มีรายการ → คืนลิสต์ว่าง", async () => {
    const repo = createLoanRepository([], [MEMBER], [POLICY]);
    const usecase = new ListActiveLoansUsecase(repo);

    const result = await usecase.execute({ query: { userId: "u-member" }, now: NOW });

    expect(result.loans).toEqual([]);
  });

  it("ไม่พบสมาชิก → คืนลิสต์ว่าง (dashboard มองว่าไม่มี)", async () => {
    const loans = [buildLoan()];
    const repo = createLoanRepository(loans, [], [POLICY]);
    const usecase = new ListActiveLoansUsecase(repo);

    const result = await usecase.execute({ query: { userId: "u-ghost" }, now: NOW });

    expect(result.loans).toEqual([]);
  });
});
