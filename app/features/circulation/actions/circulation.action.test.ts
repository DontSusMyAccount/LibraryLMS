import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BookWithCopies, LoanRecord, ReservationRecord } from "@libsys/shared";

import type { ActiveLoanItem } from "../circulation.types";

const mocks = vi.hoisted(() => ({
  loansActiveGet: vi.fn(),
  reservationsGet: vi.fn(),
  booksGet: vi.fn(),
}));

vi.mock("@/app/_shared/lib/eden-client", () => ({
  eden: {
    circulation: { loans: { active: { get: mocks.loansActiveGet } } },
    reservations: { get: mocks.reservationsGet },
    catalog: { books: { get: mocks.booksGet } },
  },
}));

import { loadActiveLoans } from "./circulation.action";

function edenOk<TData>(data: TData): {
  data: unknown;
  error: null;
  status: number;
  headers: object;
} {
  return { data: { success: true as const, data }, error: null, status: 200, headers: {} };
}

function edenOkPaginated<TData>(
  data: TData[],
  totalPages: number,
): {
  data: unknown;
  error: null;
  status: number;
  headers: object;
} {
  return {
    data: {
      success: true as const,
      data,
      total: data.length,
      page: 1,
      limit: 100,
      totalPages,
    },
    error: null,
    status: 200,
    headers: {},
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

function makeReservation(overrides: Partial<ReservationRecord> = {}): ReservationRecord {
  return {
    id: "reservation-1",
    bookId: "book-1",
    userId: "user-1",
    status: "waiting",
    reservedAt: "2026-08-01T00:00:00",
    createdAt: "2026-08-01T00:00:00",
    ...overrides,
  };
}

function makeBook(overrides: Partial<BookWithCopies> = {}): BookWithCopies {
  const bookId = overrides.id ?? "book-1";
  return {
    id: bookId,
    title: "หนังสือทดสอบ",
    author: "ผู้แต่ง",
    copies: [
      {
        id: "copy-1",
        bookId,
        copyCode: "C-001",
        status: "borrowed",
        createdAt: "2026-08-01T00:00:00",
      },
    ],
    createdAt: "2026-08-01T00:00:00",
    updatedAt: "2026-08-01T00:00:00",
    ...overrides,
  };
}

beforeEach(() => {
  for (const mock of [mocks.loansActiveGet, mocks.reservationsGet, mocks.booksGet]) {
    mock.mockReset();
  }
});

describe("loadActiveLoans", () => {
  it("ขอ reservations/books ครบทุกหน้า (เกิน limit 100) → ตรวจจับคิวจองที่อยู่ในหน้าถัดไป", async () => {
    mocks.loansActiveGet.mockResolvedValue(
      edenOk({ loans: [makeLoanItem({ loan: makeLoan({ copyId: "copy-beta" }) })] }),
    );
    mocks.reservationsGet.mockImplementation(
      ({ query }: { query: { page: number; limit: number } }) => {
        const reservation = makeReservation({
          id: `reservation-page-${query.page}`,
          bookId: query.page === 1 ? "book-alpha" : "book-beta",
        });
        return edenOkPaginated([reservation], 2);
      },
    );
    mocks.booksGet.mockImplementation(({ query }: { query: { page: number; limit: number } }) => {
      const pageBook =
        query.page === 1
          ? makeBook({
              id: "book-alpha",
              copies: [
                {
                  id: "copy-alpha",
                  bookId: "book-alpha",
                  copyCode: "book-alpha",
                  status: "borrowed",
                  createdAt: "2026-08-01T00:00:00",
                },
              ],
            })
          : makeBook({
              id: "book-beta",
              copies: [
                {
                  id: "copy-beta",
                  bookId: "book-beta",
                  copyCode: "book-beta",
                  status: "borrowed",
                  createdAt: "2026-08-01T00:00:00",
                },
              ],
            });
      return edenOkPaginated([pageBook], 2);
    });

    const loans = await loadActiveLoans("user-1");

    expect(mocks.reservationsGet).toHaveBeenCalledWith({ query: { page: 1, limit: 100 } });
    expect(mocks.reservationsGet).toHaveBeenCalledWith({ query: { page: 2, limit: 100 } });
    expect(mocks.booksGet).toHaveBeenCalledWith({ query: { page: 1, limit: 100 } });
    expect(mocks.booksGet).toHaveBeenCalledWith({ query: { page: 2, limit: 100 } });
    expect(loans[0].hasActiveReservation).toBe(true);
  });

  it("reservation ที่ยัง active → ตั้ง hasActiveReservation = true ต่อ loan ที่ copy ตรงกัน", async () => {
    mocks.loansActiveGet.mockResolvedValue(
      edenOk({ loans: [makeLoanItem({ loan: makeLoan({ copyId: "copy-alpha" }) })] }),
    );
    mocks.reservationsGet.mockResolvedValue(
      edenOkPaginated([makeReservation({ bookId: "book-alpha" })], 1),
    );
    mocks.booksGet.mockResolvedValue(
      edenOkPaginated(
        [
          makeBook({
            id: "book-alpha",
            copies: [
              {
                id: "copy-alpha",
                bookId: "book-alpha",
                copyCode: "C-001",
                status: "borrowed",
                createdAt: "2026-08-01T00:00:00",
              },
            ],
          }),
        ],
        1,
      ),
    );

    const loans = await loadActiveLoans("user-1");

    expect(loans[0].hasActiveReservation).toBe(true);
  });

  it("reservation สถานะจบสิ้น (fulfilled/expired) → ไม่นับเป็นคิวจอง", async () => {
    mocks.loansActiveGet.mockResolvedValue(
      edenOk({ loans: [makeLoanItem({ loan: makeLoan({ copyId: "copy-alpha" }) })] }),
    );
    mocks.reservationsGet.mockResolvedValue(
      edenOkPaginated([makeReservation({ status: "fulfilled", bookId: "book-alpha" })], 1),
    );
    mocks.booksGet.mockResolvedValue(
      edenOkPaginated(
        [
          makeBook({
            id: "book-alpha",
            copies: [
              {
                id: "copy-alpha",
                bookId: "book-alpha",
                copyCode: "C-001",
                status: "borrowed",
                createdAt: "2026-08-01T00:00:00",
              },
            ],
          }),
        ],
        1,
      ),
    );

    const loans = await loadActiveLoans("user-1");

    expect(loans[0].hasActiveReservation).toBe(false);
  });
});
