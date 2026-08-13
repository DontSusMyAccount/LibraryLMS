import { describe, expect, it } from "vitest";

import type { ReservationRecord } from "../../../../shared";
import type { IMeRepository } from "../ports/me.repository";
import { ListMyReservationsUsecase } from "./list-my-reservations.usecase";

function buildReservation(overrides: Partial<ReservationRecord> = {}): ReservationRecord {
  return {
    id: "r-1",
    bookId: "b-1",
    userId: "u-1",
    status: "waiting",
    reservedAt: "2026-08-01T00:00:00.000Z",
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ListMyReservationsUsecase", () => {
  it("คืนคิวจองของตัวเองพร้อมชื่อหนังสือ (เฉพาะรายการของ user นี้)", async () => {
    const meRepo: IMeRepository = {
      listLoansByUser: async () => [],
      listReservationsByUser: async (userId) =>
        userId === "u-1"
          ? [
              {
                reservation: buildReservation(),
                bookTitle: "หนังสือที่จอง",
                bookCoverUrl: "https://covers/x.jpg",
              },
              {
                reservation: buildReservation({
                  id: "r-2",
                  status: "ready",
                  readyAt: "2026-08-05T00:00:00.000Z",
                  pickupDeadline: "2026-08-08T00:00:00.000Z",
                }),
                bookTitle: "เล่มสอง",
              },
            ]
          : [],
      listFinesByUser: async () => [],
    };

    const usecase = new ListMyReservationsUsecase(meRepo);
    const result = await usecase.execute({ query: { userId: "u-1" } });

    expect(result.reservations).toHaveLength(2);
    expect(result.reservations[0]!.bookTitle).toBe("หนังสือที่จอง");
    expect(result.reservations[1]!.reservation.status).toBe("ready");
  });

  it("ไม่มีรายการ → คืน array ว่าง", async () => {
    const meRepo: IMeRepository = {
      listLoansByUser: async () => [],
      listReservationsByUser: async () => [],
      listFinesByUser: async () => [],
    };

    const usecase = new ListMyReservationsUsecase(meRepo);
    const result = await usecase.execute({ query: { userId: "u-1" } });

    expect(result.reservations).toEqual([]);
  });
});
