import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReservationRecord, ReservationStatus } from "@libsys/shared";

import type { ReservationListItem } from "../reservation.types";

const mocks = vi.hoisted(() => ({
  fetchReservations: vi.fn(),
  markReady: vi.fn(),
  fulfill: vi.fn(),
}));

vi.mock("../actions/reservation.action", () => ({
  fetchReservations: mocks.fetchReservations,
  markReady: mocks.markReady,
  fulfill: mocks.fulfill,
}));

import { initialReservationState, useReservationStore } from "./reservation.store";

function makeReservation(overrides: Partial<ReservationRecord> = {}): ReservationRecord {
  const id = overrides.id ?? "reservation-1";
  return {
    id,
    bookId: "book-1",
    userId: "user-1",
    status: "waiting",
    reservedAt: "2026-08-01T00:00:00",
    createdAt: "2026-08-01T00:00:00",
    ...overrides,
  };
}

function makeItem(overrides: Partial<ReservationListItem> = {}): ReservationListItem {
  const reservation = makeReservation(overrides);
  return {
    ...reservation,
    bookTitle: "คัมภีร์ลมปราณ",
    bookAuthor: "ผู้แต่งตัวอย่าง",
    borrowerName: "สมชาย ใจดี",
    ...overrides,
  };
}

function makePage(items: ReservationListItem[], page = 1, total = items.length) {
  return {
    success: true as const,
    data: items,
    total,
    page,
    limit: 12,
    totalPages: Math.ceil(total / 12),
  };
}

const LIST_PARAMS_SHAPE = { status: null, page: 1, limit: 12 };

beforeEach(() => {
  useReservationStore.setState({ ...initialReservationState });
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

describe("reservation.store — รายการคิวจอง", () => {
  it("loadReservations ส่ง status filter ไปยัง action และเก็บ pagination state", async () => {
    const items = [
      makeItem(),
      makeItem({ id: "reservation-2", userId: "user-2", borrowerName: "สมศรี รักดี" }),
    ];
    mocks.fetchReservations.mockResolvedValue(makePage(items, 1, 2));
    useReservationStore.setState({ status: "waiting" });

    await useReservationStore.getState().loadReservations();

    expect(mocks.fetchReservations).toHaveBeenCalledWith({
      ...LIST_PARAMS_SHAPE,
      status: "waiting",
    });
    expect(useReservationStore.getState().reservations).toHaveLength(2);
    expect(useReservationStore.getState().total).toBe(2);
    expect(useReservationStore.getState().totalPages).toBe(1);
    expect(useReservationStore.getState().isLoading).toBe(false);
  });

  it("setStatus เปลี่ยนตัวกรอง + รีเซ็ตหน้าเป็น 1 แล้วส่ง status ไปยัง action ใหม่", async () => {
    mocks.fetchReservations.mockResolvedValueOnce(makePage([makeItem()], 1, 1));
    await useReservationStore.getState().loadReservations();
    useReservationStore.setState({ page: 2 });

    const readyItems = [makeItem({ id: "reservation-ready", status: "ready" })];
    mocks.fetchReservations.mockResolvedValueOnce(makePage(readyItems, 1, 1));

    await useReservationStore.getState().setStatus("ready");

    expect(mocks.fetchReservations).toHaveBeenLastCalledWith({
      ...LIST_PARAMS_SHAPE,
      status: "ready",
    });
    expect(useReservationStore.getState().status).toBe("ready");
    expect(useReservationStore.getState().page).toBe(1);
    expect(useReservationStore.getState().reservations[0].status).toBe("ready");
  });

  it("setPage เปลี่ยนหน้าแล้วโหลดรายการใหม่โดยคง status ไว้", async () => {
    mocks.fetchReservations.mockResolvedValueOnce(makePage([makeItem()], 1, 20));
    await useReservationStore.getState().loadReservations();
    useReservationStore.setState({ status: "waiting", totalPages: 2 });

    const secondPage = [makeItem({ id: "reservation-p2" })];
    mocks.fetchReservations.mockResolvedValueOnce(makePage(secondPage, 2, 20));

    await useReservationStore.getState().setPage(2);

    expect(mocks.fetchReservations).toHaveBeenLastCalledWith({
      ...LIST_PARAMS_SHAPE,
      status: "waiting",
      page: 2,
    });
    expect(useReservationStore.getState().reservations).toEqual(secondPage);
  });
});

describe("reservation.store — mark ready และ fulfill", () => {
  it("markReady สำเร็จ → สถานะแถวเปลี่ยน waiting→ready พร้อมตั้ง pickup deadline จาก response", async () => {
    const waitingItem = makeItem();
    mocks.fetchReservations.mockResolvedValueOnce(makePage([waitingItem], 1, 1));
    await useReservationStore.getState().loadReservations();

    const readyReservation: ReservationRecord = {
      ...makeReservation({ id: "reservation-1" }),
      status: "ready",
      readyAt: "2026-08-04T00:00:00",
      pickupDeadline: "2026-08-07T00:00:00",
    };
    mocks.markReady.mockResolvedValue(readyReservation);

    const ok = await useReservationStore.getState().markReady("reservation-1");

    expect(ok).toBe(true);
    expect(mocks.markReady).toHaveBeenCalledWith("reservation-1");
    const updated = useReservationStore.getState().reservations[0];
    expect(updated.status).toBe("ready");
    expect(updated.pickupDeadline).toBe("2026-08-07T00:00:00");
    expect(updated.bookTitle).toBe("คัมภีร์ลมปราณ");
  });

  it("markReady ล้มเหลว → คืน false และเก็บข้อความผิดพลาด", async () => {
    mocks.fetchReservations.mockResolvedValueOnce(makePage([makeItem()], 1, 1));
    await useReservationStore.getState().loadReservations();
    mocks.markReady.mockRejectedValue(new Error("รายการนี้ไม่มีแล้ว"));

    const ok = await useReservationStore.getState().markReady("reservation-1");

    expect(ok).toBe(false);
    expect(useReservationStore.getState().errorMessage).toBe("รายการนี้ไม่มีแล้ว");
    expect(useReservationStore.getState().reservations[0].status).toBe("waiting");
  });

  it("fulfill สำเร็จ → สถานะแถวเปลี่ยนเป็น fulfilled", async () => {
    const readyItem = makeItem({ status: "ready" as ReservationStatus });
    mocks.fetchReservations.mockResolvedValueOnce(makePage([readyItem], 1, 1));
    await useReservationStore.getState().loadReservations();

    const fulfilledReservation: ReservationRecord = {
      ...makeReservation({ id: "reservation-1" }),
      status: "fulfilled",
      readyAt: "2026-08-04T00:00:00",
      pickupDeadline: "2026-08-07T00:00:00",
      fulfilledLoanId: "loan-1",
    };
    mocks.fulfill.mockResolvedValue(fulfilledReservation);

    const ok = await useReservationStore.getState().fulfill("reservation-1", "loan-1");

    expect(ok).toBe(true);
    expect(mocks.fulfill).toHaveBeenCalledWith("reservation-1", "loan-1");
    expect(useReservationStore.getState().reservations[0].status).toBe("fulfilled");
    expect(useReservationStore.getState().reservations[0].fulfilledLoanId).toBe("loan-1");
  });
});

describe("reservation.store — คิวต่อ title (FIFO)", () => {
  it("expandedBookId เปิด/ปิดได้ และ queuePerBook เรียงตาม reservedAt จากเก่าไปใหม่", async () => {
    const items = [
      makeItem({ id: "r-1", reservedAt: "2026-08-01T00:00:00" }),
      makeItem({
        id: "r-2",
        reservedAt: "2026-07-30T00:00:00",
        userId: "user-2",
        borrowerName: "สมศรี รักดี",
      }),
      makeItem({
        id: "r-3",
        bookId: "book-2",
        reservedAt: "2026-08-02T00:00:00",
        userId: "user-3",
        bookTitle: "อีกเล่ม",
      }),
    ];
    mocks.fetchReservations.mockResolvedValueOnce(makePage(items, 1, 3));
    await useReservationStore.getState().loadReservations();

    expect(useReservationStore.getState().expandedBookId).toBeNull();

    useReservationStore.getState().toggleExpand("book-1");
    expect(useReservationStore.getState().expandedBookId).toBe("book-1");

    const queue = useReservationStore.getState().queuePerBook("book-1");
    expect(queue.map((item) => item.id)).toEqual(["r-2", "r-1"]);

    useReservationStore.getState().toggleExpand("book-1");
    expect(useReservationStore.getState().expandedBookId).toBeNull();
  });
});
