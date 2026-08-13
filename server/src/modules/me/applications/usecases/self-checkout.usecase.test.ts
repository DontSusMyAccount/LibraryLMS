import { describe, expect, it, vi } from "vitest";

import { DomainConflictError, DomainForbiddenError } from "../../../../domains/errors";
import type { LoanRecord } from "../../../../shared";
import type { ISelfCheckoutPort } from "../ports/self-checkout.port";
import { SelfCheckoutUsecase } from "./self-checkout.usecase";

const NOW = new Date("2026-08-20T00:00:00.000Z");

function buildLoan(): LoanRecord {
  return {
    id: "loan-1",
    copyId: "c-1",
    userId: "u-1",
    borrowedAt: NOW.toISOString(),
    dueAt: "2026-09-03T00:00:00.000Z",
    status: "active",
    renewedCount: 0,
    loanPeriodDays: 14,
    dailyFineRate: 5,
    checkedOutBy: "u-1",
    createdAt: NOW.toISOString(),
  };
}

describe("SelfCheckoutUsecase", () => {
  it("ยืมสำเร็จ — ส่ง userId จาก context + actorId = ตัวเอง (checked_out_by = ตัวเอง)", async () => {
    const checkoutUsecase = {
      execute: vi.fn(async () => ({ loan: buildLoan(), dueDate: "2026-09-03T00:00:00.000Z" })),
    } as unknown as ISelfCheckoutPort;

    const usecase = new SelfCheckoutUsecase(checkoutUsecase);
    const result = await usecase.execute({
      command: { copyCode: "BK-001", userId: "u-1" },
      actorId: "u-1",
      now: NOW,
    });

    expect(result.loan.userId).toBe("u-1");
    expect(result.dueDate).toBe("2026-09-03T00:00:00.000Z");
    expect(checkoutUsecase.execute).toHaveBeenCalledWith({
      command: { copyCode: "BK-001", userId: "u-1" },
      actorId: "u-1",
      now: NOW,
    });
  });

  it("สมาชิกถูกระงับ → ส่งต่อ DomainForbiddenError จาก CheckoutUsecase", async () => {
    const checkoutUsecase = {
      execute: vi.fn(async () => {
        throw new DomainForbiddenError("ไม่สามารถยืมได้ เนื่องจากสมาชิกถูกระงับสิทธิ์การใช้งาน");
      }),
    } as unknown as ISelfCheckoutPort;

    const usecase = new SelfCheckoutUsecase(checkoutUsecase);
    await expect(
      usecase.execute({ command: { copyCode: "BK-001", userId: "u-1" }, actorId: "u-1" }),
    ).rejects.toThrowError(DomainForbiddenError);
  });

  it("สำเนาไม่ว่าง → ส่งต่อ DomainConflictError", async () => {
    const checkoutUsecase = {
      execute: vi.fn(async () => {
        throw new DomainConflictError("สำเนาหนังสือนี้ไม่พร้อมให้ยืม");
      }),
    } as unknown as ISelfCheckoutPort;

    const usecase = new SelfCheckoutUsecase(checkoutUsecase);
    await expect(
      usecase.execute({ command: { copyCode: "BK-001", userId: "u-1" }, actorId: "u-1" }),
    ).rejects.toThrowError(DomainConflictError);
  });
});
