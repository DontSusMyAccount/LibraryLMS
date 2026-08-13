import { describe, expect, it, vi } from "vitest";

import { DomainForbiddenError, DomainNotFoundError } from "../../../../domains/errors";
import type { LoanRecord } from "../../../../shared";
import type { ILoanRepository } from "../../../circulation/applications/ports/loan.repository";
import type { RenewUsecase } from "../../../circulation/applications/usecases/renew.usecase";
import { RenewMyLoanUsecase } from "./renew-my-loan.usecase";

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

describe("RenewMyLoanUsecase", () => {
  it("เป็นเจ้าของ loan → ต่ออายุผ่าน RenewUsecase (ส่ง id + actorId = user.id)", async () => {
    const loanRepo: ILoanRepository = {
      findActiveLoanById: async (id: string) => (id === "loan-1" ? buildLoan() : null),
    } as unknown as ILoanRepository;
    const renewUsecase = {
      execute: vi.fn(async () => ({
        loan: buildLoan({ dueAt: "2026-08-29T00:00:00.000Z", renewedCount: 1 }),
        dueDate: "2026-08-29T00:00:00.000Z",
      })),
    } as unknown as RenewUsecase;

    const usecase = new RenewMyLoanUsecase(loanRepo, renewUsecase);
    const result = await usecase.execute({ command: { id: "loan-1", userId: "u-1" } });

    expect(result.dueDate).toBe("2026-08-29T00:00:00.000Z");
    expect(renewUsecase.execute).toHaveBeenCalledWith({
      command: { id: "loan-1" },
      actorId: "u-1",
    });
  });

  it("loan ไม่ใช่ของตัวเอง → DomainForbiddenError และไม่เรียก RenewUsecase", async () => {
    const loanRepo: ILoanRepository = {
      findActiveLoanById: async () => buildLoan({ userId: "u-999" }),
    } as unknown as ILoanRepository;

    const renewUsecase = { execute: vi.fn() } as unknown as RenewUsecase;

    const usecase = new RenewMyLoanUsecase(loanRepo, renewUsecase);
    await expect(
      usecase.execute({ command: { id: "loan-1", userId: "u-1" } }),
    ).rejects.toThrowError(DomainForbiddenError);
    expect(renewUsecase.execute).not.toHaveBeenCalled();
  });

  it("ไม่พบ loan → DomainNotFoundError", async () => {
    const loanRepo: ILoanRepository = {
      findActiveLoanById: async () => null,
    } as unknown as ILoanRepository;

    const renewUsecase = { execute: vi.fn() } as unknown as RenewUsecase;

    const usecase = new RenewMyLoanUsecase(loanRepo, renewUsecase);
    await expect(
      usecase.execute({ command: { id: "loan-ghost", userId: "u-1" } }),
    ).rejects.toThrowError(DomainNotFoundError);
  });
});
