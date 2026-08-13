import "reflect-metadata";

import { and, asc, count, eq, inArray, lt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { inject, injectable } from "tsyringe";

import {
  bookCopies,
  books,
  loans,
  reservations,
  systemSettings,
  users,
} from "../../../../infrastructure/database/schema";
import type { BookTitle, LoanRecord, Paginated, ReservationRecord } from "../../../../shared";
import { TOKENS } from "../../../tokens";
import type {
  IActiveLoanWithBook,
  ICreateReservationInput,
  IReservationListQuery,
  IReservationMemberInfo,
  IReservationRepository,
  IUpdateReservationInput,
} from "../../applications/ports/reservation.repository";

type ReservationRow = typeof reservations.$inferSelect;
type BookRow = typeof books.$inferSelect;
type LoanRow = typeof loans.$inferSelect;

const ACTIVE_QUEUE_STATUSES = ["waiting", "ready", "suspended"] as const;

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

function toBookTitle(row: BookRow): BookTitle {
  return {
    id: row.id,
    isbn: row.isbn ?? undefined,
    title: row.title,
    author: row.author,
    publisher: row.publisher ?? undefined,
    language: row.language ?? undefined,
    categoryId: row.categoryId ?? undefined,
    description: row.description ?? undefined,
    coverUrl: row.coverUrl ?? undefined,
    publishedYear: row.publishedYear ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

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

@injectable()
export class DrizzleReservationRepository implements IReservationRepository {
  constructor(@inject(TOKENS.Db) private readonly db: PostgresJsDatabase) {}

  async findMemberById(userId: string): Promise<IReservationMemberInfo | null> {
    const rows = await this.db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    return { id: row.id, status: row.status };
  }

  async findBookById(bookId: string): Promise<BookTitle | null> {
    const rows = await this.db.select().from(books).where(eq(books.id, bookId)).limit(1);
    const row = rows[0];
    return row ? toBookTitle(row) : null;
  }

  async findActiveByUserAndBook(userId: string, bookId: string): Promise<ReservationRecord | null> {
    const rows = await this.db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.userId, userId),
          eq(reservations.bookId, bookId),
          inArray(reservations.status, ACTIVE_QUEUE_STATUSES),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? toReservationRecord(row) : null;
  }

  async findById(id: string): Promise<ReservationRecord | null> {
    const rows = await this.db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    const row = rows[0];
    return row ? toReservationRecord(row) : null;
  }

  async createReservation(input: ICreateReservationInput): Promise<ReservationRecord> {
    const rows = await this.db
      .insert(reservations)
      .values({
        bookId: input.bookId,
        userId: input.userId,
        branchId: input.branchId,
        reservedAt: new Date(input.reservedAt),
      })
      .returning();
    return toReservationRecord(rows[0]!);
  }

  async listReservations(query: IReservationListQuery): Promise<Paginated<ReservationRecord>> {
    const conditions = query.status ? eq(reservations.status, query.status) : undefined;

    const totalRows = await this.db.select({ value: count() }).from(reservations).where(conditions);
    const total = totalRows[0]?.value ?? 0;

    const rows = await this.db
      .select()
      .from(reservations)
      .where(conditions)
      .orderBy(asc(reservations.reservedAt), asc(reservations.id))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    return {
      data: rows.map(toReservationRecord),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }

  async findByBookQueue(bookId: string): Promise<ReservationRecord[]> {
    const rows = await this.db
      .select()
      .from(reservations)
      .where(
        and(eq(reservations.bookId, bookId), inArray(reservations.status, ACTIVE_QUEUE_STATUSES)),
      )
      .orderBy(asc(reservations.reservedAt), asc(reservations.id));
    return rows.map(toReservationRecord);
  }

  async countActiveByBook(bookId: string): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(reservations)
      .where(
        and(eq(reservations.bookId, bookId), inArray(reservations.status, ACTIVE_QUEUE_STATUSES)),
      );
    return rows[0]?.value ?? 0;
  }

  async updateStatus(
    id: string,
    input: IUpdateReservationInput,
  ): Promise<ReservationRecord | null> {
    const rows = await this.db
      .update(reservations)
      .set({
        status: input.status,
        readyAt: input.readyAt ? new Date(input.readyAt) : undefined,
        pickupDeadline: input.pickupDeadline ? new Date(input.pickupDeadline) : undefined,
        fulfilledLoanId: input.fulfilledLoanId,
      })
      .where(eq(reservations.id, id))
      .returning();
    const row = rows[0];
    return row ? toReservationRecord(row) : null;
  }

  async findReadyOverdue(now: Date): Promise<ReservationRecord[]> {
    const rows = await this.db
      .select()
      .from(reservations)
      .where(and(eq(reservations.status, "ready"), lt(reservations.pickupDeadline, now)));
    return rows.map(toReservationRecord);
  }

  async findActiveLoanWithBook(loanId: string): Promise<IActiveLoanWithBook | null> {
    const rows = await this.db
      .select({ loan: loans, bookId: bookCopies.bookId })
      .from(loans)
      .innerJoin(bookCopies, eq(loans.copyId, bookCopies.id))
      .where(and(eq(loans.id, loanId), eq(loans.status, "active")))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    return { loan: toLoanRecord(row.loan), bookId: row.bookId };
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
