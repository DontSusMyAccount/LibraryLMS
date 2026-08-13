import { describe, expect, it } from "vitest";

import type { FineRecord } from "../../../../shared";
import type { IMeRepository } from "../ports/me.repository";
import { ListMyFinesUsecase } from "./list-my-fines.usecase";

function buildFine(overrides: Partial<FineRecord> = {}): FineRecord {
  return {
    id: "f-1",
    userId: "u-1",
    amount: 50,
    reason: "overdue",
    paid: false,
    waived: false,
    createdAt: "2026-08-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("ListMyFinesUsecase", () => {
  it("คืนค่าปรับของตัวเอง + ยอดค้างรวม (ไม่นับที่จ่ายแล้ว)", async () => {
    const meRepo: IMeRepository = {
      listLoansByUser: async () => [],
      listReservationsByUser: async () => [],
      listFinesByUser: async (userId) =>
        userId === "u-1"
          ? [
              buildFine({ amount: 50 }),
              buildFine({ id: "f-2", amount: 30 }),
              buildFine({ id: "f-3", amount: 100, paid: true }),
            ]
          : [],
    };

    const usecase = new ListMyFinesUsecase(meRepo);
    const result = await usecase.execute({ query: { userId: "u-1" } });

    expect(result.fines).toHaveLength(3);
    expect(result.unpaidTotal).toBe(80);
  });

  it("waived แต่ยังไม่จ่าย — นับในยอดค้าง (ตรงกับ sumUnpaidFinesByUser ที่ใช้ gate การยืม)", async () => {
    const meRepo: IMeRepository = {
      listLoansByUser: async () => [],
      listReservationsByUser: async () => [],
      listFinesByUser: async () => [buildFine({ id: "f-4", amount: 40, waived: true })],
    };

    const usecase = new ListMyFinesUsecase(meRepo);
    const result = await usecase.execute({ query: { userId: "u-1" } });

    expect(result.unpaidTotal).toBe(40);
  });

  it("ไม่มีค่าปรับ → คืน array ว่าง + ยอด 0", async () => {
    const meRepo: IMeRepository = {
      listLoansByUser: async () => [],
      listReservationsByUser: async () => [],
      listFinesByUser: async () => [],
    };

    const usecase = new ListMyFinesUsecase(meRepo);
    const result = await usecase.execute({ query: { userId: "u-1" } });

    expect(result.fines).toEqual([]);
    expect(result.unpaidTotal).toBe(0);
  });
});
