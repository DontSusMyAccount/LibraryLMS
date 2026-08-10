import { addDays, differenceInCalendarDays, isAfter } from "date-fns";

import { DomainForbiddenError } from "./errors";

export interface LoanPeriodShape {
  loanPeriodDays: number;
}

export interface LoanPolicyShape extends LoanPeriodShape {
  maxRenewals: number;
}

export interface RenewLoanInput {
  loan: { dueAt: Date; renewedCount: number };
  policy: LoanPolicyShape;
  hasActiveReservation: boolean;
}

export interface RenewLoanResult {
  dueAt: Date;
  renewedCount: number;
}

export interface RecallLoanInput {
  loan: { dueAt: Date };
  now: Date;
  recallBufferDays: number;
}

export interface CalculateFineInput {
  now: Date;
  dueAt: Date;
  gracePeriodDays: number;
  dailyFineRate: number;
}

const RENEW_RESERVATION_MESSAGE = "ไม่สามารถต่ออายุได้ เนื่องจากมีคิวจองหนังสือเล่มนี้อยู่";
const RENEW_LIMIT_MESSAGE = "ต่ออายุไม่ได้ เกินจำนวนครั้งสูงสุดที่กำหนด";

export function calcDueDate(borrowedAt: Date, policy: LoanPeriodShape): Date {
  return addDays(borrowedAt, policy.loanPeriodDays);
}

export function renewLoan(
  loan: { dueAt: Date; renewedCount: number },
  policy: LoanPolicyShape,
  hasActiveReservation: boolean,
): RenewLoanResult {
  if (hasActiveReservation) {
    throw new DomainForbiddenError(RENEW_RESERVATION_MESSAGE);
  }
  if (loan.renewedCount > policy.maxRenewals) {
    throw new DomainForbiddenError(RENEW_LIMIT_MESSAGE);
  }
  return {
    dueAt: addDays(loan.dueAt, policy.loanPeriodDays),
    renewedCount: loan.renewedCount + 1,
  };
}

export function isOverdue(now: Date, dueAt: Date, gracePeriodDays: number): boolean {
  return isAfter(now, addDays(dueAt, gracePeriodDays));
}

export function calculateOverdueDays(now: Date, dueAt: Date, gracePeriodDays: number): number {
  return Math.max(0, differenceInCalendarDays(now, addDays(dueAt, gracePeriodDays)));
}

export function calculateFine(input: CalculateFineInput): number {
  return calculateOverdueDays(input.now, input.dueAt, input.gracePeriodDays) * input.dailyFineRate;
}

export function recallLoan(input: RecallLoanInput): Date {
  const recalledDue = addDays(input.now, input.recallBufferDays);
  if (recalledDue.getTime() >= input.loan.dueAt.getTime()) {
    return input.loan.dueAt;
  }
  return recalledDue;
}
