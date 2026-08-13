"use client";

import { useEffect, useRef, useState } from "react";
import { InboxIcon, RefreshCcwIcon, SearchIcon, TriangleAlertIcon } from "lucide-react";

import { CategoryFilter } from "@/components/category-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

import { BookCard } from "./components/book-card";
import { useSearch } from "./hooks/use-search";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_PLACEHOLDER = "ค้นหาชื่อหนังสือ ผู้แต่ง หรือ ISBN...";

const PAGE_TITLE = "ค้นหาหนังสือ";
const PAGE_SUBTITLE = "ค้นหาและยืมหนังสือด้วยตัวเองจากแคตตาล็อกห้องสมุด";
const EMPTY_TITLE = "ไม่พบหนังสือที่ค้นหา";
const EMPTY_HINT = "ลองเปลี่ยนคำค้น หรือเลือกหมวดหมู่อื่น";
const LOAD_ERROR_TITLE = "โหลดรายการหนังสือไม่สำเร็จ";
const RETRY_LABEL = "ลองใหม่อีกครั้ง";
const TOTAL_LABEL = "รายการ";

function SearchSkeleton() {
  return (
    <div data-slot="search-skeleton" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <Skeleton key={item} className="aspect-[3/4] rounded-lg" />
      ))}
    </div>
  );
}

export function SearchPage() {
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
    loadBooks,
    loadCategories,
    setCategoryId,
    setSearch,
    setPage,
  } = useSearch();

  const [searchInput, setSearchInput] = useState("");
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

  const isEmpty = !isLoading && !isError && books.length === 0;

  return (
    <div data-slot="search-page" className="flex flex-col gap-5">
      <section data-slot="search-heading">
        <h1 className="text-title font-semibold text-foreground">{PAGE_TITLE}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{PAGE_SUBTITLE}</p>
      </section>

      <section data-slot="search-toolbar" className="flex flex-col gap-3">
        <div className="relative">
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
          className="w-full"
        />
      </section>

      {isError ? (
        <section
          data-slot="search-error"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-accent-coral/10 text-accent-coral">
            <TriangleAlertIcon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">{LOAD_ERROR_TITLE}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {errorMessage ?? "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่"}
          </p>
          <Button type="button" variant="outline" onClick={() => void loadBooks()}>
            <RefreshCcwIcon />
            {RETRY_LABEL}
          </Button>
        </section>
      ) : isLoading && books.length === 0 ? (
        <SearchSkeleton />
      ) : isEmpty ? (
        <section
          data-slot="search-empty"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
            <InboxIcon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">{EMPTY_TITLE}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{EMPTY_HINT}</p>
        </section>
      ) : (
        <section data-slot="search-results">
          <p className="mb-3 text-sm text-muted-foreground">
            <span className="tabular-nums font-medium text-foreground">{total}</span> {TOTAL_LABEL}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-5 flex justify-center">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(nextPage) => void setPage(nextPage)}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default SearchPage;
