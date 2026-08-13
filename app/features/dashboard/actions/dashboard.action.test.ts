import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LoanRecord } from "@libsys/shared";

import type { DashboardActiveLoanItem } from "../dashboard.types";

const mocks = vi.hoisted(() => ({
  loansActiveGet: vi.fn(),
  reservationsGet: vi.fn(),
  booksGet: vi.fn(),
  categoriesGet: vi.fn(),
}));

vi.mock("@/app/_shared/lib/eden-client", () => ({
  eden: {
    circulation: { loans: { active: { get: mocks.loansActiveGet } } },
    reservations: { get: mocks.reservationsGet },
    catalog: {
      books: { get: mocks.booksGet },
      categories: { get: mocks.categoriesGet },
    },
  },
}));

import { fetchDashboardData } from "./dashboard.action";

const NOW = new Date(2026, 7, 10, 12, 0, 0);

function edenOk<TData>(data: TData): {
  data: unknown;
  error: null;
  status: number;
  headers: object;
} {
  return { data: { success: true as const, data }, error: null, status: 200, headers: {} };
}

function edenOkPaginated<TData>(data: TData[]): {
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
      totalPages: 1,
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
    userId: "u-1",
    borrowedAt: "2026-08-10T12:00:00",
    dueAt: "2026-08-24T12:00:00",
    status: "active",
    renewedCount: 0,
    loanPeriodDays: 14,
    dailyFineRate: 5,
    createdAt: "2026-08-10T12:00:00",
    ...overrides,
  };
}

function makeActiveLoan(overrides: Partial<DashboardActiveLoanItem> = {}): DashboardActiveLoanItem {
  return {
    loan: makeLoan(),
    overdue: false,
    daysOverdue: 0,
    ...overrides,
  };
}

beforeEach(() => {
  for (const mock of [
    mocks.loansActiveGet,
    mocks.reservationsGet,
    mocks.booksGet,
    mocks.categoriesGet,
  ]) {
    mock.mockReset();
  }
  mocks.loansActiveGet.mockResolvedValue(edenOk({ loans: [] }));
  mocks.reservationsGet.mockResolvedValue(edenOkPaginated([]));
  mocks.booksGet.mockResolvedValue(edenOkPaginated([]));
  mocks.categoriesGet.mockResolvedValue(edenOk([]));
});

describe("fetchDashboardData", () => {
  it("ส่ง identity.userId ไปยัง endpoint loans active แล้วคำนวณ KPI จากผลลัพธ์จริง", async () => {
    const loans = [
      makeActiveLoan({ loan: makeLoan({ borrowedAt: "2026-08-10T08:30:00" }) }),
      makeActiveLoan({ loan: makeLoan({ borrowedAt: "2026-08-10T23:15:00" }) }),
      makeActiveLoan({
        loan: makeLoan({ borrowedAt: "2026-08-09T23:59:00" }),
        overdue: true,
        daysOverdue: 2,
      }),
    ];
    mocks.loansActiveGet.mockResolvedValue(edenOk({ loans }));

    const result = await fetchDashboardData({ userId: "u-1", userName: "นิสิตตัวอย่าง" }, NOW);

    expect(mocks.loansActiveGet).toHaveBeenCalledWith({ query: { userId: "u-1" } });
    expect(result.data.kpis.checkedOutToday).toBe(2);
    expect(result.data.kpis.overdue).toBe(1);
    expect(result.data.recentLoans).toHaveLength(3);
  });

  it("ไม่มี endpoint ค่าปรับ → เติม warning และ KPI ค่าปรับค้างชำระเป็น 0", async () => {
    const result = await fetchDashboardData({ userId: "u-1", userName: "นิสิตตัวอย่าง" }, NOW);

    expect(result.data.kpis.unpaidFines).toBe(0);
    expect(result.warnings).toContain("ไม่สามารถโหลดข้อมูลค่าปรับ");
  });
});
