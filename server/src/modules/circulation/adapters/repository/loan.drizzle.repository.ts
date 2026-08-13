import "reflect-metadata";

import { and, count, eq, inArray, sum } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { inject, injectable } from "tsyringe";

import {
  bookCopies,
  borrowingPolicies,
  fines,
  loans,
  reservations,
  systemSettings,
  users,
} from "../../../../infrastructure/database/schema";
import type {
  BookCopy,
  BorrowingPolicy,
  CopyStatus,
  FineRecord,
  LoanRecord,
  MemberType,
  UserRole,
} from "../../../../shared";
import { TOKENS } from "../../../tokens";
import type {
  ICreateFineInput,
  ICreateLoanInput,
  ILoanRepository,
  IMemberInfo,
  IReturnLoanInput,
} from "../../applications/ports/loan.repository";

type LoanRow = typeof loans.$inferSelect;
type PolicyRow = typeof borrowingPolicies.$inferSelect;
type FineRow = typeof fines.$inferSelect;
type CopyRow = typeof bookCopies.$inferSelect;

const ACTIVE_LOAN_STATUSES = ["active"] as const;
const ACTIVE_RESERVATION_STATUSES = ["waiting", "ready", "suspended"] as const;

function toLoanRecord(row: LoanRow): LoanRecord {
  return {
    id: row.id,
    copyId: row.copyId,
    userId: row.userId,
    courseReserveId: row.courseReserveId ?? undefined,
    borrowedAt: row.borrowedAt.toISOString(),
    dueAt: row.dueAt.toISOString(),
    returnedAt: row.returnedAt?.toISOString(),
    status: row.status,
    renewedCount: row.renewedCount,
    recalledAt: row.recalledAt?.toISOString(),
    loanPeriodDays: row.loanPeriodDays,
    dailyFineRate: Number(row.dailyFineRate),
    checkedOutBy: row.checkedOutBy ?? undefined,
    checkedInBy: row.checkedInBy ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toPolicy(row: PolicyRow): BorrowingPolicy {
  return {
    id: row.id,
    role: row.role as UserRole,
    memberType: row.memberType as MemberType,
    maxActiveLoans: row.maxActiveLoans,
    loanPeriodDays: row.loanPeriodDays,
    maxRenewals: row.maxRenewals,
    gracePeriodDays: row.gracePeriodDays,
    dailyFineRate: Number(row.dailyFineRate),
    maxUnpaidFine: Number(row.maxUnpaidFine),
    createdAt: row.createdAt.toISOString(),
  };
}

function toFine(row: FineRow): FineRecord {
  return {
    id: row.id,
    loanId: row.loanId ?? undefined,
    userId: row.userId,
    amount: Number(row.amount),
    reason: row.reason,
    paid: row.paid,
    paidAt: row.paidAt?.toISOString(),
    waived: row.waived,
    createdAt: row.createdAt.toISOString(),
  };
}

function toCopy(row: CopyRow): BookCopy {
  return {
    id: row.id,
    bookId: row.bookId,
    branchId: row.branchId ?? undefined,
    copyCode: row.copyCode,
    status: row.status as CopyStatus,
    shelfLocation: row.shelfLocation ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

@injectable()
export class DrizzleLoanRepository implements ILoanRepository {
  constructor(@inject(TOKENS.Db) private readonly db: PostgresJsDatabase) {}

  async findMemberById(userId: string): Promise<IMemberInfo | null> {
    const rows = await this.db
      .select({
        id: users.id,
        role: users.role,
        memberType: users.memberType,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      role: row.role as UserRole,
      memberType: row.memberType as MemberType,
      status: row.status,
    };
  }

  async findPoliciesByRole(role: UserRole): Promise<BorrowingPolicy[]> {
    const rows = await this.db
      .select()
      .from(borrowingPolicies)
      .where(eq(borrowingPolicies.role, role));
    return rows.map(toPolicy);
  }

  async findCopyByCode(copyCode: string): Promise<BookCopy | null> {
    const rows = await this.db
      .select()
      .from(bookCopies)
      .where(eq(bookCopies.copyCode, copyCode))
      .limit(1);
    const row = rows[0];
    return row ? toCopy(row) : null;
  }

  async findCopyById(copyId: string): Promise<BookCopy | null> {
    const rows = await this.db.select().from(bookCopies).where(eq(bookCopies.id, copyId)).limit(1);
    const row = rows[0];
    return row ? toCopy(row) : null;
  }

  async updateCopyStatus(copyId: string, status: CopyStatus): Promise<void> {
    await this.db.update(bookCopies).set({ status }).where(eq(bookCopies.id, copyId));
  }

  async countActiveLoansByUser(userId: string): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(loans)
      .where(and(eq(loans.userId, userId), inArray(loans.status, ACTIVE_LOAN_STATUSES)));
    return rows[0]?.value ?? 0;
  }

  async findActiveLoanByCopy(copyId: string): Promise<LoanRecord | null> {
    const rows = await this.db
      .select()
      .from(loans)
      .where(and(eq(loans.copyId, copyId), inArray(loans.status, ACTIVE_LOAN_STATUSES)))
      .limit(1);
    const row = rows[0];
    return row ? toLoanRecord(row) : null;
  }

  async findActiveLoanById(id: string): Promise<LoanRecord | null> {
    const rows = await this.db
      .select()
      .from(loans)
      .where(and(eq(loans.id, id), inArray(loans.status, ACTIVE_LOAN_STATUSES)))
      .limit(1);
    const row = rows[0];
    return row ? toLoanRecord(row) : null;
  }

  async createLoan(input: ICreateLoanInput): Promise<LoanRecord> {
    const rows = await this.db
      .insert(loans)
      .values({
        copyId: input.copyId,
        userId: input.userId,
        dueAt: new Date(input.dueAt),
        loanPeriodDays: input.loanPeriodDays,
        dailyFineRate: String(input.dailyFineRate),
        checkedOutBy: input.checkedOutBy,
      })
      .returning();
    return toLoanRecord(rows[0]!);
  }

  async returnLoan(id: string, input: IReturnLoanInput): Promise<LoanRecord | null> {
    const rows = await this.db
      .update(loans)
      .set({
        status: input.status,
        returnedAt: new Date(input.returnedAt),
        checkedInBy: input.checkedInBy,
      })
      .where(and(eq(loans.id, id), inArray(loans.status, ACTIVE_LOAN_STATUSES)))
      .returning();
    const row = rows[0];
    return row ? toLoanRecord(row) : null;
  }

  async updateRenewal(
    id: string,
    input: { renewedCount: number; dueAt: string },
  ): Promise<LoanRecord | null> {
    const rows = await this.db
      .update(loans)
      .set({
        renewedCount: input.renewedCount,
        dueAt: new Date(input.dueAt),
      })
      .where(and(eq(loans.id, id), inArray(loans.status, ACTIVE_LOAN_STATUSES)))
      .returning();
    const row = rows[0];
    return row ? toLoanRecord(row) : null;
  }

  async recallLoan(
    id: string,
    input: { recalledAt: string; dueAt: string },
  ): Promise<LoanRecord | null> {
    const rows = await this.db
      .update(loans)
      .set({
        dueAt: new Date(input.dueAt),
        recalledAt: new Date(input.recalledAt),
      })
      .where(and(eq(loans.id, id), inArray(loans.status, ACTIVE_LOAN_STATUSES)))
      .returning();
    const row = rows[0];
    return row ? toLoanRecord(row) : null;
  }

  async listActiveLoansByUser(userId: string): Promise<LoanRecord[]> {
    const rows = await this.db
      .select()
      .from(loans)
      .where(and(eq(loans.userId, userId), inArray(loans.status, ACTIVE_LOAN_STATUSES)))
      .orderBy(loans.dueAt);
    return rows.map(toLoanRecord);
  }

  async sumUnpaidFinesByUser(userId: string): Promise<number> {
    const rows = await this.db
      .select({ value: sum(fines.amount) })
      .from(fines)
      .where(and(eq(fines.userId, userId), eq(fines.paid, false)));
    return Number(rows[0]?.value ?? 0);
  }

  async insertFine(input: ICreateFineInput): Promise<FineRecord> {
    const rows = await this.db
      .insert(fines)
      .values({
        loanId: input.loanId,
        userId: input.userId,
        amount: String(input.amount),
        reason: input.reason,
      })
      .returning();
    return toFine(rows[0]!);
  }

  async hasActiveReservation(bookId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.bookId, bookId),
          inArray(reservations.status, ACTIVE_RESERVATION_STATUSES),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async getSystemSetting(key: string): Promise<unknown> {
    const rows = await this.db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    return rows[0]?.value ?? null;
  }
}
