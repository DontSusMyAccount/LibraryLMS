import "reflect-metadata";

import { desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { inject, injectable } from "tsyringe";

import {
  bookCopies,
  books,
  fines,
  loans,
  reservations,
} from "../../../../infrastructure/database/schema";
import type { FineRecord, LoanRecord, ReservationRecord } from "../../../../shared";
import { TOKENS } from "../../../tokens";
import type {
  IMeRepository,
  IMyLoanListItem,
  IMyReservationListItem,
} from "../../applications/ports/me.repository";

type LoanRow = typeof loans.$inferSelect;
type ReservationRow = typeof reservations.$inferSelect;
type FineRow = typeof fines.$inferSelect;

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

function toReservationRecord(row: ReservationRow): ReservationRecord {
  return {
    id: row.id,
    bookId: row.bookId,
    userId: row.userId,
    branchId: row.branchId ?? undefined,
    status: row.status,
    reservedAt: row.reservedAt.toISOString(),
    readyAt: row.readyAt?.toISOString(),
    pickupDeadline: row.pickupDeadline?.toISOString(),
    fulfilledLoanId: row.fulfilledLoanId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toFineRecord(row: FineRow): FineRecord {
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

@injectable()
export class DrizzleMeRepository implements IMeRepository {
  constructor(@inject(TOKENS.Db) private readonly db: PostgresJsDatabase) {}

  /** คืนทั้ง active + ประวัติที่คืนแล้ว — canRenew ใน usecase กรอง status active เอง */
  async listLoansByUser(userId: string): Promise<IMyLoanListItem[]> {
    const rows = await this.db
      .select({
        loan: loans,
        bookId: books.id,
        bookTitle: books.title,
        bookCoverUrl: books.coverUrl,
        copyCode: bookCopies.copyCode,
      })
      .from(loans)
      .innerJoin(bookCopies, eq(loans.copyId, bookCopies.id))
      .innerJoin(books, eq(bookCopies.bookId, books.id))
      .where(eq(loans.userId, userId))
      .orderBy(desc(loans.dueAt));

    return rows.map((row) => ({
      loan: toLoanRecord(row.loan),
      bookId: row.bookId,
      bookTitle: row.bookTitle,
      bookCoverUrl: row.bookCoverUrl ?? undefined,
      copyCode: row.copyCode,
    }));
  }

  async listReservationsByUser(userId: string): Promise<IMyReservationListItem[]> {
    const rows = await this.db
      .select({
        reservation: reservations,
        bookTitle: books.title,
        bookCoverUrl: books.coverUrl,
      })
      .from(reservations)
      .innerJoin(books, eq(reservations.bookId, books.id))
      .where(eq(reservations.userId, userId))
      .orderBy(desc(reservations.reservedAt));

    return rows.map((row) => ({
      reservation: toReservationRecord(row.reservation),
      bookTitle: row.bookTitle,
      bookCoverUrl: row.bookCoverUrl ?? undefined,
    }));
  }

  async listFinesByUser(userId: string): Promise<FineRecord[]> {
    const rows = await this.db
      .select()
      .from(fines)
      .where(eq(fines.userId, userId))
      .orderBy(desc(fines.createdAt));

    return rows.map(toFineRecord);
  }
}
