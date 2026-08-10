"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function buildPageItems(page: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) {
    items.push("ellipsis-start");
  }
  for (let index = start; index <= end; index += 1) {
    items.push(index);
  }
  if (end < totalPages - 1) {
    items.push("ellipsis-end");
  }
  items.push(totalPages);

  return items;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  const items = buildPageItems(page, totalPages);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <nav
      data-slot="pagination"
      aria-label="การแบ่งหน้า"
      className={cn("flex items-center gap-1", className)}
    >
      <button
        type="button"
        data-slot="pagination-prev"
        aria-label="หน้าก่อนหน้า"
        disabled={!canGoPrevious}
        onClick={() => onPageChange(page - 1)}
        className="pointer-events-auto flex size-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeftIcon className="size-4" />
      </button>

      {items.map((item) => {
        if (typeof item === "string") {
          return (
            <span
              key={item}
              data-slot="pagination-ellipsis"
              aria-hidden="true"
              className="flex size-8 items-center justify-center text-muted-foreground"
            >
              …
            </span>
          );
        }

        const isActive = item === page;
        return (
          <button
            key={item}
            type="button"
            data-slot="pagination-page"
            data-active={isActive || undefined}
            aria-label={`หน้า ${item}`}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onPageChange(item)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
              isActive ? "bg-brand-500 text-white" : "text-foreground hover:bg-muted",
            )}
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        data-slot="pagination-next"
        aria-label="หน้าถัดไป"
        disabled={!canGoNext}
        onClick={() => onPageChange(page + 1)}
        className="flex size-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </nav>
  );
}

export { Pagination, buildPageItems };

export type { PaginationProps };
