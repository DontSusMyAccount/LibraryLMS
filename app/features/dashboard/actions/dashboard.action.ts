import type { FineRecord, ReservationRecord } from "@libsys/shared";

import { eden } from "@/app/_shared/lib/eden-client";
import { edenRequest } from "@/app/_shared/lib/eden-helpers";

import type {
  BookCategorySource,
  CategoryStat,
  DailyCheckoutCount,
  DashboardActiveLoanItem,
  DashboardData,
  DashboardIdentity,
  DashboardKpis,
  MonthlyTarget,
} from "../dashboard.types";
import type { CategoryNode } from "../hooks/use-dashboard";
import {
  buildCategoryStats,
  buildDailyCheckouts,
  buildDueDates,
  buildKpis,
  buildRecentLoans,
} from "../hooks/use-dashboard";

const DEFAULT_MONTHLY_TARGET = 60;
const FETCH_LIMIT = 100;

const FALLBACK_ERROR_MESSAGE = "เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่";
const FINES_UNAVAILABLE_MESSAGE = "ไม่สามารถโหลดข้อมูลค่าปรับ";

export interface DashboardSourceData {
  loans: DashboardActiveLoanItem[];
  reservations: ReservationRecord[];
  fines: FineRecord[];
  books: BookCategorySource[];
  categories: CategoryNode[];
}

export interface DashboardFetchResult {
  data: DashboardData;
  warnings: string[];
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

async function loadActiveLoans(userId: string | null): Promise<DashboardActiveLoanItem[]> {
  if (!userId) {
    return [];
  }
  const result = await edenRequest(await eden.circulation.loans.active.get({ query: { userId } }));
  return result.loans.map((item) => ({
    loan: item.loan,
    overdue: item.overdue,
    daysOverdue: item.daysOverdue,
  }));
}

async function loadReservations(): Promise<ReservationRecord[]> {
  const result = await edenRequest(
    await eden.reservations.get({ query: { page: 1, limit: FETCH_LIMIT } }),
  );
  return result.data;
}

async function loadBooks(): Promise<BookCategorySource[]> {
  const result = await edenRequest(
    await eden.catalog.books.get({ query: { page: 1, limit: FETCH_LIMIT } }),
  );
  return result.data.map((book) => ({ id: book.id, categoryId: book.categoryId }));
}

async function loadCategories(): Promise<CategoryNode[]> {
  const result = await edenRequest(await eden.catalog.categories.get());
  return result as unknown as CategoryNode[];
}

async function loadUnpaidFines(): Promise<FineRecord[]> {
  throw new Error(FINES_UNAVAILABLE_MESSAGE);
}

export async function fetchDashboardData(
  identity: DashboardIdentity,
  now = new Date(),
): Promise<DashboardFetchResult> {
  const warnings: string[] = [];

  const loans = await runSafely(() => loadActiveLoans(identity.userId), [], warnings);
  const reservations = await runSafely(loadReservations, [], warnings);
  const books = await runSafely(loadBooks, [], warnings);
  const categories = await runSafely(loadCategories, [], warnings);
  const fines = await runSafely(loadUnpaidFines, [], warnings);

  const kpis: DashboardKpis = buildKpis({ loans, reservations, fines, now });
  const dailyCheckouts: DailyCheckoutCount[] = buildDailyCheckouts(loans, now);
  const recentLoans: DashboardActiveLoanItem[] = buildRecentLoans(loans);
  const dueDates = buildDueDates(loans, now);
  const categoryStats: CategoryStat[] = buildCategoryStats(books, categories);
  const achievedThisMonth = loans.filter((item) =>
    isSameMonth(new Date(item.loan.borrowedAt), now),
  ).length;
  const monthlyTarget: MonthlyTarget = {
    achieved: achievedThisMonth,
    target: DEFAULT_MONTHLY_TARGET,
  };

  return {
    data: {
      kpis,
      dailyCheckouts,
      monthlyTarget,
      recentLoans,
      dueDates,
      categoryStats,
    },
    warnings,
  };
}

async function runSafely<T>(task: () => Promise<T>, fallback: T, warnings: string[]): Promise<T> {
  try {
    return await task();
  } catch (error) {
    warnings.push(toErrorMessage(error));
    return fallback;
  }
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
