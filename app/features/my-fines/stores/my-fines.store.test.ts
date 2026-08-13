import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FineRecord } from "@libsys/shared";

const mocks = vi.hoisted(() => ({
  fetchMyFines: vi.fn(),
}));

vi.mock("../actions/my-fines.action", () => ({
  fetchMyFines: mocks.fetchMyFines,
}));

import { useMyFinesStore } from "./my-fines.store";

function makeFine(overrides: Partial<FineRecord> = {}): FineRecord {
  return {
    id: "fine-1",
    loanId: "loan-1",
    userId: "user-1",
    amount: 50,
    reason: "overdue",
    paid: false,
    waived: false,
    createdAt: "2026-08-10T00:00:00",
    ...overrides,
  };
}

beforeEach(() => {
  useMyFinesStore.setState({
    fines: [],
    unpaidTotal: 0,
    isLoading: false,
    isError: false,
    errorMessage: null,
  });
  mocks.fetchMyFines.mockReset();
});

describe("my-fines.store — ค่าปรับ", () => {
  it("load โหลดรายการค่าปรับ + ยอดค้างรวม", async () => {
    const fines = [
      makeFine({ id: "fine-1", amount: 50 }),
      makeFine({ id: "fine-2", amount: 120, paid: true, paidAt: "2026-08-11T00:00:00" }),
      makeFine({ id: "fine-3", amount: 30, waived: true }),
    ];
    mocks.fetchMyFines.mockResolvedValue({ fines, unpaidTotal: 50 });

    await useMyFinesStore.getState().load();

    expect(useMyFinesStore.getState().fines).toEqual(fines);
    expect(useMyFinesStore.getState().unpaidTotal).toBe(50);
    expect(useMyFinesStore.getState().isLoading).toBe(false);
    expect(useMyFinesStore.getState().isError).toBe(false);
  });

  it("load ล้มเหลว → isError true + errorMessage ภาษาไทย", async () => {
    mocks.fetchMyFines.mockRejectedValue(new Error("ไม่สามารถโหลดค่าปรับ"));

    await useMyFinesStore.getState().load();

    expect(useMyFinesStore.getState().isError).toBe(true);
    expect(useMyFinesStore.getState().errorMessage).toBe("ไม่สามารถโหลดค่าปรับ");
    expect(useMyFinesStore.getState().fines).toEqual([]);
  });

  it("reset กลับสู่ค่าเริ่มต้น", async () => {
    mocks.fetchMyFines.mockResolvedValue({ fines: [makeFine()], unpaidTotal: 50 });
    await useMyFinesStore.getState().load();

    useMyFinesStore.getState().reset();

    expect(useMyFinesStore.getState().fines).toEqual([]);
    expect(useMyFinesStore.getState().unpaidTotal).toBe(0);
  });
});
