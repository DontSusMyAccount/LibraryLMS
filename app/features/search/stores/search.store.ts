"use client";

import { create } from "zustand";

import { fetchBooks, fetchCategories } from "@/app/features/catalog/actions/catalog.action";
import type {
  BookListItem,
  CategoryNode,
  ListBooksParams,
} from "@/app/features/catalog/catalog.types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;

const FALLBACK_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่";

interface SearchStoreState {
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
  loadBooks: () => Promise<void>;
  loadCategories: () => Promise<void>;
  setCategoryId: (categoryId: string | null) => Promise<void>;
  setSearch: (search: string) => Promise<void>;
  setPage: (page: number) => Promise<void>;
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
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

function toListParams(state: Pick<SearchStoreState, "page" | "limit" | "search" | "categoryId">) {
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

export const useSearchStore = create<SearchStoreState>((set, get) => ({
  ...initialState,

  loadBooks: async () => {
    set({ isLoading: true, isError: false, errorMessage: null });
    try {
      const result = await fetchBooks(toListParams(get()));
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
      const categories = await fetchCategories();
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

  reset: () => set({ ...initialState }),
}));
