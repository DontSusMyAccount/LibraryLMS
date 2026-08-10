"use client";

import { useCallback, useEffect } from "react";
import {
  BookOpenCheckIcon,
  BookUserIcon,
  ClockIcon,
  ListChecksIcon,
  RefreshCcwIcon,
  ReceiptTextIcon,
} from "lucide-react";

import type { DashboardIdentity } from "./dashboard.types";
import { useDashboard } from "./hooks/use-dashboard";
import { CategoryStatsCard } from "@/components/category-stats-card";
import { KpiCard } from "@/components/kpi-card";
import { MiniCalendar } from "@/components/mini-calendar";
import { RecentLoansTable } from "@/components/recent-loans-table";
import { RevenueChart } from "@/components/revenue-chart";
import { TargetRing } from "@/components/target-ring";
import { Skeleton } from "@/components/ui/skeleton";

const UNKNOWN_USER = "ผู้ดูแลระบบ";

interface DashboardPageProps {
  identity?: DashboardIdentity;
}

function getGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) {
    return "สวัสดีตอนเช้า";
  }
  if (hour < 17) {
    return "สวัสดีตอนบ่าย";
  }
  return "สวัสดีตอนเย็น";
}

function DashboardLoading() {
  return (
    <div data-slot="dashboard-loading" className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-36 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-lg lg:col-span-2" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export function DashboardPage({ identity }: DashboardPageProps) {
  const { data, isLoading, isError, errorMessage, load } = useDashboard();

  useEffect(() => {
    void load(identity ?? { userId: null, userName: "" });
  }, [identity, load]);

  const handleRetry = useCallback(() => {
    void load(identity ?? { userId: null, userName: "" });
  }, [identity, load]);

  const userName = identity?.userName?.trim() || UNKNOWN_USER;

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (isError || data === null) {
    return (
      <div
        data-slot="dashboard-error"
        className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-accent-coral/10 text-accent-coral">
          <ClockIcon className="size-7" />
        </div>
        <h1 className="text-title font-semibold text-foreground">โหลดข้อมูลไม่สำเร็จ</h1>
        <p className="max-w-sm text-body text-muted-foreground">
          {errorMessage ?? "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่"}
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          <RefreshCcwIcon className="size-4" />
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  const { kpis, dailyCheckouts, monthlyTarget, recentLoans, dueDates, categoryStats } = data;

  return (
    <div data-slot="dashboard-page" className="flex flex-col gap-6">
      <section
        data-slot="dashboard-heading"
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-title font-semibold text-foreground">
            {getGreeting(new Date())}, {userName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">ภาพรวมการใช้งานห้องสมุดวันนี้</p>
        </div>
      </section>

      <section data-slot="dashboard-kpis" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={BookOpenCheckIcon}
          label="ยืมวันนี้"
          value={kpis.checkedOutToday}
          tone="brand"
          delta={null}
        />
        <KpiCard
          icon={BookUserIcon}
          label="ยืมค้างส่ง"
          value={kpis.overdue}
          tone="coral"
          delta={null}
        />
        <KpiCard
          icon={ListChecksIcon}
          label="คิวจองพร้อมรับ"
          value={kpis.readyQueue}
          tone="amber"
          delta={null}
        />
        <KpiCard
          icon={ReceiptTextIcon}
          label="ค่าปรับค้างชำระ"
          value={kpis.unpaidFines}
          tone="mint"
          delta={null}
        />
      </section>

      <section data-slot="dashboard-charts" className="grid gap-4 lg:grid-cols-3">
        <RevenueChart data={dailyCheckouts} className="lg:col-span-2" />
        <TargetRing target={monthlyTarget} />
      </section>

      <RecentLoansTable loans={recentLoans} />

      <section data-slot="dashboard-bottom" className="grid gap-4 lg:grid-cols-2">
        <MiniCalendar dueDates={dueDates} />
        <CategoryStatsCard stats={categoryStats} />
      </section>
    </div>
  );
}

export default DashboardPage;

export type { DashboardPageProps };
