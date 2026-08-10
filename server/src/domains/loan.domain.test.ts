import { addDays } from "date-fns";
import { describe, expect, it } from "vitest";

import { DomainForbiddenError } from "./errors";
import { calcDueDate, calculateFine, isOverdue, recallLoan, renewLoan } from "./loan.domain";

const baseDue = new Date("2026-08-01T00:00:00.000Z");

function loanWithRenews(renewedCount: number): { dueAt: Date; renewedCount: number } {
  return { dueAt: baseDue, renewedCount };
}

const policyMax2 = { loanPeriodDays: 14, maxRenewals: 2 };

describe("calcDueDate", () => {
  it("due date = borrowed_at + loan_period_days ตาม policy role", () => {
    const borrowed = new Date("2026-08-01T00:00:00.000Z");
    const dueDate = calcDueDate(borrowed, { loanPeriodDays: 14 });

    expect(dueDate).toEqual(addDays(borrowed, 14));
  });
});

describe("renewLoan", () => {
  it("renew ครั้งที่ max_renewals+1 → DomainForbiddenError (ต่อได้ถึง maxRenewals ครั้งพอดี)", () => {
    expect(() => renewLoan(loanWithRenews(1), policyMax2, false)).not.toThrow();
    expect(() => renewLoan(loanWithRenews(2), policyMax2, false)).toThrowError(
      DomainForbiddenError,
    );
    expect(() => renewLoan(loanWithRenews(2), policyMax2, true)).toThrowError(DomainForbiddenError);
  });

  it("ต่ออายุได้ → dueAt ขยายอีก loan_period_days และ renewedCount เพิ่มขึ้น 1", () => {
    const result = renewLoan(loanWithRenews(1), { ...policyMax2, maxRenewals: 3 }, false);

    expect(result.dueAt).toEqual(addDays(baseDue, policyMax2.loanPeriodDays));
    expect(result.renewedCount).toBe(2);
  });

  it("renewedCount เกิน maxRenewals → DomainForbiddenError", () => {
    expect(() => renewLoan(loanWithRenews(3), policyMax2, false)).toThrowError(
      DomainForbiddenError,
    );
  });
});

describe("isOverdue", () => {
  const dueAt = new Date("2026-08-10T00:00:00.000Z");

  it("ยังไม่ถึง due_at → ไม่ overdue", () => {
    expect(isOverdue(new Date("2026-08-09T23:00:00.000Z"), dueAt, 3)).toBe(false);
  });

  it("เกิน due_at แล้ว แต่ยังอยู่ใน grace_period_days → ไม่ overdue", () => {
    expect(isOverdue(new Date("2026-08-13T00:00:00.000Z"), dueAt, 3)).toBe(false);
  });

  it("overdue = เกิน due_at + grace_period_days", () => {
    expect(isOverdue(new Date("2026-08-14T00:00:00.000Z"), dueAt, 3)).toBe(true);
  });
});

describe("calculateFine", () => {
  const dueAt = new Date("2026-08-10T00:00:00.000Z");

  it("ยังอยู่ใน grace_period_days → ค่าปรับ 0", () => {
    expect(
      calculateFine({
        now: new Date("2026-08-12T00:00:00.000Z"),
        dueAt,
        gracePeriodDays: 3,
        dailyFineRate: 5,
      }),
    ).toBe(0);
  });

  it("เกิน grace → daily_fine_rate × จำนวนวันที่เกิน", () => {
    expect(
      calculateFine({
        now: new Date("2026-08-15T00:00:00.000Z"),
        dueAt,
        gracePeriodDays: 3,
        dailyFineRate: 5,
      }),
    ).toBe(10);
  });
});

describe("recallLoan", () => {
  it("recall ย่น due date เหลือ now + recall buffer days", () => {
    const now = new Date("2026-08-05T00:00:00.000Z");
    const loan = { dueAt: new Date("2026-08-20T00:00:00.000Z") };

    expect(recallLoan({ loan, now, recallBufferDays: 7 })).toEqual(addDays(now, 7));
  });

  it("due date ปัจจุบันสั้นกว่า now + recall buffer แล้ว → คงเดิม (ไม่ขยาย)", () => {
    const now = new Date("2026-08-15T00:00:00.000Z");
    const loan = { dueAt: new Date("2026-08-16T00:00:00.000Z") };

    expect(recallLoan({ loan, now, recallBufferDays: 7 })).toEqual(loan.dueAt);
  });
});
