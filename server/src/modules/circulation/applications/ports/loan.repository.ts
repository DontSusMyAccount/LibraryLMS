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
import type { IAuditRepository } from "../../../shared/applications/ports/audit.repository";

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

export const loanRepositoryToken = Symbol("LoanRepository").toString();

/**
 * Unit of work สำหรับเขียนหลายตารางให้ atomic ภายใน transaction เดียว
 * — loans + audit เขียน/rollback พร้อมกัน
 */
export interface ICheckoutUnitOfWork {
  loans: ILoanRepository;
  audit: IAuditRepository;
}

/**
 * Repository ที่เปิด transaction boundary ได้ — ใช้กับ usecase ที่ต้องเขียน
 * หลายตารางพร้อมกัน (checkout) ถ้า fn throw → rollback ทั้งหมด
 */
export interface ITransactionalLoanRepository extends ILoanRepository {
  runTransaction<T>(fn: (unit: ICheckoutUnitOfWork) => Promise<T>): Promise<T>;
}

export const transactionalLoanRepositoryToken = Symbol("TransactionalLoanRepository").toString();
