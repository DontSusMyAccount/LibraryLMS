"use client";

import { useSearchStore } from "../stores/search.store";

export function useSearch() {
  const books = useSearchStore((state) => state.books);
  const categories = useSearchStore((state) => state.categories);
  const categoryId = useSearchStore((state) => state.categoryId);
  const search = useSearchStore((state) => state.search);
  const page = useSearchStore((state) => state.page);
  const total = useSearchStore((state) => state.total);
  const totalPages = useSearchStore((state) => state.totalPages);
  const isLoading = useSearchStore((state) => state.isLoading);
  const isError = useSearchStore((state) => state.isError);
  const errorMessage = useSearchStore((state) => state.errorMessage);

  const loadBooks = useSearchStore((state) => state.loadBooks);
  const loadCategories = useSearchStore((state) => state.loadCategories);
  const setCategoryId = useSearchStore((state) => state.setCategoryId);
  const setSearch = useSearchStore((state) => state.setSearch);
  const setPage = useSearchStore((state) => state.setPage);

  return {
    books,
    categories,
    categoryId,
    search,
    page,
    total,
    totalPages,
    isLoading,
    isError,
    errorMessage,
    loadBooks,
    loadCategories,
    setCategoryId,
    setSearch,
    setPage,
  };
}
