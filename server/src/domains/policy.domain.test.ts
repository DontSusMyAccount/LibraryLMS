import { describe, expect, it } from "vitest";

import type { BorrowingPolicy } from "../shared";
import { resolvePolicyByRole, snapshotPolicy } from "./policy.domain";

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

describe("resolvePolicyByRole", () => {
  it("เจอ policy ที่ตรงทั้ง (role, memberType)", () => {
    const policies = [
      buildPolicy({
        id: "p-student-ug",
        role: "student",
        memberType: "undergraduate",
      }),
      buildPolicy({ id: "p-student-general", role: "student", memberType: "general" }),
    ];

    expect(resolvePolicyByRole(policies, "student", "undergraduate")?.id).toBe("p-student-ug");
  });

  it("ไม่มี memberType ตรง → fallback เป็น (role, general)", () => {
    const policies = [
      buildPolicy({ id: "p-student-general", role: "student", memberType: "general" }),
    ];

    expect(resolvePolicyByRole(policies, "student", "undergraduate")?.id).toBe("p-student-general");
  });

  it("ไม่มี policy ของ role นี้เลย → null", () => {
    expect(resolvePolicyByRole([buildPolicy()], "staff", "general")).toBeNull();
  });
});

describe("snapshotPolicy", () => {
  it("สแนปชอต loanPeriodDays + dailyFineRate ตาม policy ตอนยืม", () => {
    expect(snapshotPolicy(buildPolicy({ loanPeriodDays: 21, dailyFineRate: 7.5 }))).toEqual({
      loanPeriodDays: 21,
      dailyFineRate: 7.5,
    });
  });
});
