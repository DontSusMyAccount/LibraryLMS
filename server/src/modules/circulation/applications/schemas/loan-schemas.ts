import type { CheckinResult, LoanRecord } from "../../../../shared";

export interface ICheckoutCommand {
  userId: string;
  copyCode: string;
}

export interface ICheckoutResult {
  loan: LoanRecord;
  dueDate: string;
}

export interface ICheckinCommand {
  copyCode: string;
}

export type ICheckinResult = CheckinResult;

export interface IRenewCommand {
  id: string;
}

export interface IRenewResult {
  loan: LoanRecord;
  dueDate: string;
}

export interface IRecallCommand {
  id: string;
}

export interface IRecallResult {
  loan: LoanRecord;
  dueDate: string;
}

export interface IListActiveLoansQuery {
  userId: string;
}

export interface IActiveLoanItem {
  loan: LoanRecord;
  overdue: boolean;
  daysOverdue: number;
}

export interface IListActiveLoansResult {
  loans: IActiveLoanItem[];
}
