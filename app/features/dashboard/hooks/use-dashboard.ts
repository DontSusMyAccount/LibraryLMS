"use client";

import { eachDayOfInterval, format, isSameDay, parseISO, subDays } from "date-fns";
import { th } from "date-fns/locale";

import type {
  BookCategorySource,
  CategoryStat,
  DailyCheckoutCount,
  DashboardActiveLoanItem,
  DashboardKpis,
  FineRecord,
  ReservationRecord,
} from "../dashboard.types";
import { useDashboardStore } from "../stores/dashboard.store";

const CHART_DAYS = 30;
const RECENT_LOANS_LIMIT = 8;

export interface BuildKpisInput {
  loans: DashboardActiveLoanItem[];
  reservations: ReservationRecord[];
  fines: FineRecord[];
  now?: Date;
}

export function buildKpis({
  loans,
  reservations,
  fines,
  now = new Date(),
}: BuildKpisInput): DashboardKpis {
  const checkedOutToday = loans.filter((item) =>
    isSameDay(parseISO(item.loan.borrowedAt), now),
  ).length;
  const overdue = loans.filter((item) => item.overdue === true).length;
  const readyQueue = reservations.filter((reservation) => reservation.status === "ready").length;
  const unpaidFines = fines.filter((fine) => fine.paid === false && fine.waived === false).length;

  return {
    checkedOutToday,
    overdue,
    readyQueue,
    unpaidFines,
  };
}

export function buildDailyCheckouts(
  loans: DashboardActiveLoanItem[],
  now: Date,
  days = CHART_DAYS,
): DailyCheckoutCount[] {
  const dayStart = subDays(startOfDayLocal(now), days - 1);
  const daysInRange = eachDayOfInterval({ start: dayStart, end: startOfDayLocal(now) });

  return daysInRange.map((day) => {
    const borrowKey = toLocalDayKey(day);
    const count = loans.filter(
      (item) => toLocalDayKey(parseISO(item.loan.borrowedAt)) === borrowKey,
    ).length;
    return {
      date: borrowKey,
      label: format(day, "d MMM", { locale: th }),
      count,
    };
  });
}

export function buildRecentLoans(
  loans: DashboardActiveLoanItem[],
  limit = RECENT_LOANS_LIMIT,
): DashboardActiveLoanItem[] {
  return [...loans]
    .sort((a, b) => b.loan.borrowedAt.localeCompare(a.loan.borrowedAt))
    .slice(0, limit);
}

export function buildDueDates(loans: DashboardActiveLoanItem[], now: Date): string[] {
  const monthPrefix = toLocalDayKey(now).slice(0, 7);
  return loans
    .map((item) => item.loan.dueAt)
    .filter((dueAt) => {
      const key = toLocalDayKey(parseISO(dueAt));
      return key.startsWith(monthPrefix);
    });
}

export interface CategoryNode {
  id: string;
  name: string;
  parentId?: string;
  children?: CategoryNode[];
}

export function buildCategoryStats(
  books: BookCategorySource[],
  categories: CategoryNode[],
): CategoryStat[] {
  const flattened = flattenCategories(categories);
  const counts = new Map<string, number>();
  for (const book of books) {
    if (book.categoryId !== undefined) {
      counts.set(book.categoryId, (counts.get(book.categoryId) ?? 0) + 1);
    }
  }

  return flattened
    .map((category) => ({
      id: category.id,
      name: category.name,
      count: counts.get(category.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function buildMonthlyTarget(
  count: number,
  target: number,
): { achieved: number; target: number } {
  return { achieved: count, target };
}

export function useDashboard() {
  const data = useDashboardStore((state) => state.data);
  const isLoading = useDashboardStore((state) => state.isLoading);
  const isError = useDashboardStore((state) => state.isError);
  const errorMessage = useDashboardStore((state) => state.errorMessage);
  const load = useDashboardStore((state) => state.load);

  return { data, isLoading, isError, errorMessage, load };
}

function startOfDayLocal(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [
    node,
    ...(node.children ? flattenCategories(node.children) : []),
  ]);
}
