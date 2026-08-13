import "reflect-metadata";

import { asc, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { inject, injectable } from "tsyringe";

import { bookCopies } from "../../../../infrastructure/database/schema";
import type { BookCopy, CopyStatus } from "../../../../shared";
import { TOKENS } from "../../../tokens";
import type { ICreateCopyRecord, ICopyRepository } from "../../applications/ports/copy.repository";

type BookCopyRow = typeof bookCopies.$inferSelect;

function formatDateOnly(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toBookCopy(row: BookCopyRow): BookCopy {
  return {
    id: row.id,
    bookId: row.bookId,
    branchId: row.branchId ?? undefined,
    copyCode: row.copyCode,
    status: row.status as CopyStatus,
    shelfLocation: row.shelfLocation ?? undefined,
    acquiredAt: row.acquiredAt ? formatDateOnly(row.acquiredAt) : undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

@injectable()
export class DrizzleCopyRepository implements ICopyRepository {
  constructor(@inject(TOKENS.Db) private readonly db: PostgresJsDatabase) {}

  async findById(id: string): Promise<BookCopy | null> {
    const rows = await this.db.select().from(bookCopies).where(eq(bookCopies.id, id)).limit(1);
    const row = rows[0];
    return row ? toBookCopy(row) : null;
  }

  async findByCopyCode(copyCode: string): Promise<BookCopy | null> {
    const rows = await this.db
      .select()
      .from(bookCopies)
      .where(eq(bookCopies.copyCode, copyCode))
      .limit(1);
    const row = rows[0];
    return row ? toBookCopy(row) : null;
  }

  async create(input: ICreateCopyRecord): Promise<BookCopy> {
    const rows = await this.db
      .insert(bookCopies)
      .values({
        bookId: input.bookId,
        copyCode: input.copyCode,
        branchId: input.branchId,
        shelfLocation: input.shelfLocation,
        acquiredAt: input.acquiredAt ? new Date(input.acquiredAt) : undefined,
      })
      .returning();
    return toBookCopy(rows[0]!);
  }

  async updateStatus(id: string, status: CopyStatus): Promise<BookCopy | null> {
    const rows = await this.db
      .update(bookCopies)
      .set({ status })
      .where(eq(bookCopies.id, id))
      .returning();
    const row = rows[0];
    return row ? toBookCopy(row) : null;
  }

  async listByBookId(bookId: string): Promise<BookCopy[]> {
    const rows = await this.db
      .select()
      .from(bookCopies)
      .where(eq(bookCopies.bookId, bookId))
      .orderBy(asc(bookCopies.copyCode));
    return rows.map(toBookCopy);
  }

  async listByBookIds(bookIds: string[]): Promise<BookCopy[]> {
    if (bookIds.length === 0) return [];
    const rows = await this.db
      .select()
      .from(bookCopies)
      .where(inArray(bookCopies.bookId, bookIds))
      .orderBy(asc(bookCopies.copyCode));
    return rows.map(toBookCopy);
  }
}
