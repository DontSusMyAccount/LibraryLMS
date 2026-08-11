import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CheckoutResult, LoanRecord, UserPublic } from "@libsys/shared";

import type { ActiveLoanItem, MemberCardData } from "../circulation.types";

const mocks = vi.hoisted(() => ({
  searchMembers: vi.fn(),
  loadActiveLoans: vi.fn(),
  fetchMemberFinesTotal: vi.fn(),
  fetchMemberMaxRenewals: vi.fn(),
  checkout: vi.fn(),
  checkin: vi.fn(),
  renew: vi.fn(),
  recall: vi.fn(),
}));

vi.mock("../actions/circulation.action", () => ({
  searchMembers: mocks.searchMembers,
  loadActiveLoans: mocks.loadActiveLoans,
  fetchMemberFinesTotal: mocks.fetchMemberFinesTotal,
  fetchMemberMaxRenewals: mocks.fetchMemberMaxRenewals,
  checkout: mocks.checkout,
  checkin: mocks.checkin,
  renew: mocks.renew,
  recall: mocks.recall,
}));

import { initialCirculationState, useCirculationStore } from "./circulation.store";

function makeUser(overrides: Partial<UserPublic> = {}): UserPublic {
  return {
    id: "user-1",
    email: "somchai@example.com",
    fullName: "สมชาย ใจดี",
    role: "student",
    memberType: "undergraduate",
    studentOrStaffId: "6401001",
    status: "active",
    createdAt: "2026-08-01T00:00:00",
    updatedAt: "2026-08-01T00:00:00",
    ...overrides,
  };
}

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

beforeEach(() => {
  useCirculationStore.setState({ ...initialCirculationState });
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

describe("circulation.store — ค้นหาสมาชิกและการ์ดสมาชิก", () => {
  it("searchMember เก็บผลการค้นหาจาก action", async () => {
    mocks.searchMembers.mockResolvedValue([
      makeUser(),
      makeUser({ id: "user-2", fullName: "สมศรี รักดี", studentOrStaffId: "6401002" }),
    ]);

    await useCirculationStore.getState().searchMember("สม");

    expect(mocks.searchMembers).toHaveBeenCalledWith("สม");
    expect(useCirculationStore.getState().searchResults).toHaveLength(2);
    expect(useCirculationStore.getState().isSearching).toBe(false);
  });

  it("selectMember สร้างการ์ดสมาชิกพร้อม ยืมอยู่/ค้างส่ง/ค่าปรับ/สถานะระงับ", async () => {
    mocks.loadActiveLoans.mockResolvedValue([
      makeLoanItem(),
      makeLoanItem({ loan: makeLoan({ id: "loan-2" }), overdue: true, daysOverdue: 3 }),
    ]);
    mocks.fetchMemberFinesTotal.mockResolvedValue(50);
    mocks.fetchMemberMaxRenewals.mockResolvedValue(2);

    await useCirculationStore.getState().selectMember(makeUser());

    const member: MemberCardData | null = useCirculationStore.getState().selectedMember;
    expect(member?.user.fullName).toBe("สมชาย ใจดี");
    expect(member?.activeLoansCount).toBe(2);
    expect(member?.overdueCount).toBe(1);
    expect(member?.finesTotal).toBe(50);
    expect(member?.isSuspended).toBe(false);
    expect(member?.maxRenewals).toBe(2);
    expect(useCirculationStore.getState().activeLoans).toHaveLength(2);
  });

  it("selectMember สมาชิกที่ถูกระงับ → isSuspended = true", async () => {
    mocks.loadActiveLoans.mockResolvedValue([]);
    mocks.fetchMemberFinesTotal.mockResolvedValue(0);
    mocks.fetchMemberMaxRenewals.mockResolvedValue(2);

    await useCirculationStore.getState().selectMember(makeUser({ status: "suspended" }));

    expect(useCirculationStore.getState().selectedMember?.isSuspended).toBe(true);
  });
});

describe("circulation.store — ตะกร้ายืม", () => {
  it("addCopyCode เพิ่มรหัสสำเนาเข้าตะกร้า", () => {
    useCirculationStore.getState().addCopyCode("C-001");
    useCirculationStore.getState().addCopyCode("C-002");

    expect(useCirculationStore.getState().cart).toEqual([
      { copyCode: "C-001", error: null },
      { copyCode: "C-002", error: null },
    ]);
  });

  it("addCopyCode ไม่เพิ่มรหัสซ้ำ", () => {
    useCirculationStore.getState().addCopyCode("C-001");
    useCirculationStore.getState().addCopyCode("C-001");

    expect(useCirculationStore.getState().cart).toHaveLength(1);
  });

  it("removeCopyCode ลบรายการออกจากตะกร้า", () => {
    useCirculationStore.getState().addCopyCode("C-001");
    useCirculationStore.getState().addCopyCode("C-002");
    useCirculationStore.getState().removeCopyCode("C-001");

    expect(useCirculationStore.getState().cart).toEqual([{ copyCode: "C-002", error: null }]);
  });
});

describe("circulation.store — ยืมหนังสือ", () => {
  it("checkout สำเร็จ → ตั้ง due-date stamp + toast 'ยืมสำเร็จ ✓ กำหนดคืน <date>'", async () => {
    mocks.loadActiveLoans.mockResolvedValue([makeLoanItem()]);
    mocks.fetchMemberFinesTotal.mockResolvedValue(0);
    mocks.fetchMemberMaxRenewals.mockResolvedValue(2);
    await useCirculationStore.getState().selectMember(makeUser());
    useCirculationStore.getState().addCopyCode("C-001");

    const result: CheckoutResult = {
      loan: makeLoan({ copyId: "copy-1" }),
      dueDate: "2026-08-25T00:00:00.000Z",
    };
    mocks.checkout.mockResolvedValue(result);

    await useCirculationStore.getState().checkout();

    expect(mocks.checkout).toHaveBeenCalledWith("user-1", "C-001");
    expect(useCirculationStore.getState().cart).toEqual([]);
    expect(useCirculationStore.getState().dueDateStamp).toEqual({
      copyCodes: ["C-001"],
      dueDate: "2026-08-25T00:00:00.000Z",
      memberName: "สมชาย ใจดี",
    });
    expect(useCirculationStore.getState().toastMessage).toBe(
      "ยืมสำเร็จ ✓ กำหนดคืน 25 สิงหาคม 2569",
    );
  });

  it("checkout สำเนาที่ถูกยืมอยู่ → แสดงข้อความ 'สำเนานี้ถูกยืมอยู่' ในตะกร้า", async () => {
    mocks.loadActiveLoans.mockResolvedValue([]);
    mocks.fetchMemberFinesTotal.mockResolvedValue(0);
    mocks.fetchMemberMaxRenewals.mockResolvedValue(2);
    await useCirculationStore.getState().selectMember(makeUser());
    useCirculationStore.getState().addCopyCode("C-001");

    mocks.checkout.mockRejectedValue(new Error("สำเนาหนังสือนี้ถูกยืมอยู่แล้ว"));

    await useCirculationStore.getState().checkout();

    expect(useCirculationStore.getState().cart[0].error).toBe("สำเนานี้ถูกยืมอยู่");
    expect(useCirculationStore.getState().dueDateStamp).toBeNull();
    expect(useCirculationStore.getState().toastMessage).toBeNull();
  });

  it("สมาชิกถูกระงับ → บล็อกการยืม ไม่เรียก API", async () => {
    mocks.loadActiveLoans.mockResolvedValue([]);
    mocks.fetchMemberFinesTotal.mockResolvedValue(0);
    mocks.fetchMemberMaxRenewals.mockResolvedValue(2);
    await useCirculationStore.getState().selectMember(makeUser({ status: "suspended" }));
    useCirculationStore.getState().addCopyCode("C-001");

    await useCirculationStore.getState().checkout();

    expect(mocks.checkout).not.toHaveBeenCalled();
    expect(useCirculationStore.getState().checkoutError).toBe(
      "สมาชิกถูกระงับสิทธิ์ ไม่สามารถยืมได้",
    );
  });
});

describe("circulation.store — คืนหนังสือ", () => {
  it("checkin สำเร็จ → คืน true + toast 'คืนสำเร็จ ✓'", async () => {
    mocks.checkin.mockResolvedValue({ loan: makeLoan({ status: "returned" }) });

    const ok = await useCirculationStore.getState().checkin("C-001");

    expect(ok).toBe(true);
    expect(mocks.checkin).toHaveBeenCalledWith("C-001");
    expect(useCirculationStore.getState().toastMessage).toContain("คืนสำเร็จ ✓");
  });

  it("checkin มีค่าปรับ → toast แสดงยอดค่าปรับ", async () => {
    mocks.checkin.mockResolvedValue({
      loan: makeLoan({ status: "returned" }),
      fine: {
        id: "fine-1",
        loanId: "loan-1",
        userId: "user-1",
        amount: 35,
        reason: "overdue",
        paid: false,
        waived: false,
        createdAt: "2026-08-16T00:00:00",
      },
    });

    const ok = await useCirculationStore.getState().checkin("C-001");

    expect(ok).toBe(true);
    expect(useCirculationStore.getState().toastMessage).toContain("35");
  });
});

describe("circulation.store — ต่ออายุ (renew)", () => {
  it("renew ปุ่ม disabled เมื่อต่ออายุครบจำนวนครั้ง หรือมีคิวจองบนเล่ม", async () => {
    mocks.loadActiveLoans.mockResolvedValue([
      makeLoanItem({ loan: makeLoan({ id: "loan-full", renewedCount: 2 }) }),
      makeLoanItem({ loan: makeLoan({ id: "loan-reserved" }), hasActiveReservation: true }),
      makeLoanItem({ loan: makeLoan({ id: "loan-ok" }) }),
    ]);
    mocks.fetchMemberFinesTotal.mockResolvedValue(0);
    mocks.fetchMemberMaxRenewals.mockResolvedValue(2);
    await useCirculationStore.getState().selectMember(makeUser());

    expect(useCirculationStore.getState().canRenew("loan-full")).toBe(false);
    expect(useCirculationStore.getState().canRenew("loan-reserved")).toBe(false);
    expect(useCirculationStore.getState().canRenew("loan-ok")).toBe(true);
  });
});
