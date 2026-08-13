import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MyReservationItem } from "../my-reservations.types";

const mocks = vi.hoisted(() => ({
  fetchMyReservations: vi.fn(),
  cancelMyReservation: vi.fn(),
}));

vi.mock("../actions/my-reservations.action", () => ({
  fetchMyReservations: mocks.fetchMyReservations,
  cancelMyReservation: mocks.cancelMyReservation,
}));

import { useMyReservationsStore } from "./my-reservations.store";

function makeReservation(overrides: Partial<MyReservationItem> = {}): MyReservationItem {
  return {
    reservation: {
      id: "res-1",
      bookId: "book-1",
      userId: "user-1",
      status: "waiting",
      reservedAt: "2026-08-05T00:00:00",
      createdAt: "2026-08-05T00:00:00",
    },
    bookTitle: "แฮร์รี่ พอตเตอร์",
    bookCoverUrl: "https://example.com/cover.jpg",
    ...overrides,
  };
}

beforeEach(() => {
  useMyReservationsStore.setState({
    reservations: [],
    isLoading: false,
    isError: false,
    errorMessage: null,
    cancellingId: null,
    cancelError: null,
  });
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

describe("my-reservations.store — รายการคิวจอง", () => {
  it("load โหลดรายการคิวจอง", async () => {
    const reservations = [
      makeReservation(),
      makeReservation({
        reservation: {
          id: "res-2",
          bookId: "book-2",
          userId: "user-1",
          status: "ready",
          reservedAt: "2026-08-06T00:00:00",
          readyAt: "2026-08-08T00:00:00",
          pickupDeadline: "2026-08-10T00:00:00",
          createdAt: "2026-08-06T00:00:00",
        },
        bookTitle: "แดนนิเวศน์",
      }),
    ];
    mocks.fetchMyReservations.mockResolvedValue(reservations);

    await useMyReservationsStore.getState().load();

    expect(useMyReservationsStore.getState().reservations).toEqual(reservations);
    expect(useMyReservationsStore.getState().isLoading).toBe(false);
    expect(useMyReservationsStore.getState().isError).toBe(false);
  });

  it("load ล้มเหลว → isError true + errorMessage ภาษาไทย", async () => {
    mocks.fetchMyReservations.mockRejectedValue(new Error("ไม่สามารถโหลดคิวจอง"));

    await useMyReservationsStore.getState().load();

    expect(useMyReservationsStore.getState().isError).toBe(true);
    expect(useMyReservationsStore.getState().errorMessage).toBe("ไม่สามารถโหลดคิวจอง");
  });
});

describe("my-reservations.store — ยกเลิกคิวจอง", () => {
  it("cancel สำเร็จ → ลบรายการออกจากลิสต์", async () => {
    const reservations = [
      makeReservation(),
      makeReservation({
        reservation: {
          id: "res-2",
          bookId: "book-2",
          userId: "user-1",
          status: "waiting",
          reservedAt: "2026-08-06T00:00:00",
          createdAt: "2026-08-06T00:00:00",
        },
        bookTitle: "แดนนิเวศน์",
      }),
    ];
    mocks.fetchMyReservations.mockResolvedValue(reservations);
    await useMyReservationsStore.getState().load();

    mocks.cancelMyReservation.mockResolvedValue(reservations[0].reservation);

    const ok = await useMyReservationsStore.getState().cancel("res-1");

    expect(ok).toBe(true);
    expect(mocks.cancelMyReservation).toHaveBeenCalledWith("res-1");
    expect(useMyReservationsStore.getState().reservations).toHaveLength(1);
    expect(useMyReservationsStore.getState().reservations[0].reservation.id).toBe("res-2");
    expect(useMyReservationsStore.getState().cancellingId).toBeNull();
  });

  it("cancel ล้มเหลว (สถานะเปลี่ยนแล้ว) → คืน false + เก็บ error", async () => {
    mocks.fetchMyReservations.mockResolvedValue([makeReservation()]);
    await useMyReservationsStore.getState().load();

    mocks.cancelMyReservation.mockRejectedValue(new Error("ยกเลิกได้เฉพาะคิวที่รออยู่"));

    const ok = await useMyReservationsStore.getState().cancel("res-1");

    expect(ok).toBe(false);
    expect(useMyReservationsStore.getState().cancelError).toBe("ยกเลิกได้เฉพาะคิวที่รออยู่");
    expect(useMyReservationsStore.getState().reservations).toHaveLength(1);
  });
});

describe("my-reservations.store — reset", () => {
  it("reset กลับสู่ค่าเริ่มต้น", async () => {
    mocks.fetchMyReservations.mockResolvedValue([makeReservation()]);
    await useMyReservationsStore.getState().load();

    useMyReservationsStore.getState().reset();

    expect(useMyReservationsStore.getState().reservations).toEqual([]);
    expect(useMyReservationsStore.getState().cancelError).toBeNull();
  });
});
