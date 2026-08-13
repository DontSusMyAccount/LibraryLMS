import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PaginatedResponse } from "@libsys/shared";

import type { BookListItem } from "@/app/features/catalog/catalog.types";

const mocks = vi.hoisted(() => ({
  fetchBooks: vi.fn(),
  fetchCategories: vi.fn(),
}));

vi.mock("@/app/features/catalog/actions/catalog.action", () => ({
  fetchBooks: mocks.fetchBooks,
  fetchCategories: mocks.fetchCategories,
}));

import { useSearchStore } from "./search.store";

function makeBook(overrides: Partial<BookListItem> = {}): BookListItem {
  return {
    id: "book-1",
    title: "แฮร์รี่ พอตเตอร์",
    author: "เจ.เค. โรว์ลิ่ง",
    isbn: "9789744723439",
    publisher: "นานมีบุ๊คส์",
    language: "th",
    categoryId: "cat-1",
    description: "นวนิยายแฟนตาซี",
    coverUrl: "https://example.com/cover.jpg",
    publishedYear: 2003,
    createdAt: "2026-01-01T00:00:00",
    updatedAt: "2026-01-01T00:00:00",
    copies: [],
    totalCopies: 2,
    availableCopies: 1,
    ...overrides,
  };
}

function makePage(
  books: BookListItem[],
  page = 1,
  total = books.length,
): PaginatedResponse<BookListItem> {
  return {
    success: true as const,
    data: books,
    total,
    page,
    limit: 12,
    totalPages: Math.ceil(total / 12),
  };
}

beforeEach(() => {
  useSearchStore.setState({
    books: [],
    categories: [],
    categoryId: null,
    search: "",
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    isLoading: false,
    isError: false,
    errorMessage: null,
  });
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

describe("search.store — ค้นหาหนังสือ", () => {
  it("loadBooks โหลดรายการ + เก็บ pagination state จากผลลัพธ์", async () => {
    const books = [makeBook(), makeBook({ id: "book-2", title: "แดนนิเวศน์" })];
    mocks.fetchBooks.mockResolvedValue(makePage(books, 1, 2));

    await useSearchStore.getState().loadBooks();

    expect(mocks.fetchBooks).toHaveBeenCalledWith({ page: 1, limit: 12 });
    expect(useSearchStore.getState().books).toHaveLength(2);
    expect(useSearchStore.getState().total).toBe(2);
    expect(useSearchStore.getState().totalPages).toBe(1);
    expect(useSearchStore.getState().isLoading).toBe(false);
    expect(useSearchStore.getState().isError).toBe(false);
  });

  it("loadBooks ล้มเหลว → isError true + errorMessage ภาษาไทย", async () => {
    mocks.fetchBooks.mockRejectedValue(new Error("ไม่สามารถเชื่อมต่อกับระบบได้"));

    await useSearchStore.getState().loadBooks();

    expect(useSearchStore.getState().isError).toBe(true);
    expect(useSearchStore.getState().errorMessage).toBe("ไม่สามารถเชื่อมต่อกับระบบได้");
    expect(useSearchStore.getState().isLoading).toBe(false);
  });

  it("setSearch รีเซ็ตหน้าเป็น 1 และส่ง search param", async () => {
    mocks.fetchBooks.mockResolvedValueOnce(makePage([makeBook()], 1, 1));
    await useSearchStore.getState().loadBooks();
    useSearchStore.setState({ page: 3 });

    const found = [makeBook({ id: "book-s", title: "พอตเตอร์กับถ้วยอัคนี" })];
    mocks.fetchBooks.mockResolvedValueOnce(makePage(found, 1, 1));

    await useSearchStore.getState().setSearch("พอตเตอร์");

    expect(mocks.fetchBooks).toHaveBeenLastCalledWith({ page: 1, limit: 12, search: "พอตเตอร์" });
    expect(useSearchStore.getState().search).toBe("พอตเตอร์");
    expect(useSearchStore.getState().page).toBe(1);
    expect(useSearchStore.getState().books).toEqual(found);
  });

  it("setCategoryId รีเซ็ตหน้าเป็น 1 และส่ง categoryId param", async () => {
    mocks.fetchBooks.mockResolvedValueOnce(makePage([makeBook()], 1, 1));
    await useSearchStore.getState().loadBooks();
    useSearchStore.setState({ page: 2 });

    const filtered = [makeBook({ id: "book-c", categoryId: "cat-2" })];
    mocks.fetchBooks.mockResolvedValueOnce(makePage(filtered, 1, 1));

    await useSearchStore.getState().setCategoryId("cat-2");

    expect(mocks.fetchBooks).toHaveBeenLastCalledWith({
      page: 1,
      limit: 12,
      categoryId: "cat-2",
    });
    expect(useSearchStore.getState().categoryId).toBe("cat-2");
    expect(useSearchStore.getState().page).toBe(1);
    expect(useSearchStore.getState().books).toEqual(filtered);
  });

  it("setCategoryId(null) ไม่ส่ง categoryId param", async () => {
    mocks.fetchBooks.mockResolvedValueOnce(makePage([makeBook()], 1, 1));
    await useSearchStore.getState().loadBooks();
    useSearchStore.setState({ categoryId: "cat-2" });
    mocks.fetchBooks.mockClear();

    mocks.fetchBooks.mockResolvedValueOnce(makePage([makeBook()], 1, 1));

    await useSearchStore.getState().setCategoryId(null);

    expect(mocks.fetchBooks).toHaveBeenLastCalledWith({ page: 1, limit: 12 });
    expect(useSearchStore.getState().categoryId).toBeNull();
  });

  it("setPage เปลี่ยนหน้าแล้วโหลดรายการใหม่", async () => {
    mocks.fetchBooks.mockResolvedValueOnce(makePage([makeBook()], 1, 20));
    await useSearchStore.getState().loadBooks();
    useSearchStore.setState({ totalPages: 2 });

    const secondPage = [makeBook({ id: "book-p2" })];
    mocks.fetchBooks.mockResolvedValueOnce(makePage(secondPage, 2, 20));

    await useSearchStore.getState().setPage(2);

    expect(mocks.fetchBooks).toHaveBeenLastCalledWith({ page: 2, limit: 12 });
    expect(useSearchStore.getState().page).toBe(2);
    expect(useSearchStore.getState().books).toEqual(secondPage);
  });

  it("loadCategories เก็บหมวดหมู่ + ล้มเหลวแล้วคืน []", async () => {
    const categories = [{ id: "cat-1", name: "นวนิยาย" }];
    mocks.fetchCategories.mockResolvedValue(categories);

    await useSearchStore.getState().loadCategories();

    expect(useSearchStore.getState().categories).toEqual(categories);

    mocks.fetchCategories.mockRejectedValue(new Error("err"));
    useSearchStore.setState({ categories });

    await useSearchStore.getState().loadCategories();

    expect(useSearchStore.getState().categories).toEqual([]);
  });

  it("reset กลับสู่ค่าเริ่มต้น", () => {
    useSearchStore.setState({ books: [makeBook()], search: "พอตเตอร์", categoryId: "cat-2" });

    useSearchStore.getState().reset();

    expect(useSearchStore.getState().books).toEqual([]);
    expect(useSearchStore.getState().search).toBe("");
    expect(useSearchStore.getState().categoryId).toBeNull();
    expect(useSearchStore.getState().page).toBe(1);
    expect(useSearchStore.getState().total).toBe(0);
  });
});
