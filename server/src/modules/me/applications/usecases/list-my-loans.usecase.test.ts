import { describe, expect, it } from "vitest";

import type { BorrowingPolicy, LoanRecord } from "../../../../shared";
import type { ILoanRepository } from "../../../circulation/applications/ports/loan.repository";
import type { IMeRepository } from "../../applications/ports/me.repository";
import { ListMyLoansUsecase } from "./list-my-loans.usecase";

const NOW = new Date("2026-08-20T00:00:00.000Z");

function buildLoan(overrides: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: "loan-1",
    copyId: "c-1",
    userId: "u-1",
    borrowedAt: "2026-08-01T00:00:00.000Z",
    dueAt: "2026-08-15T00:00:00.000Z",
    status: "active",
    renewedCount: 0,
    loanPeriodDays: 14,
    dailyFineRate: 5,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildPolicy(overrides: Partial<BorrowingPolicy> = {}): BorrowingPolicy {
  return {
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
    ...overrides,
  };
}

describe("ListMyLoansUsecase", () => {
  it("คืนรายการยืมของตัวเองพร้อมชื่อหนังสือ + overdue + canRenew", async () => {
    const meRepo: IMeRepository = {
      listLoansByUser: async () => [
        {
          loan: buildLoan({ dueAt: "2026-08-10T00:00:00.000Z" }), // เกิน grace (3 วัน) → overdue
          bookId: "b-1",
          bookTitle: "ทดสอบภาษาไทย",
          bookCoverUrl: "https://covers/x.jpg",
          copyCode: "BK-001",
        },
        {
          loan: buildLoan({ id: "loan-2", dueAt: "2026-08-25T00:00:00.000Z" }), // ยังไม่เกิน
          bookId: "b-2",
          bookTitle: "เล่มสอง",
          copyCode: "BK-002",
        },
      ],
      listReservationsByUser: async () => [],
      listFinesByUser: async () => [],
    };
    const loanRepo: ILoanRepository = {
      findMemberById: async () => ({
        id: "u-1",
        role: "student",
        memberType: "undergraduate",
        status: "active",
      }),
      findPoliciesByRole: async () => [buildPolicy()],
      hasActiveReservation: async () => false,
    } as unknown as ILoanRepository;

    const usecase = new ListMyLoansUsecase(meRepo, loanRepo);
    const result = await usecase.execute({ query: { userId: "u-1" }, now: NOW });

    expect(result.loans).toHaveLength(2);
    expect(result.loans[0]!.bookTitle).toBe("ทดสอบภาษาไทย");
    expect(result.loans[0]!.overdue).toBe(true);
    expect(result.loans[0]!.daysOverdue).toBeGreaterThan(0);
    expect(result.loans[0]!.canRenew).toBe(true);
    expect(result.loans[1]!.overdue).toBe(false);
  });

  it("renewedCount ถึง maxRenewals → canRenew = false", async () => {
    const meRepo: IMeRepository = {
      listLoansByUser: async () => [
        {
          loan: buildLoan({ renewedCount: 2 }),
          bookId: "b-1",
          bookTitle: "เล่ม",
          copyCode: "BK-001",
        },
      ],
      listReservationsByUser: async () => [],
      listFinesByUser: async () => [],
    };
    const loanRepo: ILoanRepository = {
      findMemberById: async () => ({
        id: "u-1",
        role: "student",
        memberType: "undergraduate",
        status: "active",
      }),
      findPoliciesByRole: async () => [buildPolicy({ maxRenewals: 2 })],
      hasActiveReservation: async () => false,
    } as unknown as ILoanRepository;

    const usecase = new ListMyLoansUsecase(meRepo, loanRepo);
    const result = await usecase.execute({ query: { userId: "u-1" }, now: NOW });

    expect(result.loans[0]!.canRenew).toBe(false);
  });

  it("มีคิวจองหนังสือ → canRenew = false (ต่ออายุไม่ได้)", async () => {
    const meRepo: IMeRepository = {
      listLoansByUser: async () => [
        {
          loan: buildLoan(),
          bookId: "b-1",
          bookTitle: "เล่ม",
          copyCode: "BK-001",
        },
      ],
      listReservationsByUser: async () => [],
      listFinesByUser: async () => [],
    };
    const loanRepo: ILoanRepository = {
      findMemberById: async () => ({
        id: "u-1",
        role: "student",
        memberType: "undergraduate",
        status: "active",
      }),
      findPoliciesByRole: async () => [buildPolicy()],
      hasActiveReservation: async () => true,
    } as unknown as ILoanRepository;

    const usecase = new ListMyLoansUsecase(meRepo, loanRepo);
    const result = await usecase.execute({ query: { userId: "u-1" }, now: NOW });

    expect(result.loans[0]!.canRenew).toBe(false);
  });

  it("ไม่มีรายการ → คืน array ว่าง", async () => {
    const meRepo: IMeRepository = {
      listLoansByUser: async () => [],
      listReservationsByUser: async () => [],
      listFinesByUser: async () => [],
    };
    const loanRepo: ILoanRepository = {
      findMemberById: async () => null,
      findPoliciesByRole: async () => [],
      hasActiveReservation: async () => false,
    } as unknown as ILoanRepository;

    const usecase = new ListMyLoansUsecase(meRepo, loanRepo);
    const result = await usecase.execute({ query: { userId: "u-1" }, now: NOW });

    expect(result.loans).toEqual([]);
  });
});
