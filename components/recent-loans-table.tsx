"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { InboxIcon, SearchIcon } from "lucide-react";

import type { DashboardActiveLoanItem } from "@/app/features/dashboard/dashboard.types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StatusFilter = "all" | "active" | "overdue";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "active", label: "ยืมอยู่" },
  { value: "overdue", label: "ค้างส่ง" },
];

const RECENT_LOANS_TITLE = "การยืมล่าสุด";
const EMPTY_MESSAGE = "ไม่พบข้อมูล";
const SEARCH_PLACEHOLDER = "ค้นหาด้วยรหัสสำเนา หรือรหัสสมาชิก...";

const DATE_TIME_FORMAT = "d MMM yyyy HH:mm";

interface RecentLoansTableProps {
  loans: DashboardActiveLoanItem[];
  className?: string;
}

function RecentLoansTable({ loans, className }: RecentLoansTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filteredLoans = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return loans.filter((item) => {
      if (status === "active" && item.overdue) {
        return false;
      }
      if (status === "overdue" && !item.overdue) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return (
        item.loan.copyId.toLowerCase().includes(normalizedSearch) ||
        item.loan.userId.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [loans, search, status]);

  return (
    <section
      data-slot="recent-loans-table"
      className={`rounded-lg bg-card p-5 shadow-card ${className ?? ""}`}
    >
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-title font-semibold text-foreground">{RECENT_LOANS_TITLE}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">รายการยืมล่าสุดที่ยังอยู่ระบบ</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={SEARCH_PLACEHOLDER}
              aria-label="ค้นหารายการยืม"
              className="pl-9 sm:w-64"
            />
          </div>

          <div className="flex items-center gap-1 rounded-full bg-muted p-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                aria-pressed={status === filter.value}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  status === filter.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {filteredLoans.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-muted-foreground">
          <InboxIcon className="size-7 opacity-60" />
          <p className="text-sm">{EMPTY_MESSAGE}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสสำเนา</TableHead>
              <TableHead>รหัสสมาชิก</TableHead>
              <TableHead>ยืมเมื่อ</TableHead>
              <TableHead>กำหนดคืน</TableHead>
              <TableHead>ค้างส่ง</TableHead>
              <TableHead className="text-right">สถานะ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLoans.map((item) => (
              <TableRow key={item.loan.id}>
                <TableCell className="font-medium text-foreground tabular-nums">
                  {item.loan.copyId.slice(0, 8)}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {item.loan.userId.slice(0, 8)}
                </TableCell>
                <TableCell>
                  {format(parseISO(item.loan.borrowedAt), DATE_TIME_FORMAT, { locale: th })}
                </TableCell>
                <TableCell>
                  {format(parseISO(item.loan.dueAt), DATE_TIME_FORMAT, { locale: th })}
                </TableCell>
                <TableCell>
                  <span className="tabular-nums text-muted-foreground">
                    {item.overdue ? `${item.daysOverdue} วัน` : "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {item.overdue ? (
                    <Badge variant="destructive" dot>
                      ค้างส่ง
                    </Badge>
                  ) : (
                    <Badge variant="default" dot>
                      ยืมอยู่
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

export { RecentLoansTable };

export type { RecentLoansTableProps, StatusFilter };
