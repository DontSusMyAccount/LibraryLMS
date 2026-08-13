import "reflect-metadata";

import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { inject, injectable } from "tsyringe";

import { books } from "../../../../infrastructure/database/schema";
import type { BookTitle, Paginated } from "../../../../shared";
import { TOKENS } from "../../../tokens";
import type {
  IBookListFilter,
  IBookRepository,
  ICreateBookRecord,
  IUpdateBookRecord,
} from "../../applications/ports/book.repository";

type BookRow = typeof books.$inferSelect;

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

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

@injectable()
export class DrizzleBookRepository implements IBookRepository {
  constructor(@inject(TOKENS.Db) private readonly db: PostgresJsDatabase) {}

  async create(input: ICreateBookRecord): Promise<BookTitle> {
    const rows = await this.db
      .insert(books)
      .values({
        isbn: input.isbn,
        title: input.title,
        author: input.author,
        publisher: input.publisher,
        language: input.language,
        categoryId: input.categoryId,
        description: input.description,
        coverUrl: input.coverUrl,
        publishedYear: input.publishedYear,
      })
      .returning();
    return toBookTitle(rows[0]!);
  }

  async findById(id: string): Promise<BookTitle | null> {
    const rows = await this.db.select().from(books).where(eq(books.id, id)).limit(1);
    const row = rows[0];
    return row ? toBookTitle(row) : null;
  }

  async findByIsbn(isbn: string): Promise<BookTitle | null> {
    const rows = await this.db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    const row = rows[0];
    return row ? toBookTitle(row) : null;
  }

  async list(filter: IBookListFilter): Promise<Paginated<BookTitle>> {
    const conditions: SQL[] = [];

    if (filter.categoryId) {
      conditions.push(eq(books.categoryId, filter.categoryId));
    }
    if (filter.search) {
      const pattern = `%${escapeLikePattern(filter.search)}%`;
      conditions.push(or(ilike(books.title, pattern), ilike(books.author, pattern))!);
    }

    const whereCondition = conditions.length === 0 ? undefined : and(...conditions);

    const totalRows = await this.db.select({ value: count() }).from(books).where(whereCondition);
    const total = totalRows[0]?.value ?? 0;

    const rows = await this.db
      .select()
      .from(books)
      .where(whereCondition)
      .orderBy(asc(books.title), asc(books.author))
      .limit(filter.limit)
      .offset((filter.page - 1) * filter.limit);

    return {
      data: rows.map(toBookTitle),
      total,
      page: filter.page,
      limit: filter.limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / filter.limit),
    };
  }

  async update(id: string, input: IUpdateBookRecord): Promise<BookTitle | null> {
    const rows = await this.db
      .update(books)
      .set({
        isbn: input.isbn,
        title: input.title,
        author: input.author,
        publisher: input.publisher,
        language: input.language,
        categoryId: input.categoryId,
        description: input.description,
        coverUrl: input.coverUrl,
        publishedYear: input.publishedYear,
      })
      .where(eq(books.id, id))
      .returning();
    const row = rows[0];
    return row ? toBookTitle(row) : null;
  }
}
