import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BookCopy, BookWithCopies } from "@libsys/shared";
import type { MyReservationItem } from "@/app/features/my-reservations/my-reservations.types";

const mocks = vi.hoisted(() => ({
  fetchBookWithCopies: vi.fn(),
  fetchMyReservations: vi.fn(),
  checkoutBook: vi.fn(),
  reserveBook: vi.fn(),
}));

vi.mock("../actions/book-detail.action", () => ({
  fetchBookWithCopies: mocks.fetchBookWithCopies,
  fetchMyReservations: mocks.fetchMyReservations,
  checkoutBook: mocks.checkoutBook,
  reserveBook: mocks.reserveBook,
}));

import { useBookDetailStore } from "./book-detail.store";

function makeCopy(overrides: Partial<BookCopy> = {}): BookCopy {
  return {
    id: "copy-1",
    bookId: "book-1",
    branchId: "branch-1",
    copyCode: "BK-001",
    status: "available",
    shelfLocation: "ชั้น 1",
    acquiredAt: "2026-01-01T00:00:00",
    createdAt: "2026-01-01T00:00:00",
    ...overrides,
  };
}

function makeBook(overrides: Partial<BookWithCopies> = {}): BookWithCopies {
  return {
    id: "book-1",
    title: "แฮร์รี่ พอตเตอร์",
    author: "เจ.เค. โรว์ลิ่ง",
    isbn: "9789744723439",
    publisher: "นานมีบุ๊คส์",
    language: "th",
    categoryId: "cat-1",
    description: "นวนิยายแฟนตาซี",
    coverUrl: "https://example.com/cover.jpg",
    publishedYear: 2003,
    createdAt: "2026-01-01T00:00:00",
    updatedAt: "2026-01-01T00:00:00",
    copies: [makeCopy()],
    ...overrides,
  };
}

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
    ...overrides,
  };
}

beforeEach(() => {
  useBookDetailStore.setState({
    book: null,
    reservations: [],
    isLoading: false,
    isError: false,
    errorMessage: null,
    isSubmitting: false,
    submitError: null,
    successMessage: null,
  });
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

describe("book-detail.store — โหลดรายละเอียด", () => {
  it("load โหลดหนังสือ + คิวจองของฉันพร้อมกัน", async () => {
    const book = makeBook();
    const reservations = [makeReservation()];
    mocks.fetchBookWithCopies.mockResolvedValue(book);
    mocks.fetchMyReservations.mockResolvedValue(reservations);

    await useBookDetailStore.getState().load("book-1");

    expect(mocks.fetchBookWithCopies).toHaveBeenCalledWith("book-1");
    expect(useBookDetailStore.getState().book).toEqual(book);
    expect(useBookDetailStore.getState().reservations).toEqual(reservations);
    expect(useBookDetailStore.getState().isLoading).toBe(false);
    expect(useBookDetailStore.getState().isError).toBe(false);
  });

  it("load ล้มเหลว → isError true + errorMessage ภาษาไทย", async () => {
    mocks.fetchBookWithCopies.mockRejectedValue(new Error("ไม่พบหนังสือ"));

    await useBookDetailStore.getState().load("book-999");

    expect(useBookDetailStore.getState().isError).toBe(true);
    expect(useBookDetailStore.getState().errorMessage).toBe("ไม่พบหนังสือ");
  });
});

describe("book-detail.store — self-checkout", () => {
  it("checkout สำเร็จ → successMessage ภาษาไทยพร้อมวันคืน + refetch สถานะหนังสือ", async () => {
    mocks.fetchBookWithCopies.mockResolvedValueOnce(makeBook());
    mocks.fetchMyReservations.mockResolvedValue([]);
    await useBookDetailStore.getState().load("book-1");

    const borrowedCopy = makeCopy({ status: "borrowed" });
    mocks.checkoutBook.mockResolvedValue({
      loan: {
        id: "loan-1",
        copyId: "copy-1",
        userId: "user-1",
        borrowedAt: "2026-08-12T00:00:00",
        dueAt: "2026-08-26T00:00:00",
        status: "active",
        renewedCount: 0,
        loanPeriodDays: 14,
        dailyFineRate: 5,
        checkedOutBy: "user-1",
        createdAt: "2026-08-12T00:00:00",
      },
      dueDate: "2026-08-26T00:00:00",
    });
    mocks.fetchBookWithCopies.mockResolvedValueOnce(makeBook({ copies: [borrowedCopy] }));

    const ok = await useBookDetailStore.getState().checkout("BK-001");

    expect(ok).toBe(true);
    expect(mocks.checkoutBook).toHaveBeenCalledWith("BK-001");
    const message = useBookDetailStore.getState().successMessage;
    expect(message).toContain("ยืมสำเร็จ");
    expect(message).toContain("26 สิงหาคม");
    expect(useBookDetailStore.getState().book?.copies[0].status).toBe("borrowed");
    expect(useBookDetailStore.getState().isSubmitting).toBe(false);
  });

  it("checkout ล้มเหลว (ค่าปรับเกินเพดาน) → submitError ภาษาไทย + คืน false", async () => {
    mocks.fetchBookWithCopies.mockResolvedValue(makeBook());
    mocks.fetchMyReservations.mockResolvedValue([]);
    await useBookDetailStore.getState().load("book-1");

    mocks.checkoutBook.mockRejectedValue(new Error("ค่าปรับค้างชำระเกินเพดาน กรุณาชำระก่อน"));

    const ok = await useBookDetailStore.getState().checkout("BK-001");

    expect(ok).toBe(false);
    expect(useBookDetailStore.getState().submitError).toBe(
      "ค่าปรับค้างชำระเกินเพดาน กรุณาชำระก่อน",
    );
    expect(useBookDetailStore.getState().successMessage).toBeNull();
  });
});

describe("book-detail.store — จองหนังสือ", () => {
  it("reserve สำเร็จ → successMessage + refetch คิวจอง", async () => {
    mocks.fetchBookWithCopies.mockResolvedValue(makeBook());
    mocks.fetchMyReservations.mockResolvedValueOnce([]);
    await useBookDetailStore.getState().load("book-1");

    mocks.reserveBook.mockResolvedValue(makeReservation().reservation);
    mocks.fetchMyReservations.mockResolvedValueOnce([makeReservation()]);

    const ok = await useBookDetailStore.getState().reserve("book-1");

    expect(ok).toBe(true);
    expect(mocks.reserveBook).toHaveBeenCalledWith("book-1");
    expect(useBookDetailStore.getState().successMessage).toContain("จองสำเร็จ");
    expect(useBookDetailStore.getState().reservations).toHaveLength(1);
  });

  it("reserve ล้มเหลว (จองซ้ำ) → submitError + คืน false", async () => {
    mocks.fetchBookWithCopies.mockResolvedValue(makeBook());
    mocks.fetchMyReservations.mockResolvedValue([]);
    await useBookDetailStore.getState().load("book-1");

    mocks.reserveBook.mockRejectedValue(new Error("คุณได้จองหนังสือเล่มนี้ไว้แล้ว"));

    const ok = await useBookDetailStore.getState().reserve("book-1");

    expect(ok).toBe(false);
    expect(useBookDetailStore.getState().submitError).toBe("คุณได้จองหนังสือเล่มนี้ไว้แล้ว");
  });
});
