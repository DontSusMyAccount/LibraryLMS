"use client";

import { useCatalogStore } from "../stores/catalog.store";

export function useCatalog() {
  const books = useCatalogStore((state) => state.books);
  const categories = useCatalogStore((state) => state.categories);
  const categoryId = useCatalogStore((state) => state.categoryId);
  const search = useCatalogStore((state) => state.search);
  const page = useCatalogStore((state) => state.page);
  const totalPages = useCatalogStore((state) => state.totalPages);
  const total = useCatalogStore((state) => state.total);
  const isLoading = useCatalogStore((state) => state.isLoading);
  const isError = useCatalogStore((state) => state.isError);
  const errorMessage = useCatalogStore((state) => state.errorMessage);
  const expandedBook = useCatalogStore((state) => state.expandedBook);
  const isDetailLoading = useCatalogStore((state) => state.isDetailLoading);

  const loadBooks = useCatalogStore((state) => state.loadBooks);
  const loadCategories = useCatalogStore((state) => state.loadCategories);
  const setCategoryId = useCatalogStore((state) => state.setCategoryId);
  const setSearch = useCatalogStore((state) => state.setSearch);
  const setPage = useCatalogStore((state) => state.setPage);
  const createBook = useCatalogStore((state) => state.createBook);
  const uploadCover = useCatalogStore((state) => state.uploadCover);
  const toggleExpand = useCatalogStore((state) => state.toggleExpand);
  const addCopy = useCatalogStore((state) => state.addCopy);
  const changeCopyStatus = useCatalogStore((state) => state.changeCopyStatus);

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
    expandedBook,
    isDetailLoading,
    loadBooks,
    loadCategories,
    setCategoryId,
    setSearch,
    setPage,
    createBook,
    uploadCover,
    toggleExpand,
    addCopy,
    changeCopyStatus,
  };
}
