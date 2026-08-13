"use client";

import { DueDateStamp } from "@/components/due-date-stamp";
import type { DueDateStampData } from "@/app/_shared/types/due-date-stamp";

import type { MeProfile, MyLoanItem } from "../my-loans.types";

interface DueDateCardProps {
  loan: MyLoanItem;
  profile: MeProfile;
  className?: string;
}

export function DueDateCard({ loan, profile, className }: DueDateCardProps) {
  const stamp: DueDateStampData = {
    dueDate: loan.loan.dueAt,
    memberName: profile.user.fullName,
    copyCodes: [loan.copyCode],
  };

  return <DueDateStamp stamp={stamp} className={className} />;
}
