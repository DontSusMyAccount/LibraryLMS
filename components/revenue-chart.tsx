import { CalendarRangeIcon } from "lucide-react";

import type { DailyCheckoutCount } from "@/app/features/dashboard/dashboard.types";
import { TrendChart } from "@/components/ui/chart";

interface RevenueChartProps {
  data: DailyCheckoutCount[];
  className?: string;
}

function RevenueChart({ data, className }: RevenueChartProps) {
  const chartData = data.map((item) => ({ label: item.label, value: item.count }));
  const isEmpty = data.every((item) => item.count === 0);

  return (
    <section
      data-slot="revenue-chart"
      className={`rounded-lg bg-card p-5 shadow-card ${className ?? ""}`}
    >
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-title font-semibold text-foreground">การยืม 30 วันล่าสุด</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">จำนวนรายการยืมต่อวัน</p>
        </div>
        <CalendarRangeIcon className="size-5 text-muted-foreground" />
      </header>

      {isEmpty ? (
        <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-muted-foreground">
          <CalendarRangeIcon className="size-7 opacity-60" />
          <p className="text-sm">ไม่พบข้อมูลการยืมในช่วง 30 วันนี้</p>
        </div>
      ) : (
        <TrendChart data={chartData} height={280} />
      )}
    </section>
  );
}

export { RevenueChart };

export type { RevenueChartProps };
