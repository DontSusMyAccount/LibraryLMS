import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LoanRecord } from "@libsys/shared";

import type { ActiveLoanItem } from "@/app/features/circulation/circulation.types";
import { LoanActions } from "./loan-actions";

function makeLoan(overrides: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: "loan-1",
    copyId: "copy-1",
    userId: "user-1",
    borrowedAt: "2026-08-01T00:00:00",
    dueAt: "2026-08-15T00:00:00",
    status: "active",
    renewedCount: 0,
    loanPeriodDays: 14,
    dailyFineRate: 5,
    createdAt: "2026-08-01T00:00:00",
    ...overrides,
  };
}

function makeLoanItem(overrides: Partial<ActiveLoanItem> = {}): ActiveLoanItem {
  return {
    loan: makeLoan(),
    overdue: false,
    daysOverdue: 0,
    hasActiveReservation: false,
    ...overrides,
  };
}

function renderLoanActions(errorMessage: string | null) {
  return render(
    <LoanActions
      loans={[makeLoanItem()]}
      maxRenewals={2}
      isLoansLoading={false}
      isBusy={false}
      canRenew={() => true}
      onRenew={vi.fn()}
      onRecall={vi.fn()}
      errorMessage={errorMessage}
    />,
  );
}

describe("LoanActions", () => {
  it("มี errorMessage → แสดง alert ไทยใน tab รายการยืมค้าง", () => {
    const { container } = renderLoanActions(
      "ไม่สามารถต่ออายุได้ เนื่องจากมีคิวจองหนังสือเล่มนี้อยู่",
    );

    const alert = container.querySelector("[data-slot='loan-actions-error']");
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("ไม่สามารถต่ออายุได้ เนื่องจากมีคิวจองหนังสือเล่มนี้อยู่");
  });

  it("ไม่มี errorMessage → ไม่แสดง alert", () => {
    const { container } = renderLoanActions(null);

    expect(container.querySelector("[data-slot='loan-actions-error']")).toBeNull();
  });
});
