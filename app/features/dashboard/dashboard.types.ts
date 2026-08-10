import type { FineRecord, LoanRecord, ReservationRecord } from "@libsys/shared";

export interface DashboardActiveLoanItem {
  loan: LoanRecord;
  overdue: boolean;
  daysOverdue: number;
}

export interface DashboardKpis {
  checkedOutToday: number;
  overdue: number;
  readyQueue: number;
  unpaidFines: number;
}

export interface DailyCheckoutCount {
  date: string;
  label: string;
  count: number;
}

export interface MonthlyTarget {
  achieved: number;
  target: number;
}

export interface CategoryStat {
  id: string;
  name: string;
  count: number;
}

export interface BookCategorySource {
  id: string;
  categoryId?: string;
}

export interface DashboardData {
  kpis: DashboardKpis;
  dailyCheckouts: DailyCheckoutCount[];
  monthlyTarget: MonthlyTarget;
  recentLoans: DashboardActiveLoanItem[];
  dueDates: string[];
  categoryStats: CategoryStat[];
}

export interface DashboardIdentity {
  userId: string | null;
  userName: string;
}

export type { FineRecord, LoanRecord, ReservationRecord };
