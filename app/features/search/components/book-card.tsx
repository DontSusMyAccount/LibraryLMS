"use client";

import Link from "next/link";
import { BookOpenTextIcon, CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { BookListItem } from "@/app/features/catalog/catalog.types";

interface BookCardProps {
  book: BookListItem;
}

export function BookCard({ book }: BookCardProps) {
  const available = book.availableCopies;
  const hasAvailable = available > 0;

  return (
    <Link
      href={`/books/${book.id}`}
      data-slot="book-card"
      aria-label={`${book.title} — ${hasAvailable ? "พร้อมยืม" : "ถูกยืมหมด"}`}
      className="group block h-full rounded-lg focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:outline-none"
    >
      <Card className="flex h-full flex-col transition-all group-hover:border-brand-500/40 group-hover:shadow-md">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverUrl}
              alt={`ปกหนังสือ ${book.title}`}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <BookOpenTextIcon className="size-10" aria-hidden="true" />
            </div>
          )}
          <Badge
            variant={hasAvailable ? "default" : "secondary"}
            className={cn(
              "absolute top-2 left-2 backdrop-blur-md",
              hasAvailable
                ? "bg-background/90 text-brand-700 dark:text-brand-300"
                : "bg-background/90",
            )}
          >
            {hasAvailable ? (
              <>
                <CheckIcon className="size-3" aria-hidden="true" />
                ว่าง {available}
              </>
            ) : (
              "ถูกยืมหมด"
            )}
          </Badge>
        </div>
        <CardContent className="flex flex-1 flex-col gap-1 py-3">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-foreground">
            {book.title}
          </h3>
          <p className="line-clamp-1 text-xs text-muted-foreground">{book.author}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
