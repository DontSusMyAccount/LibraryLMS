import { describe, expect, it } from "vitest";

import { DomainNotFoundError } from "../../../../domains/errors";
import type { BorrowingPolicy, UserRecord } from "../../../../shared";
import type { ILoanRepository } from "../../../circulation/applications/ports/loan.repository";
import type { IUserRepository } from "../../../users/applications/ports/user.repository";
import { GetMeUsecase } from "./get-me.usecase";

function buildUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "u-1",
    email: "student@x.ac.th",
    passwordHash: "hash",
    fullName: "นิสิตทดสอบ",
    role: "student",
    memberType: "undergraduate",
    studentOrStaffId: "610012345",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
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

describe("GetMeUsecase", () => {
  it("คืน profile + policy + ยอดค่าปรับค้าง + จำนวนยืม active (ตัด passwordHash)", async () => {
    const userRepo: IUserRepository = {
      findById: async (id) => (id === "u-1" ? buildUser() : null),
      findByEmail: async () => null,
      findByStudentOrStaffId: async () => null,
      searchByKeyword: async () => ({ data: [], total: 0, page: 1, limit: 12, totalPages: 0 }),
      branchExists: async () => false,
      create: async () => buildUser(),
      update: async () => buildUser(),
    };
    const loanRepo: ILoanRepository = {
      findMemberById: async () => ({
        id: "u-1",
        role: "student",
        memberType: "undergraduate",
        status: "active",
      }),
      findPoliciesByRole: async () => [buildPolicy()],
      sumUnpaidFinesByUser: async () => 25,
      countActiveLoansByUser: async () => 2,
    } as unknown as ILoanRepository;

    const usecase = new GetMeUsecase(userRepo, loanRepo);
    const result = await usecase.execute({ query: { userId: "u-1" } });

    expect(result.user.id).toBe("u-1");
    expect(result.user.role).toBe("student");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.policy?.maxActiveLoans).toBe(5);
    expect(result.unpaidFineTotal).toBe(25);
    expect(result.activeLoanCount).toBe(2);
  });

  it("policy ไม่พบ → คืน policy = null (ยังคืน profile ได้)", async () => {
    const userRepo: IUserRepository = {
      findById: async () => buildUser(),
      findByEmail: async () => null,
      findByStudentOrStaffId: async () => null,
      searchByKeyword: async () => ({ data: [], total: 0, page: 1, limit: 12, totalPages: 0 }),
      branchExists: async () => false,
      create: async () => buildUser(),
      update: async () => buildUser(),
    };
    const loanRepo: ILoanRepository = {
      findMemberById: async () => ({
        id: "u-1",
        role: "student",
        memberType: "undergraduate",
        status: "active",
      }),
      findPoliciesByRole: async () => [],
      sumUnpaidFinesByUser: async () => 0,
      countActiveLoansByUser: async () => 0,
    } as unknown as ILoanRepository;

    const usecase = new GetMeUsecase(userRepo, loanRepo);
    const result = await usecase.execute({ query: { userId: "u-1" } });

    expect(result.policy).toBeNull();
  });

  it("ไม่พบผู้ใช้ → DomainNotFoundError", async () => {
    const userRepo: IUserRepository = {
      findById: async () => null,
      findByEmail: async () => null,
      findByStudentOrStaffId: async () => null,
      searchByKeyword: async () => ({ data: [], total: 0, page: 1, limit: 12, totalPages: 0 }),
      branchExists: async () => false,
      create: async () => buildUser(),
      update: async () => buildUser(),
    };
    const loanRepo = {} as unknown as ILoanRepository;

    const usecase = new GetMeUsecase(userRepo, loanRepo);
    await expect(usecase.execute({ query: { userId: "u-ghost" } })).rejects.toThrowError(
      DomainNotFoundError,
    );
  });
});
