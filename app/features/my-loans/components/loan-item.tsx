"use client";

import Link from "next/link";
import { BookOpenTextIcon, CalendarClockIcon, RefreshCcwIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatThaiDate } from "@/app/_shared/lib/format-thai";

import type { MyLoanItem } from "../my-loans.types";

interface LoanItemProps {
  item: MyLoanItem;
  renewing: boolean;
  onRenew?: (loanId: string) => void;
}

const STATUS_LABELS = {
  active: "à¸¢à¸·à¸¡à¸­à¸¢à¸¹à¹ˆ",
  overdue: "à¹€à¸¥à¸¢à¸à¸³à¸«à¸™à¸”",
  returned: "à¸„à¸·à¸™à¹à¸¥à¹‰à¸§",
  lost: "à¸ªà¸¹à¸à¸«à¸²à¸¢",
} as const;

export function LoanItem({ item, renewing, onRenew = () => undefined }: LoanItemProps) {
  const { loan, bookTitle, copyCode } = item;
  const isOverdue = item.overdue;
  const statusLabel = STATUS_LABELS[loan.status] ?? loan.status;

  return (
    <Card data-slot="loan-item" size="sm" className="gap-3">
      <CardContent className="flex items-start gap-3">
        <Link
          href={`/books/${item.bookId}`}
          aria-label={`à¸”à¸¹à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸” ${bookTitle}`}
          className="shrink-0 rounded-md focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:outline-none"
        >
          <div className="flex size-14 items-center justify-center overflow-hidden rounded-md bg-muted">
            {item.bookCoverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.bookCoverUrl}
                alt={`à¸›à¸à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­ ${bookTitle}`}
                className="size-full object-cover"
              />
            ) : (
              <BookOpenTextIcon className="size-6 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/books/${item.bookId}`}
              className="line-clamp-2 text-sm leading-snug font-semibold text-foreground hover:text-brand-600 focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:outline-none dark:hover:text-brand-300"
            >
              {bookTitle}
            </Link>
            <Badge
              variant={
                isOverdue ? "destructive" : loan.status === "active" ? "default" : "secondary"
              }
            >
              {statusLabel}
            </Badge>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            à¸ªà¸³à¹€à¸™à¸²{" "}
            <span className="font-medium tabular-nums text-foreground">{copyCode}</span> Â·
            à¸¢à¸·à¸¡à¹€à¸¡à¸·à¹ˆà¸­ {formatThaiDate(loan.borrowedAt)}
          </p>
          <p
            className={
              isOverdue
                ? "mt-0.5 text-xs font-medium text-accent-coral"
                : "mt-0.5 text-xs text-muted-foreground"
            }
          >
            <CalendarClockIcon className="mr-1 inline size-3.5" aria-hidden="true" />
            {isOverdue
              ? `à¹€à¸¥à¸¢à¸à¸³à¸«à¸™à¸” ${item.daysOverdue} à¸§à¸±à¸™ â€” à¸•à¹‰à¸­à¸‡à¸„à¸·à¸™`
              : `à¸à¸³à¸«à¸™à¸”à¸„à¸·à¸™ ${formatThaiDate(loan.dueAt)}`}
          </p>

          {loan.status === "active" && !isOverdue && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={renewing || !item.canRenew}
              onClick={() => onRenew(loan.id)}
            >
              <RefreshCcwIcon />
              {renewing
                ? "à¸à¸³à¸¥à¸±à¸‡à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸..."
                : item.canRenew
                  ? "à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸"
                  : "à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸à¹„à¸¡à¹ˆà¹„à¸”à¹‰"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
