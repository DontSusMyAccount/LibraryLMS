"use client";

import { create } from "zustand";

import type { BookCopy, BookTitle, CopyStatus } from "@libsys/shared";

import {
  addCopy as addCopyAction,
  changeCopyStatus as changeCopyStatusAction,
  createBook as createBookAction,
  fetchBookDetail as fetchBookDetailAction,
  fetchBooks as fetchBooksAction,
  fetchCategories as fetchCategoriesAction,
  updateBook as updateBookAction,
  uploadCover as uploadCoverAction,
} from "../actions/catalog.action";
import type {
  AddCopyInput,
  BookListItem,
  BookWithCopies,
  CategoryNode,
  CreateBookInput,
  ListBooksParams,
} from "../catalog.types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;

const FALLBACK_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่";

interface CatalogStoreState {
  books: BookListItem[];
  categories: CategoryNode[];
  categoryId: string | null;
  search: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  expandedBook: BookWithCopies | null;
  isDetailLoading: boolean;
  loadBooks: () => Promise<void>;
  loadCategories: () => Promise<void>;
  setCategoryId: (categoryId: string | null) => Promise<void>;
  setSearch: (search: string) => Promise<void>;
  setPage: (page: number) => Promise<void>;
  createBook: (input: CreateBookInput) => Promise<BookTitle | null>;
  uploadCover: (bookId: string, file: File) => Promise<string | null>;
  toggleExpand: (bookId: string) => Promise<void>;
  addCopy: (bookId: string, input: AddCopyInput) => Promise<boolean>;
  changeCopyStatus: (copyId: string, status: CopyStatus) => Promise<boolean>;
  reset: () => void;
}

const initialState = {
  books: [],
  categories: [],
  categoryId: null,
  search: "",
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
  isLoading: false,
  isError: false,
  errorMessage: null,
  expandedBook: null,
  isDetailLoading: false,
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

function toListParams(state: Pick<CatalogStoreState, "page" | "limit" | "search" | "categoryId">) {
  const params: ListBooksParams = {
    page: state.page,
    limit: state.limit,
  };
  const search = state.search.trim();
  if (search) {
    params.search = search;
  }
  if (state.categoryId) {
    params.categoryId = state.categoryId;
  }
  return params;
}

function mergeBookIntoList(books: BookListItem[], updated: BookTitle): BookListItem[] {
  return books.map((book) => (book.id === updated.id ? { ...book, ...updated } : book));
}

export const useCatalogStore = create<CatalogStoreState>((set, get) => ({
  ...initialState,

  loadBooks: async () => {
    set({ isLoading: true, isError: false, errorMessage: null });
    try {
      const result = await fetchBooksAction(toListParams(get()));
      set({
        books: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, isError: true, errorMessage: toErrorMessage(error) });
    }
  },

  loadCategories: async () => {
    try {
      const categories = await fetchCategoriesAction();
      set({ categories });
    } catch {
      set({ categories: [] });
    }
  },

  setCategoryId: async (categoryId) => {
    set({ categoryId, page: DEFAULT_PAGE });
    await get().loadBooks();
  },

  setSearch: async (search) => {
    set({ search, page: DEFAULT_PAGE });
    await get().loadBooks();
  },

  setPage: async (page) => {
    set({ page });
    await get().loadBooks();
  },

  createBook: async (input) => {
    try {
      const book = await createBookAction(input);
      await get().loadBooks();
      return book;
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
      return null;
    }
  },

  uploadCover: async (bookId, file) => {
    try {
      const url = await uploadCoverAction(bookId, file);
      const updated = await updateBookAction(bookId, { coverUrl: url });
      const expandedBook = get().expandedBook;
      set({
        books: mergeBookIntoList(get().books, updated),
        expandedBook: expandedBook?.id === bookId ? { ...expandedBook, ...updated } : expandedBook,
      });
      return url;
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
      return null;
    }
  },

  toggleExpand: async (bookId) => {
    if (get().expandedBook?.id === bookId) {
      set({ expandedBook: null });
      return;
    }
    set({ isDetailLoading: true });
    try {
      const detail = await fetchBookDetailAction(bookId);
      set({ expandedBook: detail, isDetailLoading: false });
    } catch (error) {
      set({ isDetailLoading: false, errorMessage: toErrorMessage(error) });
    }
  },

  addCopy: async (bookId, input) => {
    try {
      const copy = await addCopyAction(bookId, input);
      const expandedBook = get().expandedBook;
      if (expandedBook?.id === bookId) {
        set({ expandedBook: { ...expandedBook, copies: [...expandedBook.copies, copy] } });
      }
      await get().loadBooks();
      return true;
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
      return false;
    }
  },

  changeCopyStatus: async (copyId, status) => {
    try {
      const copy = await changeCopyStatusAction(copyId, status);
      const expandedBook = get().expandedBook;
      if (expandedBook) {
        set({
          expandedBook: {
            ...expandedBook,
            copies: mergeCopyIntoList(expandedBook.copies, copy),
          },
        });
      }
      await get().loadBooks();
      return true;
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
      return false;
    }
  },

  reset: () => set({ ...initialState }),
}));

function mergeCopyIntoList(copies: BookCopy[], updated: BookCopy): BookCopy[] {
  return copies.map((copy) => (copy.id === updated.id ? updated : copy));
}
