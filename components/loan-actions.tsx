"use client";

import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarClockIcon, RotateCcwIcon, SirenIcon } from "lucide-react";

import type { ActiveLoanItem } from "@/app/features/circulation/circulation.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LoanActionsProps {
  loans: ActiveLoanItem[];
  maxRenewals: number;
  isLoansLoading: boolean;
  isBusy: boolean;
  canRenew: (loanId: string) => boolean;
  onRenew: (loanId: string) => Promise<boolean>;
  onRecall: (loanId: string) => Promise<boolean>;
  className?: string;
}

const DATE_FORMAT = "d MMM yyyy";

export function LoanActions({
  loans,
  maxRenewals,
  isLoansLoading,
  isBusy,
  canRenew,
  onRenew,
  onRecall,
  className,
}: LoanActionsProps) {
  return (
    <section
      data-slot="loan-actions"
      className={`rounded-lg bg-card p-5 shadow-card ${className ?? ""}`}
    >
      <header className="mb-4">
        <h2 className="text-title font-semibold text-foreground">รายการยืมค้าง</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          ต่ออายุหรือเรียกคืนหนังสือก่อนกำหนดของสมาชิกที่เลือก
        </p>
      </header>

      {isLoansLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : loans.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <CalendarClockIcon className="size-7 opacity-60" />
          <p className="text-sm">ไม่มีรายการยืมค้างของสมาชิกรายนี้</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสสำเนา</TableHead>
              <TableHead>ยืมเมื่อ</TableHead>
              <TableHead>กำหนดคืน</TableHead>
              <TableHead>ต่ออายุแล้ว</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((item) => {
              const renewDisabled = isBusy || !canRenew(item.loan.id);
              const renewReason = renewDisabled
                ? renewDisabledReason(item, maxRenewals)
                : undefined;
              return (
                <TableRow key={item.loan.id}>
                  <TableCell className="font-medium tabular-nums text-foreground">
                    {item.loan.copyId.slice(0, 8)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {format(parseISO(item.loan.borrowedAt), DATE_FORMAT, { locale: th })}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {format(parseISO(item.loan.dueAt), DATE_FORMAT, { locale: th })}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    <span className="text-muted-foreground">
                      {item.loan.renewedCount}
                      <span className="mx-1 text-muted-foreground/60">/</span>
                      {maxRenewals}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.overdue ? (
                      <Badge variant="destructive" dot>
                        ค้างส่ง {item.daysOverdue} วัน
                      </Badge>
                    ) : (
                      <Badge variant="default" dot>
                        ยืมอยู่
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void onRenew(item.loan.id)}
                        disabled={renewDisabled}
                        title={renewReason}
                      >
                        <RotateCcwIcon />
                        ต่ออายุ
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void onRecall(item.loan.id)}
                        disabled={isBusy}
                      >
                        <SirenIcon />
                        เรียกคืน
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

function renewDisabledReason(item: ActiveLoanItem, maxRenewals: number): string {
  if (item.loan.renewedCount >= maxRenewals) {
    return "ต่ออายุครบจำนวนครั้งแล้ว";
  }
  if (item.hasActiveReservation) {
    return "มีคิวรอจองหนังสือเล่มนี้อยู่";
  }
  return "กำลังดำเนินการ";
}

export type { LoanActionsProps };
