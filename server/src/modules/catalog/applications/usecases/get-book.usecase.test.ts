import { describe, expect, it } from "vitest";

import { DomainNotFoundError } from "../../../../domains/errors";
import type { BookCopy, BookTitle } from "../../../../shared";
import type { ICopyRepository } from "../ports/copy.repository";
import type { IBookRepository } from "../ports/book.repository";
import { GetBookUsecase } from "./get-book.usecase";

function buildBook(overrides: Partial<BookTitle> = {}): BookTitle {
  return {
    id: "b-1",
    isbn: "9786161234567",
    title: "นิยายทดสอบ",
    author: "นักเขียนทดสอบ",
    categoryId: "cat-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildCopy(overrides: Partial<BookCopy> = {}): BookCopy {
  return {
    id: "c-1",
    bookId: "b-1",
    copyCode: "BK-001",
    status: "available",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createBookRepository(book: BookTitle | null): IBookRepository {
  return {
    create: async () => buildBook(),
    findById: async (id) => (book && book.id === id ? book : null),
    findByIsbn: async () => null,
    list: async () => ({ data: [], total: 0, page: 1, limit: 12, totalPages: 0 }),
    update: async () => null,
  };
}

function createCopyRepository(copies: BookCopy[]): ICopyRepository {
  return {
    findById: async () => null,
    findByCopyCode: async () => null,
    create: async () => buildCopy(),
    updateStatus: async () => null,
    listByBookId: async (bookId) => copies.filter((copy) => copy.bookId === bookId),
    listByBookIds: async () => [],
  };
}

describe("GetBookUsecase", () => {
  it("คืนหนังสือพร้อมรายละเอียด copy ทั้งหมด", async () => {
    const copies = [
      buildCopy({ id: "c-1", copyCode: "BK-001", status: "available" }),
      buildCopy({ id: "c-2", copyCode: "BK-002", status: "borrowed" }),
    ];
    const usecase = new GetBookUsecase(
      createBookRepository(buildBook()),
      createCopyRepository(copies),
    );

    const result = await usecase.execute({ query: { id: "b-1" } });

    expect(result.book.id).toBe("b-1");
    expect(result.book.copies).toHaveLength(2);
    expect(result.book.copies.map((copy) => copy.copyCode)).toEqual(["BK-001", "BK-002"]);
  });

  it("หนังสือไม่เจอ throw DomainNotFoundError", async () => {
    const usecase = new GetBookUsecase(createBookRepository(null), createCopyRepository([]));

    await expect(usecase.execute({ query: { id: "b-missing" } })).rejects.toBeInstanceOf(
      DomainNotFoundError,
    );
  });

  it("หนังสือไม่มี copy คืน copies ว่าง", async () => {
    const usecase = new GetBookUsecase(createBookRepository(buildBook()), createCopyRepository([]));

    const result = await usecase.execute({ query: { id: "b-1" } });

    expect(result.book.copies).toEqual([]);
  });
});
