import { BarChart3Icon } from "lucide-react";

import type { CategoryStat } from "@/app/features/dashboard/dashboard.types";

interface CategoryStatsCardProps {
  stats: CategoryStat[];
  className?: string;
}

function getMaxCount(stats: CategoryStat[]): number {
  return stats.length > 0 ? Math.max(...stats.map((stat) => stat.count), 1) : 1;
}

function CategoryStatsCard({ stats, className }: CategoryStatsCardProps) {
  const maxCount = getMaxCount(stats);

  return (
    <section
      data-slot="category-stats"
      className={`rounded-lg bg-card p-5 shadow-card ${className ?? ""}`}
    >
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-title font-semibold text-foreground">สถิติยืมตามหมวด</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">ภาพรวมรายการยืมจากคลังหนังสือ</p>
        </div>
        <BarChart3Icon className="size-5 text-muted-foreground" />
      </header>

      {stats.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-muted-foreground">
          <BarChart3Icon className="size-7 opacity-60" />
          <p className="text-sm">ไม่พบข้อมูล</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {stats.map((stat) => (
            <li key={stat.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-foreground">{stat.name}</span>
                <span className="tabular-nums font-medium text-muted-foreground">
                  {stat.count.toLocaleString("th-TH")}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
                  style={{ width: `${Math.max(2, (stat.count / maxCount) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export { CategoryStatsCard };

export type { CategoryStatsCardProps };
