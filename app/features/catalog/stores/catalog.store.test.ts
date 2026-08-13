import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BookCopy, BookTitle } from "@libsys/shared";

import type { BookListPage, BookListItem, BookWithCopies } from "../catalog.types";

const mocks = vi.hoisted(() => ({
  fetchBooks: vi.fn(),
  fetchBookDetail: vi.fn(),
  fetchCategories: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  uploadCover: vi.fn(),
  addCopy: vi.fn(),
  changeCopyStatus: vi.fn(),
}));

vi.mock("../actions/catalog.action", () => ({
  fetchBooks: mocks.fetchBooks,
  fetchBookDetail: mocks.fetchBookDetail,
  fetchCategories: mocks.fetchCategories,
  createBook: mocks.createBook,
  updateBook: mocks.updateBook,
  uploadCover: mocks.uploadCover,
  addCopy: mocks.addCopy,
  changeCopyStatus: mocks.changeCopyStatus,
}));

import { useCatalogStore } from "./catalog.store";

function makeBook(overrides: Partial<BookListItem> = {}): BookListItem {
  return {
    id: "book-1",
    title: "คัมภีร์ลมปราณ",
    author: "ผู้แต่งตัวอย่าง",
    categoryId: "cat-1",
    copies: [],
    totalCopies: 0,
    availableCopies: 0,
    createdAt: "2026-08-01T00:00:00",
    updatedAt: "2026-08-01T00:00:00",
    ...overrides,
  };
}

function makeCopy(overrides: Partial<BookCopy> = {}): BookCopy {
  return {
    id: "copy-1",
    bookId: "book-1",
    copyCode: "C-001",
    status: "available",
    createdAt: "2026-08-01T00:00:00",
    ...overrides,
  };
}

function makePage(books: BookListItem[], page = 1, total = books.length): BookListPage {
  return {
    success: true as const,
    data: books,
    total,
    page,
    limit: 12,
    totalPages: Math.ceil(total / 12),
  };
}

const LIST_PARAMS_SHAPE = { page: 1, limit: 12, search: undefined, categoryId: undefined };

beforeEach(() => {
  useCatalogStore.setState({
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
    expandedBook: null,
    isDetailLoading: false,
  });
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

describe("catalog.store — รายการหนังสือ", () => {
  it("loadBooks โหลดรายการ + เก็บ pagination state จากผลลัพธ์", async () => {
    const books = [makeBook(), makeBook({ id: "book-2", title: "เล่มสอง" })];
    mocks.fetchBooks.mockResolvedValue(makePage(books, 1, 2));

    await useCatalogStore.getState().loadBooks();

    expect(mocks.fetchBooks).toHaveBeenCalledWith(LIST_PARAMS_SHAPE);
    expect(useCatalogStore.getState().books).toHaveLength(2);
    expect(useCatalogStore.getState().total).toBe(2);
    expect(useCatalogStore.getState().totalPages).toBe(1);
    expect(useCatalogStore.getState().isLoading).toBe(false);
    expect(useCatalogStore.getState().isError).toBe(false);
  });

  it("setCategoryId ส่ง categoryId ไปยัง fetchBooks และรีเซ็ตหน้าเป็น 1", async () => {
    mocks.fetchBooks.mockResolvedValueOnce(makePage([makeBook()], 1, 1));
    await useCatalogStore.getState().loadBooks();
    useCatalogStore.setState({ page: 3 });

    const filtered = [makeBook({ id: "book-c", title: "หนังสือหมวดอื่น" })];
    mocks.fetchBooks.mockResolvedValueOnce(makePage(filtered, 1, 1));

    await useCatalogStore.getState().setCategoryId("cat-2");

    expect(mocks.fetchBooks).toHaveBeenLastCalledWith({
      page: 1,
      limit: 12,
      search: undefined,
      categoryId: "cat-2",
    });
    expect(useCatalogStore.getState().categoryId).toBe("cat-2");
    expect(useCatalogStore.getState().page).toBe(1);
    expect(useCatalogStore.getState().books).toEqual(filtered);
  });

  it("setSearch ส่ง search ไปยัง fetchBooks และรีเซ็ตหน้าเป็น 1", async () => {
    mocks.fetchBooks.mockResolvedValueOnce(makePage([makeBook()], 1, 1));
    await useCatalogStore.getState().loadBooks();
    useCatalogStore.setState({ page: 2 });

    const found = [makeBook({ id: "book-s", title: "ลมหนาว" })];
    mocks.fetchBooks.mockResolvedValueOnce(makePage(found, 1, 1));

    await useCatalogStore.getState().setSearch("ลม");

    expect(mocks.fetchBooks).toHaveBeenLastCalledWith({
      page: 1,
      limit: 12,
      search: "ลม",
      categoryId: undefined,
    });
    expect(useCatalogStore.getState().search).toBe("ลม");
    expect(useCatalogStore.getState().books).toEqual(found);
  });

  it("setPage เปลี่ยนหน้าแล้วโหลดรายการใหม่", async () => {
    mocks.fetchBooks.mockResolvedValueOnce(makePage([makeBook()], 1, 20));
    await useCatalogStore.getState().loadBooks();
    useCatalogStore.setState({ totalPages: 2 });

    const secondPage = [makeBook({ id: "book-p2" })];
    mocks.fetchBooks.mockResolvedValueOnce(makePage(secondPage, 2, 20));

    await useCatalogStore.getState().setPage(2);

    expect(mocks.fetchBooks).toHaveBeenLastCalledWith({
      page: 2,
      limit: 12,
      search: undefined,
      categoryId: undefined,
    });
    expect(useCatalogStore.getState().page).toBe(2);
    expect(useCatalogStore.getState().books).toEqual(secondPage);
  });
});

describe("catalog.store — สร้างหนังสือ", () => {
  it("createBook สำเร็จ → refetch รายการหนังสือ", async () => {
    mocks.fetchBooks.mockResolvedValueOnce(makePage([], 1, 0));
    await useCatalogStore.getState().loadBooks();
    mocks.fetchBooks.mockClear();

    const created: BookTitle = {
      id: "book-new",
      title: "หนังสือใหม่",
      author: "คนเขียน",
      createdAt: "2026-08-10T00:00:00",
      updatedAt: "2026-08-10T00:00:00",
    };
    mocks.createBook.mockResolvedValue(created);
    mocks.fetchBooks.mockResolvedValueOnce(
      makePage([makeBook({ id: "book-new", title: "หนังสือใหม่" })], 1, 1),
    );

    const result = await useCatalogStore.getState().createBook({
      title: "หนังสือใหม่",
      author: "คนเขียน",
    });

    expect(result?.id).toBe("book-new");
    expect(mocks.createBook).toHaveBeenCalledWith({ title: "หนังสือใหม่", author: "คนเขียน" });
    expect(mocks.fetchBooks).toHaveBeenCalledTimes(1);
    expect(useCatalogStore.getState().books).toHaveLength(1);
    expect(useCatalogStore.getState().books[0].id).toBe("book-new");
  });

  it("createBook ล้มเหลว → คืน null และเก็บข้อความผิดพลาด", async () => {
    mocks.createBook.mockRejectedValue(new Error("ISBN ซ้ำ"));

    const result = await useCatalogStore.getState().createBook({
      title: "เล่มซ้ำ",
      author: "คนเขียน",
    });

    expect(result).toBeNull();
    expect(useCatalogStore.getState().errorMessage).toBe("ISBN ซ้ำ");
  });
});

describe("catalog.store — อัปโหลดรูปปก", () => {
  it("uploadCover สำเร็จ → cover_url อัปเดตทั้งในรายการและแถวที่ขยาย", async () => {
    const initial = [makeBook({ id: "book-1", coverUrl: undefined })];
    mocks.fetchBooks.mockResolvedValueOnce(makePage(initial, 1, 1));
    await useCatalogStore.getState().loadBooks();
    useCatalogStore.setState({
      expandedBook: { ...initial[0], copies: [makeCopy()] } as BookWithCopies,
    });

    const coverUrl = "https://covers.ac.th/covers/book-1/abc.png";
    mocks.uploadCover.mockResolvedValue(coverUrl);
    mocks.updateBook.mockResolvedValue({ ...initial[0], coverUrl } as BookTitle);

    const file = new File(["data"], "cover.png", { type: "image/png" });
    const result = await useCatalogStore.getState().uploadCover("book-1", file);

    expect(result).toBe(coverUrl);
    expect(mocks.uploadCover).toHaveBeenCalledWith("book-1", file);
    expect(mocks.updateBook).toHaveBeenCalledWith("book-1", { coverUrl });
    expect(useCatalogStore.getState().books[0].coverUrl).toBe(coverUrl);
    expect(useCatalogStore.getState().expandedBook?.coverUrl).toBe(coverUrl);
  });
});

describe("catalog.store — รายละเอียดและสำเนา", () => {
  it("toggleExpand โหลด detail พร้อม copies และเปิดแถว", async () => {
    const detail: BookWithCopies = {
      ...makeBook(),
      copies: [makeCopy(), makeCopy({ id: "copy-2", copyCode: "C-002" })],
    };
    mocks.fetchBookDetail.mockResolvedValue(detail);

    await useCatalogStore.getState().toggleExpand("book-1");

    expect(mocks.fetchBookDetail).toHaveBeenCalledWith("book-1");
    expect(useCatalogStore.getState().expandedBook?.id).toBe("book-1");
    expect(useCatalogStore.getState().expandedBook?.copies).toHaveLength(2);

    await useCatalogStore.getState().toggleExpand("book-1");
    expect(useCatalogStore.getState().expandedBook).toBeNull();
  });

  it("changeCopyStatus อัปเดตสถานะ copy ในแถวที่ขยายแล้ว refetch รายการ", async () => {
    mocks.fetchBooks.mockResolvedValueOnce(makePage([makeBook()], 1, 1));
    await useCatalogStore.getState().loadBooks();
    useCatalogStore.setState({
      expandedBook: { ...makeBook(), copies: [makeCopy()] } as BookWithCopies,
    });

    const updated = makeCopy({ id: "copy-1", status: "borrowed" });
    mocks.changeCopyStatus.mockResolvedValue(updated);
    mocks.fetchBooks.mockResolvedValueOnce(makePage([makeBook()], 1, 1));

    const ok = await useCatalogStore.getState().changeCopyStatus("copy-1", "borrowed");

    expect(ok).toBe(true);
    expect(mocks.changeCopyStatus).toHaveBeenCalledWith("copy-1", "borrowed");
    expect(useCatalogStore.getState().expandedBook?.copies[0].status).toBe("borrowed");
  });

  it("addCopy เพิ่มสำเนาในแถวที่ขยายแล้ว refetch รายการ", async () => {
    mocks.fetchBooks.mockResolvedValueOnce(makePage([makeBook()], 1, 1));
    await useCatalogStore.getState().loadBooks();
    useCatalogStore.setState({
      expandedBook: { ...makeBook(), copies: [makeCopy()] } as BookWithCopies,
    });

    const newCopy = makeCopy({ id: "copy-2", copyCode: "C-002" });
    mocks.addCopy.mockResolvedValue(newCopy);
    mocks.fetchBooks.mockResolvedValueOnce(makePage([makeBook()], 1, 1));

    const ok = await useCatalogStore.getState().addCopy("book-1", { copyCode: "C-002" });

    expect(ok).toBe(true);
    expect(mocks.addCopy).toHaveBeenCalledWith("book-1", { copyCode: "C-002" });
    expect(useCatalogStore.getState().expandedBook?.copies).toHaveLength(2);
  });
});
