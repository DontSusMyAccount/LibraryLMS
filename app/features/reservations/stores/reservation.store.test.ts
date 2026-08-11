import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReservationRecord, ReservationStatus } from "@libsys/shared";

import type { ReservationListItem } from "../reservation.types";

const mocks = vi.hoisted(() => ({
  fetchReservations: vi.fn(),
  fetchAllReservations: vi.fn(),
  markReady: vi.fn(),
  fulfill: vi.fn(),
}));

vi.mock("../actions/reservation.action", () => ({
  fetchReservations: mocks.fetchReservations,
  fetchAllReservations: mocks.fetchAllReservations,
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

beforeEach(() => {
  useReservationStore.setState({ ...initialReservationState });
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

describe("reservation.store — รายการคิวจอง", () => {
  it("loadReservations โหลดทุกหน้าเพื่อสร้างคิวสมบูรณ์ และแสดง slice ของหน้าปัจจุบัน", async () => {
    const allItems = Array.from({ length: 13 }, (_, index) => makeItem({ id: `r-${index + 1}` }));
    mocks.fetchAllReservations.mockResolvedValue(makePage(allItems, 1, 13));
    useReservationStore.setState({ status: "waiting" });

    await useReservationStore.getState().loadReservations();

    const state = useReservationStore.getState();
    expect(mocks.fetchAllReservations).toHaveBeenCalledWith("waiting");
    expect(state.reservations).toHaveLength(12);
    expect(state.reservations[0].id).toBe("r-1");
    expect(state.queueReservations).toHaveLength(13);
    expect(state.total).toBe(13);
    expect(state.totalPages).toBe(2);
    expect(state.isLoading).toBe(false);
  });

  it("setPage เปลี่ยนหน้า → โหลด slice หน้าใหม่จากแคชคิวโดยไม่โหลดทุกหน้าซ้ำ", async () => {
    const allItems = Array.from({ length: 13 }, (_, index) =>
      makeItem({ id: `r-${index + 1}`, reservedAt: `2026-08-0${index + 1}T00:00:00` }),
    );
    mocks.fetchAllReservations.mockResolvedValueOnce(makePage(allItems, 1, 13));
    await useReservationStore.getState().loadReservations();

    const secondPage = [makeItem({ id: "r-13" })];
    mocks.fetchReservations.mockResolvedValueOnce(makePage(secondPage, 2, 13));

    await useReservationStore.getState().setPage(2);

    expect(mocks.fetchAllReservations).toHaveBeenCalledTimes(1);
    expect(mocks.fetchReservations).toHaveBeenCalledWith({
      status: null,
      page: 2,
      limit: 12,
    });
    const state = useReservationStore.getState();
    expect(state.reservations).toEqual(secondPage);
    expect(state.page).toBe(2);
    expect(state.queueReservations).toHaveLength(13);
  });

  it("setStatus เปลี่ยนตัวกรอง → รีเซ็ตหน้าเป็น 1 และโหลดทุกหน้าใหม่ด้วย filter ใหม่", async () => {
    mocks.fetchAllReservations.mockResolvedValueOnce(makePage([makeItem()], 1, 1));
    await useReservationStore.getState().loadReservations();
    useReservationStore.setState({ page: 2 });

    const readyItems = [makeItem({ id: "reservation-ready", status: "ready" })];
    mocks.fetchAllReservations.mockResolvedValueOnce(makePage(readyItems, 1, 1));

    await useReservationStore.getState().setStatus("ready");

    expect(mocks.fetchAllReservations).toHaveBeenLastCalledWith("ready");
    expect(useReservationStore.getState().status).toBe("ready");
    expect(useReservationStore.getState().page).toBe(1);
    expect(useReservationStore.getState().reservations[0].status).toBe("ready");
  });
});

describe("reservation.store — mark ready และ fulfill", () => {
  it("markReady สำเร็จ → สถานะแถวเปลี่ยน waiting→ready พร้อมตั้ง pickup deadline จาก response", async () => {
    const waitingItem = makeItem();
    mocks.fetchAllReservations.mockResolvedValueOnce(makePage([waitingItem], 1, 1));
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
    const queued = useReservationStore.getState().queueReservations[0];
    expect(queued.status).toBe("ready");
    expect(queued.pickupDeadline).toBe("2026-08-07T00:00:00");
  });

  it("markReady ล้มเหลว → คืน false เก็บข้อความผิดพลาด (ไม่ตั้ง isError) และ load ครั้งต่อไปเคลียร์ข้อความ", async () => {
    mocks.fetchAllReservations.mockResolvedValueOnce(makePage([makeItem()], 1, 1));
    await useReservationStore.getState().loadReservations();
    mocks.markReady.mockRejectedValue(new Error("รายการนี้ไม่มีแล้ว"));

    const ok = await useReservationStore.getState().markReady("reservation-1");

    expect(ok).toBe(false);
    expect(useReservationStore.getState().errorMessage).toBe("รายการนี้ไม่มีแล้ว");
    expect(useReservationStore.getState().isError).toBe(false);
    expect(useReservationStore.getState().reservations[0].status).toBe("waiting");

    mocks.fetchReservations.mockResolvedValueOnce(makePage([makeItem()], 1, 1));
    await useReservationStore.getState().loadReservations();
    expect(useReservationStore.getState().errorMessage).toBeNull();
  });

  it("fulfill สำเร็จ → สถานะแถวเปลี่ยนเป็น fulfilled ในรายการหน้าและในคิว", async () => {
    const readyItem = makeItem({ status: "ready" as ReservationStatus });
    mocks.fetchAllReservations.mockResolvedValueOnce(makePage([readyItem], 1, 1));
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
    expect(useReservationStore.getState().queueReservations[0].status).toBe("fulfilled");
  });
});

describe("reservation.store — คิวต่อ title (FIFO)", () => {
  it("queuePerBook สร้างคิวจากทุกหน้า (รวมรายการที่อยู่นอกหน้าปัจจุบัน) เรียงตาม reservedAt", async () => {
    const allItems = Array.from({ length: 13 }, (_, index) =>
      makeItem({
        id: `r-${index + 1}`,
        reservedAt: `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00`,
      }),
    );
    mocks.fetchAllReservations.mockResolvedValue(makePage(allItems, 1, 13));
    await useReservationStore.getState().loadReservations();

    const queue = useReservationStore.getState().queuePerBook("book-1");

    expect(queue).toHaveLength(13);
    expect(queue[0].id).toBe("r-1");
    expect(queue[12].id).toBe("r-13");
  });

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
    mocks.fetchAllReservations.mockResolvedValueOnce(makePage(items, 1, 3));
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
