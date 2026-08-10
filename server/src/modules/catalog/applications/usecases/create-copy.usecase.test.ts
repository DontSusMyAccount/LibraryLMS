import { describe, expect, it } from "vitest";

import { DomainConflictError, DomainNotFoundError } from "../../../../domains/errors";
import type { BookCopy, BookTitle } from "../../../../shared";
import type { ICopyRepository } from "../ports/copy.repository";
import type { IBookRepository } from "../ports/book.repository";
import { CreateCopyUsecase } from "./create-copy.usecase";

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
    shelfLocation: "ชั้น 1",
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

function createCopyRepository(existing: BookCopy[]): ICopyRepository {
  return {
    findById: async (id) => existing.find((copy) => copy.id === id) ?? null,
    findByCopyCode: async (copyCode) => existing.find((copy) => copy.copyCode === copyCode) ?? null,
    create: async (input) =>
      buildCopy({
        id: "c-new",
        bookId: input.bookId,
        copyCode: input.copyCode,
        shelfLocation: input.shelfLocation,
      }),
    updateStatus: async () => null,
    listByBookId: async () => [],
    listByBookIds: async () => [],
  };
}

describe("CreateCopyUsecase", () => {
  it("เพิ่ม copy ได้ คืนสถานะเริ่มต้น available", async () => {
    const copyRepo = createCopyRepository([]);
    const usecase = new CreateCopyUsecase(createBookRepository(buildBook()), copyRepo);

    const result = await usecase.execute({
      command: { bookId: "b-1", copyCode: "BK-100", shelfLocation: "ชั้น 2" },
    });

    expect(result.copy.copyCode).toBe("BK-100");
    expect(result.copy.bookId).toBe("b-1");
    expect(result.copy.status).toBe("available");
    expect(result.copy.shelfLocation).toBe("ชั้น 2");
  });

  it("copyCode ซ้ำ throw DomainConflictError", async () => {
    const copyRepo = createCopyRepository([buildCopy({ id: "c-1", copyCode: "BK-001" })]);
    const usecase = new CreateCopyUsecase(createBookRepository(buildBook()), copyRepo);

    await expect(
      usecase.execute({ command: { bookId: "b-1", copyCode: "BK-001" } }),
    ).rejects.toBeInstanceOf(DomainConflictError);
  });

  it("book ไม่เจอ throw DomainNotFoundError", async () => {
    const usecase = new CreateCopyUsecase(createBookRepository(null), createCopyRepository([]));

    await expect(
      usecase.execute({ command: { bookId: "b-missing", copyCode: "BK-200" } }),
    ).rejects.toBeInstanceOf(DomainNotFoundError);
  });
});
