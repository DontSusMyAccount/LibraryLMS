import { describe, expect, it } from "vitest";

import type { ReservationRecord } from "../../../../shared";
import type { IReservationRepository } from "../ports/reservation.repository";
import { ListReservationsUsecase } from "./list-reservations.usecase";

const NOW = new Date("2026-08-06T00:00:00.000Z");

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

const RESERVATIONS: ReservationRecord[] = [
  buildReservation({ id: "r-1", status: "waiting" }),
  buildReservation({
    id: "r-2",
    status: "ready",
    readyAt: NOW.toISOString(),
    pickupDeadline: "2026-08-10T00:00:00.000Z",
  }),
  buildReservation({ id: "r-3", status: "fulfilled", fulfilledLoanId: "loan-1" }),
];

function createReservationRepository(records: ReservationRecord[]): IReservationRepository {
  return {
    findMemberById: async () => null,
    findBookById: async () => null,
    findActiveByUserAndBook: async () => null,
    findById: async () => null,
    createReservation: async () => buildReservation(),
    listReservations: async ({ status, page, limit }) => {
      const filtered = status ? records.filter((item) => item.status === status) : records;
      const total = filtered.length;
      const start = (page - 1) * limit;
      return {
        data: filtered.slice(start, start + limit),
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      };
    },
    findByBookQueue: async () => [],
    countActiveByBook: async () => 0,
    updateStatus: async () => null,
    findReadyOverdue: async () => [],
    findActiveLoanById: async () => null,
    getSystemSetting: async () => 3,
  };
}

describe("ListReservationsUsecase", () => {
  it("กรองตาม status ได้ (เฉพาะ waiting)", async () => {
    const usecase = new ListReservationsUsecase(createReservationRepository(RESERVATIONS));

    const result = await usecase.execute({ query: { status: "waiting", page: 1, limit: 12 } });

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.status).toBe("waiting");
  });

  it("ไม่กรอง status → คืนทั้งหมด", async () => {
    const usecase = new ListReservationsUsecase(createReservationRepository(RESERVATIONS));

    const result = await usecase.execute({ query: { page: 1, limit: 12 } });

    expect(result.total).toBe(3);
  });

  it("แบ่งหน้าได้ (page 2 limit 1)", async () => {
    const usecase = new ListReservationsUsecase(createReservationRepository(RESERVATIONS));

    const result = await usecase.execute({ query: { page: 2, limit: 1 } });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("r-2");
    expect(result.totalPages).toBe(3);
  });
});
