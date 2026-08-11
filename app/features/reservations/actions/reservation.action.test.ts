import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReservationRecord } from "@libsys/shared";

const mocks = vi.hoisted(() => ({
  reservationsGet: vi.fn(),
  booksGet: vi.fn(),
}));

vi.mock("@/app/_shared/lib/eden-client", () => ({
  eden: {
    reservations: { get: mocks.reservationsGet },
    catalog: { books: { get: mocks.booksGet } },
  },
}));

import { fetchAllReservations } from "./reservation.action";

interface EdenOkEnvelope {
  data: unknown;
  error: null;
  status: number;
  headers: object;
}

function edenOkPaginated<T>(
  items: T[],
  page: number,
  total: number,
  totalPages: number,
): EdenOkEnvelope {
  return {
    data: {
      success: true as const,
      data: items,
      total,
      page,
      limit: 12,
      totalPages,
    },
    error: null,
    status: 200,
    headers: {},
  };
}

function makeReservation(id: string): ReservationRecord {
  return {
    id,
    bookId: "book-1",
    userId: "user-1",
    status: "waiting",
    reservedAt: "2026-08-01T00:00:00",
    createdAt: "2026-08-01T00:00:00",
  };
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

describe("reservation.action — โหลดทุกหน้าสำหรับคิว", () => {
  it("fetchAllReservations ดึงทุกหน้าจนหมด totalPages แล้วรวมรายการพร้อม enriching ชื่อหนังสือ", async () => {
    const pageOne = Array.from({ length: 12 }, (_, index) => makeReservation(`r-${index + 1}`));
    const pageTwo = Array.from({ length: 12 }, (_, index) => makeReservation(`r-${index + 13}`));
    const pageThree = [makeReservation("r-25"), makeReservation("r-26")];
    mocks.reservationsGet
      .mockResolvedValueOnce(edenOkPaginated(pageOne, 1, 26, 3))
      .mockResolvedValueOnce(edenOkPaginated(pageTwo, 2, 26, 3))
      .mockResolvedValueOnce(edenOkPaginated(pageThree, 3, 26, 3));
    mocks.booksGet.mockResolvedValueOnce(
      edenOkPaginated(
        [
          {
            id: "book-1",
            title: "คัมภีร์ลมปราณ",
            author: "ผู้แต่งตัวอย่าง",
            copies: [],
          },
        ],
        1,
        1,
        1,
      ),
    );

    const result = await fetchAllReservations(null);

    expect(mocks.reservationsGet).toHaveBeenCalledTimes(3);
    expect(mocks.reservationsGet).toHaveBeenNthCalledWith(1, {
      query: { page: 1, limit: 12 },
    });
    expect(mocks.reservationsGet).toHaveBeenNthCalledWith(3, {
      query: { page: 3, limit: 12 },
    });
    expect(result.data).toHaveLength(26);
    expect(result.data[0].bookTitle).toBe("คัมภีร์ลมปราณ");
    expect(result.total).toBe(26);
    expect(result.totalPages).toBe(3);
  });
});
