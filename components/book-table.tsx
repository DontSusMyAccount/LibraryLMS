"use client";

import { useMemo } from "react";
import { BookImageIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import type {
  BookListItem,
  BookWithCopies,
  CategoryNode,
} from "@/app/features/catalog/catalog.types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CopyList } from "@/components/copy-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BookAvailability {
  label: string;
  badgeClass: string;
  dotClass: string;
}

function getBookAvailability(book: BookListItem): BookAvailability {
  if (book.totalCopies === 0) {
    return {
      label: "ไม่มีสำเนา",
      badgeClass: "bg-muted text-muted-foreground",
      dotClass: "bg-muted-foreground",
    };
  }
  if (book.availableCopies > 0) {
    return {
      label: "พร้อมยืม",
      badgeClass: "bg-accent-mint/15 text-brand-700 dark:text-brand-300",
      dotClass: "bg-accent-mint",
    };
  }
  return {
    label: "ยืมครบ",
    badgeClass: "bg-accent-coral/15 text-accent-coral dark:text-accent-coral",
    dotClass: "bg-accent-coral",
  };
}

function buildCategoryNameMap(categories: CategoryNode[]): Map<string, string> {
  const nameByCategoryId = new Map<string, string>();
  const visit = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      nameByCategoryId.set(node.id, node.name);
      if (node.children) {
        visit(node.children);
      }
    }
  };
  visit(categories);
  return nameByCategoryId;
}

interface BookCoverThumbnailProps {
  coverUrl?: string;
  title: string;
}

function BookCoverThumbnail({ coverUrl, title }: BookCoverThumbnailProps) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={`รูปปก ${title}`}
        className="size-12 shrink-0 rounded-md border border-border/60 object-cover"
        data-slot="book-cover-thumbnail"
      />
    );
  }
  return (
    <div
      className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
      data-slot="book-cover-placeholder"
    >
      <BookImageIcon className="size-5" />
    </div>
  );
}

interface BookTableProps {
  books: BookListItem[];
  categories: CategoryNode[];
  expandedBook: BookWithCopies | null;
  isDetailLoading: boolean;
  onToggleExpand: (bookId: string) => void;
}

function BookTable({
  books,
  categories,
  expandedBook,
  isDetailLoading,
  onToggleExpand,
}: BookTableProps) {
  const categoryNameById = useMemo(() => buildCategoryNameMap(categories), [categories]);

  return (
    <Table data-slot="book-table">
      <TableHeader>
        <TableRow>
          <TableHead className="w-14" />
          <TableHead>ปก</TableHead>
          <TableHead>ชื่อหนังสือ</TableHead>
          <TableHead>ผู้แต่ง</TableHead>
          <TableHead>หมวดหมู่</TableHead>
          <TableHead className="text-right">สำเนา</TableHead>
          <TableHead>สถานะ</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {books.map((book) => {
          const isExpanded = expandedBook?.id === book.id;
          const availability = getBookAvailability(book);
          const categoryName = book.categoryId
            ? (categoryNameById.get(book.categoryId) ?? "ไม่ระบุ")
            : "ไม่ระบุ";
          return (
            <BookTableRows
              key={book.id}
              book={book}
              isExpanded={isExpanded}
              categoryName={categoryName}
              availability={availability}
              expandedCopies={expandedBook?.copies ?? []}
              isDetailLoading={isDetailLoading}
              onToggleExpand={onToggleExpand}
            />
          );
        })}
      </TableBody>
    </Table>
  );
}

interface BookTableRowsProps {
  book: BookListItem;
  isExpanded: boolean;
  categoryName: string;
  availability: BookAvailability;
  expandedCopies: BookWithCopies["copies"];
  isDetailLoading: boolean;
  onToggleExpand: (bookId: string) => void;
}

function BookTableRows({
  book,
  isExpanded,
  categoryName,
  availability,
  expandedCopies,
  isDetailLoading,
  onToggleExpand,
}: BookTableRowsProps) {
  return (
    <>
      <TableRow data-state={isExpanded ? "selected" : undefined}>
        <TableCell className="px-3 py-3 text-right">
          <span className="tabular-nums text-muted-foreground">
            {book.availableCopies}/{book.totalCopies}
          </span>
        </TableCell>
        <TableCell>
          <BookCoverThumbnail coverUrl={book.coverUrl} title={book.title} />
        </TableCell>
        <TableCell className="max-w-[280px]">
          <p className="truncate font-medium text-foreground">{book.title}</p>
          {book.isbn && (
            <p className="mt-0.5 text-caption text-muted-foreground tabular-nums">
              ISBN {book.isbn}
            </p>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground">{book.author}</TableCell>
        <TableCell className="text-muted-foreground">{categoryName}</TableCell>
        <TableCell className="text-right">
          <span className="tabular-nums text-muted-foreground">{book.totalCopies}</span>
        </TableCell>
        <TableCell>
          <Badge variant="ghost" className={cn(availability.badgeClass)}>
            <span className={cn("size-1.5 shrink-0 rounded-full", availability.dotClass)} />
            {availability.label}
          </Badge>
        </TableCell>
        <TableCell>
          <button
            type="button"
            onClick={() => onToggleExpand(book.id)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "ย่อแถวสำเนา" : "ขยายแถวสำเนา"}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </button>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="!border-b-0">
          <TableCell colSpan={8} className="bg-muted/30 px-4 pt-1 pb-4">
            <CopyList bookId={book.id} copies={expandedCopies} isLoading={isDetailLoading} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export { BookTable };

export type { BookTableProps, BookAvailability };
