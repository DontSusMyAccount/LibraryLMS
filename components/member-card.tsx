"use client";

import {
  BadgeCheckIcon,
  BanIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  BookUserIcon,
} from "lucide-react";

import type { MemberCardData } from "@/app/features/circulation/circulation.types";
import { formatBath } from "@/app/features/circulation/circulation.format";
import { Badge } from "@/components/ui/badge";

interface MemberCardProps {
  member: MemberCardData;
  className?: string;
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`;
  }
  return fullName.slice(0, 2);
}

export function MemberCard({ member, className }: MemberCardProps) {
  const { user, activeLoansCount, overdueCount, finesTotal, isSuspended, maxRenewals } = member;

  return (
    <section
      data-slot="member-card"
      className={`rounded-lg bg-card p-5 shadow-card ${className ?? ""}`}
    >
      <header className="flex items-center gap-3">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            isSuspended
              ? "bg-accent-coral/10 text-accent-coral"
              : "bg-brand-500/10 text-brand-600 dark:text-brand-300"
          }`}
        >
          {initialsOf(user.fullName)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-title font-semibold text-foreground">{user.fullName}</h2>
            {isSuspended ? (
              <Badge variant="destructive" dot>
                ถูกระงับ
              </Badge>
            ) : (
              <Badge variant="default" dot>
                สมาชิกปกติ
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {user.studentOrStaffId ?? user.id.slice(0, 8)} · {memberLabel(user.role)}
          </p>
        </div>
      </header>

      {isSuspended && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent-coral/30 bg-accent-coral/10 px-3 py-2.5 text-sm text-ink-body">
          <BanIcon className="mt-0.5 size-4 shrink-0 text-accent-coral" />
          <p>สมาชิกถูกระงับสิทธิ์ ไม่สามารถยืมหนังสือได้</p>
        </div>
      )}

      <dl className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/60 px-3 py-2.5">
          <dt className="flex items-center gap-1 text-caption text-muted-foreground">
            <BookUserIcon className="size-3.5" />
            ยืมอยู่
          </dt>
          <dd className="mt-1 text-title font-semibold tabular-nums text-foreground">
            {activeLoansCount}
          </dd>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2.5">
          <dt className="flex items-center gap-1 text-caption text-muted-foreground">
            <RotateCcwIcon className="size-3.5" />
            ค้างส่ง
          </dt>
          <dd className="mt-1 text-title font-semibold tabular-nums text-foreground">
            {overdueCount}
          </dd>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2.5">
          <dt className="flex items-center gap-1 text-caption text-muted-foreground">
            <ReceiptTextIcon className="size-3.5" />
            ค่าปรับ
          </dt>
          <dd className="mt-1 text-title font-semibold tabular-nums text-foreground">
            {formatBath(finesTotal)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 flex items-center gap-1.5 text-caption text-muted-foreground">
        <BadgeCheckIcon className="size-3.5 text-brand-500" />
        ต่ออายุได้มากสุด {maxRenewals} ครั้ง · หากมีคิวรอจองจะต่อไม่ได้
      </p>
    </section>
  );
}

function memberLabel(role: string): string {
  switch (role) {
    case "student":
      return "นักศึกษา";
    case "faculty":
      return "อาจารย์";
    case "staff":
      return "บุคลากร";
    case "librarian":
      return "บรรณารักษ์";
    default:
      return "ผู้ดูแลระบบ";
  }
}

export type { MemberCardProps };
