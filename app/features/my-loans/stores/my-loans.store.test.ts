import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BorrowingPolicy, LoanRecord } from "@libsys/shared";

import type { MeProfile, MyLoanItem } from "../my-loans.types";

const mocks = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  fetchMyLoans: vi.fn(),
  renewMyLoan: vi.fn(),
}));

vi.mock("../actions/my-loans.action", () => ({
  fetchMyProfile: mocks.fetchMyProfile,
  fetchMyLoans: mocks.fetchMyLoans,
  renewMyLoan: mocks.renewMyLoan,
}));

import { useMyLoansStore } from "./my-loans.store";

function makeProfile(overrides: Partial<MeProfile> = {}): MeProfile {
  return {
    user: {
      id: "user-1",
      email: "somsri@example.ac.th",
      fullName: "สมศรี ใจดี",
      role: "student",
      memberType: "undergraduate",
      studentOrStaffId: "6501123456",
      phone: "0812345678",
      branchId: "branch-1",
      status: "active",
      createdAt: "2026-08-01T00:00:00",
      updatedAt: "2026-08-01T00:00:00",
    },
    policy: null,
    unpaidFineTotal: 0,
    activeLoanCount: 1,
    ...overrides,
  };
}

function makePolicy(overrides: Partial<BorrowingPolicy> = {}): BorrowingPolicy {
  return {
    id: "policy-1",
    role: "student",
    memberType: "undergraduate",
    maxActiveLoans: 5,
    loanPeriodDays: 14,
    maxRenewals: 1,
    gracePeriodDays: 0,
    dailyFineRate: 5,
    maxUnpaidFine: 200,
    createdAt: "2026-01-01T00:00:00",
    ...overrides,
  };
}

function makeLoan(overrides: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: "loan-1",
    copyId: "copy-1",
    userId: "user-1",
    borrowedAt: "2026-07-20T00:00:00",
    dueAt: "2026-08-03T00:00:00",
    status: "active",
    renewedCount: 0,
    loanPeriodDays: 14,
    dailyFineRate: 5,
    checkedOutBy: "user-1",
    createdAt: "2026-07-20T00:00:00",
    ...overrides,
  };
}

function makeLoanItem(overrides: Partial<MyLoanItem> = {}): MyLoanItem {
  return {
    loan: makeLoan(),
    bookId: "book-1",
    bookTitle: "แฮร์รี่ พอตเตอร์",
    bookCoverUrl: "https://example.com/cover.jpg",
    copyCode: "BK-001",
    overdue: false,
    daysOverdue: 0,
    canRenew: true,
    ...overrides,
  };
}

beforeEach(() => {
  useMyLoansStore.setState({
    profile: null,
    loans: [],
    isLoading: false,
    isError: false,
    errorMessage: null,
    renewingId: null,
    renewError: null,
  });
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

describe("my-loans.store — โหลดข้อมูล", () => {
  it("load โหลดโปรไฟล์ + รายการยืมพร้อมกัน", async () => {
    const profile = makeProfile({ policy: makePolicy() });
    const loans = [makeLoanItem()];
    mocks.fetchMyProfile.mockResolvedValue(profile);
    mocks.fetchMyLoans.mockResolvedValue(loans);

    await useMyLoansStore.getState().load();

    expect(mocks.fetchMyProfile).toHaveBeenCalledTimes(1);
    expect(mocks.fetchMyLoans).toHaveBeenCalledTimes(1);
    expect(useMyLoansStore.getState().profile).toEqual(profile);
    expect(useMyLoansStore.getState().loans).toEqual(loans);
    expect(useMyLoansStore.getState().isLoading).toBe(false);
    expect(useMyLoansStore.getState().isError).toBe(false);
  });

  it("load ล้มเหลว → isError true + errorMessage ภาษาไทย", async () => {
    mocks.fetchMyProfile.mockRejectedValue(new Error("ไม่สามารถโหลดข้อมูลการยืม"));

    await useMyLoansStore.getState().load();

    expect(useMyLoansStore.getState().isError).toBe(true);
    expect(useMyLoansStore.getState().errorMessage).toBe("ไม่สามารถโหลดข้อมูลการยืม");
    expect(useMyLoansStore.getState().isLoading).toBe(false);
  });
});

describe("my-loans.store — ต่ออายุ", () => {
  it("renew สำเร็จ → อัปเดต loan ในรายการ (due date ใหม่ + canRenew false)", async () => {
    const item = makeLoanItem();
    mocks.fetchMyLoans.mockResolvedValue([item]);
    await useMyLoansStore.getState().load();

    const renewedLoan = makeLoan({
      dueAt: "2026-08-17T00:00:00",
      renewedCount: 1,
    });
    mocks.renewMyLoan.mockResolvedValue({ loan: renewedLoan, dueDate: "2026-08-17T00:00:00" });

    const ok = await useMyLoansStore.getState().renew("loan-1");

    expect(ok).toBe(true);
    expect(mocks.renewMyLoan).toHaveBeenCalledWith("loan-1");
    expect(useMyLoansStore.getState().loans[0].loan).toEqual(renewedLoan);
    expect(useMyLoansStore.getState().renewingId).toBeNull();
    expect(useMyLoansStore.getState().renewError).toBeNull();
  });

  it("renew ล้มเหลว → คืน false + เก็บ errorMessage", async () => {
    mocks.fetchMyLoans.mockResolvedValue([makeLoanItem()]);
    await useMyLoansStore.getState().load();

    mocks.renewMyLoan.mockRejectedValue(new Error("มีคิวจองรออยู่ ไม่สามารถต่ออายุได้"));

    const ok = await useMyLoansStore.getState().renew("loan-1");

    expect(ok).toBe(false);
    expect(useMyLoansStore.getState().renewError).toBe("มีคิวจองรออยู่ ไม่สามารถต่ออายุได้");
    expect(useMyLoansStore.getState().loans[0].loan.dueAt).toBe("2026-08-03T00:00:00");
  });

  it("renew ระหว่างดำเนินการ → renewingId ถูกตั้ง", async () => {
    mocks.fetchMyLoans.mockResolvedValue([makeLoanItem()]);
    await useMyLoansStore.getState().load();

    let resolveRenew: (value: { loan: LoanRecord; dueDate: string }) => void = () => undefined;
    mocks.renewMyLoan.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRenew = resolve;
        }),
    );

    const pending = useMyLoansStore.getState().renew("loan-1");
    expect(useMyLoansStore.getState().renewingId).toBe("loan-1");

    resolveRenew({ loan: makeLoan({ renewedCount: 1 }), dueDate: "2026-08-17T00:00:00" });
    await pending;

    expect(useMyLoansStore.getState().renewingId).toBeNull();
  });
});

describe("my-loans.store — reset", () => {
  it("reset กลับสู่ค่าเริ่มต้น", async () => {
    mocks.fetchMyProfile.mockResolvedValue(makeProfile());
    mocks.fetchMyLoans.mockResolvedValue([makeLoanItem()]);
    await useMyLoansStore.getState().load();

    useMyLoansStore.getState().reset();

    expect(useMyLoansStore.getState().profile).toBeNull();
    expect(useMyLoansStore.getState().loans).toEqual([]);
    expect(useMyLoansStore.getState().renewError).toBeNull();
  });
});
