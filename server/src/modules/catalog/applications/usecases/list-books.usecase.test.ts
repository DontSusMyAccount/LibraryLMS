import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type BookCopy,
  type BookTitle,
} from "../../../../shared";
import type { ICopyRepository } from "../ports/copy.repository";
import type { IBookRepository } from "../ports/book.repository";
import { ListBooksUsecase } from "./list-books.usecase";

function buildBook(overrides: Partial<BookTitle> = {}): BookTitle {
  return {
    id: "b-1",
    isbn: "9786161234567",
    title: "นิยายทดสอบ",
    author: "นักเขียนทดสอบ",
    language: "th",
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

const BOOKS: BookTitle[] = [
  buildBook({
    id: "b-1",
    title: "คณิตศาสตร์ขั้นสูง",
    author: "สมชาย ใจดี",
    categoryId: "cat-1",
  }),
  buildBook({
    id: "b-2",
    title: "ฟิสิกส์พื้นฐาน",
    author: "วิชัย วิทย์",
    categoryId: "cat-1",
  }),
  buildBook({
    id: "b-3",
    title: "ประวัติศาสตร์ไทย",
    author: "นิลวรรณ นักอ่าน",
    categoryId: "cat-2",
  }),
  buildBook({
    id: "b-4",
    title: "นวนิยายเรื่องยาว",
    author: "สมชาย นักเขียน",
    categoryId: "cat-3",
  }),
];

const COPIES: BookCopy[] = [
  buildCopy({ id: "c-1", bookId: "b-1", copyCode: "BK-001", status: "available" }),
  buildCopy({ id: "c-2", bookId: "b-1", copyCode: "BK-002", status: "borrowed" }),
  buildCopy({ id: "c-3", bookId: "b-1", copyCode: "BK-003", status: "available" }),
  buildCopy({ id: "c-4", bookId: "b-2", copyCode: "BK-004", status: "available" }),
  buildCopy({ id: "c-5", bookId: "b-3", copyCode: "BK-005", status: "damaged" }),
];

function createBookRepository(records: BookTitle[]): IBookRepository {
  return {
    create: async (input) => buildBook({ ...input, title: input.title }),
    findById: async (id) => records.find((book) => book.id === id) ?? null,
    findByIsbn: async () => null,
    list: async ({ categoryId, search, page, limit }) => {
      let filtered = records;
      if (categoryId) {
        filtered = filtered.filter((book) => book.categoryId === categoryId);
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (book) => book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q),
        );
      }
      const total = filtered.length;
      const start = (page - 1) * limit;
      return {
        data: filtered.slice(start, start + limit),
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      };
    },
    update: async () => null,
  };
}

function createCopyRepository(copies: BookCopy[]): ICopyRepository {
  return {
    findById: async (id) => copies.find((copy) => copy.id === id) ?? null,
    findByCopyCode: async (copyCode) => copies.find((copy) => copy.copyCode === copyCode) ?? null,
    create: async () => buildCopy(),
    updateStatus: async () => null,
    listByBookId: async (bookId) => copies.filter((copy) => copy.bookId === bookId),
    listByBookIds: async (bookIds) => copies.filter((copy) => bookIds.includes(copy.bookId)),
  };
}

describe("ListBooksUsecase", () => {
  it("ค้นหาแบบ free-text (title/author) คืนผลลัพธ์ที่ตรง", async () => {
    const usecase = new ListBooksUsecase(createBookRepository(BOOKS), createCopyRepository(COPIES));

    const result = await usecase.execute({
      query: { search: "สมชาย", page: 1, limit: DEFAULT_PAGE_SIZE },
    });

    expect(result.total).toBe(2);
    expect(result.data.map((book) => book.id).sort()).toEqual(["b-1", "b-4"]);
  });

  it("กรองด้วย categoryId", async () => {
    const usecase = new ListBooksUsecase(createBookRepository(BOOKS), createCopyRepository(COPIES));

    const result = await usecase.execute({
      query: { categoryId: "cat-2", page: 1, limit: DEFAULT_PAGE_SIZE },
    });

    expect(result.total).toBe(1);
    expect(result.data[0]!.id).toBe("b-3");
  });

  it("กรอง category + search พร้อมกัน", async () => {
    const usecase = new ListBooksUsecase(createBookRepository(BOOKS), createCopyRepository(COPIES));

    const result = await usecase.execute({
      query: { categoryId: "cat-1", search: "คณิต", page: 1, limit: DEFAULT_PAGE_SIZE },
    });

    expect(result.total).toBe(1);
    expect(result.data[0]!.title).toBe("คณิตศาสตร์ขั้นสูง");
  });

  it("แต่ละรายการมี copy summary: totalCopies + availableCopies (ผ่าน copy repo)", async () => {
    const usecase = new ListBooksUsecase(createBookRepository(BOOKS), createCopyRepository(COPIES));

    const result = await usecase.execute({
      query: { page: 1, limit: DEFAULT_PAGE_SIZE },
    });

    const book1 = result.data.find((book) => book.id === "b-1");
    expect(book1).toBeDefined();
    expect(book1!.totalCopies).toBe(3);
    expect(book1!.availableCopies).toBe(2);
    expect(book1!.copies).toHaveLength(3);
    expect(book1!.copies.map((copy) => copy.status).sort()).toEqual([
      "available",
      "available",
      "borrowed",
    ]);

    const book3 = result.data.find((book) => book.id === "b-3");
    expect(book3!.totalCopies).toBe(1);
    expect(book3!.availableCopies).toBe(0);

    const book4 = result.data.find((book) => book.id === "b-4");
    expect(book4!.totalCopies).toBe(0);
    expect(book4!.availableCopies).toBe(0);
  });

  it("pagination: page 2 คืนชุดถัดไป totalPages ถูกต้อง", async () => {
    const usecase = new ListBooksUsecase(createBookRepository(BOOKS), createCopyRepository(COPIES));

    const result = await usecase.execute({ query: { page: 2, limit: 3 } });

    expect(result.total).toBe(4);
    expect(result.data).toHaveLength(1);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.data[0]!.id).toBe("b-4");
  });

  it("clamp page/limit เหมือนโมดูลอื่น", async () => {
    const usecase = new ListBooksUsecase(createBookRepository(BOOKS), createCopyRepository(COPIES));

    const result = await usecase.execute({ query: { page: 0, limit: MAX_PAGE_SIZE + 10 } });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(MAX_PAGE_SIZE);
  });

  it("ไม่มีข้อมูล คืน list ว่าง total = 0 totalPages = 0", async () => {
    const usecase = new ListBooksUsecase(createBookRepository([]), createCopyRepository([]));

    const result = await usecase.execute({ query: { page: 1, limit: DEFAULT_PAGE_SIZE } });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});
