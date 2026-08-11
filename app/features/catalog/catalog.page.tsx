"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookPlusIcon,
  InboxIcon,
  RefreshCcwIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { BookDialog } from "@/components/book-dialog";
import { BookTable } from "@/components/book-table";
import { CategoryFilter } from "@/components/category-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

import { useCatalog } from "./hooks/use-catalog";

const SEARCH_DEBOUNCE_MS = 300;

const SEARCH_PLACEHOLDER = "ค้นหาชื่อหนังสือหรือผู้แต่ง...";
const PAGE_TITLE = "แคตตาล็อก";
const PAGE_SUBTITLE = "จัดการหนังสือ สื่อ และหมวดหมู่ภายในห้องสมุด";
const ADD_BOOK_LABEL = "เพิ่มหนังสือ";
const EMPTY_TITLE = "ยังไม่มีหนังสือในหมวดนี้ — เพิ่มเล่มแรก";
const EMPTY_HINT = "ลองปรับเงื่อนไขการค้นหา หรือเพิ่มหนังสือเล่มแรกเข้าสู่ระบบ";
const LOAD_ERROR_TITLE = "โหลดรายการหนังสือไม่สำเร็จ";
const RETRY_LABEL = "ลองใหม่อีกครั้ง";
const TOTAL_LABEL = "รายการ";

function CatalogSkeleton() {
  return (
    <div data-slot="catalog-skeleton" className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-14 rounded-lg" />
      ))}
    </div>
  );
}

export function CatalogPage() {
  const {
    books,
    categories,
    categoryId,
    page,
    totalPages,
    total,
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
    toggleExpand,
  } = useCatalog();

  const [searchInput, setSearchInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasTyped = useRef(false);

  useEffect(() => {
    void loadBooks();
    void loadCategories();
  }, [loadBooks, loadCategories]);

  useEffect(() => {
    if (!hasTyped.current) {
      return undefined;
    }
    const timer = setTimeout(() => {
      void setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, setSearch]);

  const handleSearchChange = (value: string) => {
    hasTyped.current = true;
    setSearchInput(value);
  };

  const handleRetry = () => {
    void loadBooks();
  };

  const isEmpty = !isLoading && books.length === 0;

  return (
    <div data-slot="catalog-page" className="flex flex-col gap-6">
      <section
        data-slot="catalog-heading"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-title font-semibold text-foreground">{PAGE_TITLE}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{PAGE_SUBTITLE}</p>
        </div>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          <BookPlusIcon />
          {ADD_BOOK_LABEL}
        </Button>
      </section>

      <section
        data-slot="catalog-toolbar"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={SEARCH_PLACEHOLDER}
            aria-label="ค้นหาหนังสือ"
            className="pl-9"
          />
        </div>
        <CategoryFilter
          categories={categories}
          value={categoryId}
          onChange={(nextCategoryId) => void setCategoryId(nextCategoryId)}
          className="w-full sm:w-64"
        />
      </section>

      {isError ? (
        <section
          data-slot="catalog-error"
          className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-accent-coral/10 text-accent-coral">
            <TriangleAlertIcon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">{LOAD_ERROR_TITLE}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {errorMessage ?? "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่"}
          </p>
          <Button type="button" variant="outline" onClick={handleRetry}>
            <RefreshCcwIcon />
            {RETRY_LABEL}
          </Button>
        </section>
      ) : isLoading && books.length === 0 ? (
        <section data-slot="catalog-loading" className="rounded-lg bg-card p-5 shadow-card">
          <CatalogSkeleton />
        </section>
      ) : isEmpty ? (
        <section
          data-slot="catalog-empty"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
            <InboxIcon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">{EMPTY_TITLE}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{EMPTY_HINT}</p>
          <Button type="button" onClick={() => setDialogOpen(true)}>
            <BookPlusIcon />
            {ADD_BOOK_LABEL}
          </Button>
        </section>
      ) : (
        <section data-slot="catalog-list" className="rounded-lg bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="tabular-nums font-medium text-foreground">{total}</span>{" "}
              {TOTAL_LABEL}
            </p>
          </div>
          <BookTable
            books={books}
            categories={categories}
            expandedBook={expandedBook}
            isDetailLoading={isDetailLoading}
            onToggleExpand={(bookId) => void toggleExpand(bookId)}
          />
          {totalPages > 1 && (
            <div className="mt-4 flex justify-end">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(nextPage) => void setPage(nextPage)}
              />
            </div>
          )}
        </section>
      )}

      <BookDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

export default CatalogPage;
