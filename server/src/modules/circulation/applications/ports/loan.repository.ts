import type {
  BookCopy,
  BorrowingPolicy,
  CopyStatus,
  FineReason,
  FineRecord,
  LoanRecord,
  MemberType,
  UserRole,
  UserStatus,
} from "../../../../shared";

export const loanRepositoryToken = Symbol("LoanRepository").toString();

export interface IMemberInfo {
  id: string;
  role: UserRole;
  memberType: MemberType;
  status: UserStatus;
}

export interface ICreateLoanInput {
  copyId: string;
  userId: string;
  dueAt: string;
  loanPeriodDays: number;
  dailyFineRate: number;
  checkedOutBy?: string;
}

export interface IReturnLoanInput {
  status: "returned" | "lost";
  returnedAt: string;
  checkedInBy?: string;
}

export interface ICreateFineInput {
  loanId: string;
  userId: string;
  amount: number;
  reason: FineReason;
}

export interface ILoanRepository {
  findMemberById(userId: string): Promise<IMemberInfo | null>;
  findPoliciesByRole(role: UserRole): Promise<BorrowingPolicy[]>;
  findCopyByCode(copyCode: string): Promise<BookCopy | null>;
  findCopyById(copyId: string): Promise<BookCopy | null>;
  updateCopyStatus(copyId: string, status: CopyStatus): Promise<void>;
  countActiveLoansByUser(userId: string): Promise<number>;
  findActiveLoanByCopy(copyId: string): Promise<LoanRecord | null>;
  findActiveLoanById(id: string): Promise<LoanRecord | null>;
  createLoan(input: ICreateLoanInput): Promise<LoanRecord>;
  returnLoan(id: string, input: IReturnLoanInput): Promise<LoanRecord | null>;
  updateRenewal(
    id: string,
    input: { renewedCount: number; dueAt: string },
  ): Promise<LoanRecord | null>;
  recallLoan(id: string, input: { recalledAt: string; dueAt: string }): Promise<LoanRecord | null>;
  listActiveLoansByUser(userId: string): Promise<LoanRecord[]>;
  sumUnpaidFinesByUser(userId: string): Promise<number>;
  insertFine(input: ICreateFineInput): Promise<FineRecord>;
  hasActiveReservation(bookId: string): Promise<boolean>;
  getSystemSetting(key: string): Promise<unknown>;
}
