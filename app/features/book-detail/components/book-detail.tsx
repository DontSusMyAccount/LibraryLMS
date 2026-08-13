"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BookOpenTextIcon,
  CalendarCheckIcon,
  CircleCheckIcon,
  Clock3Icon,
  TriangleAlertIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useBookDetail } from "../hooks/use-book-detail";

interface BookDetailProps {
  bookId: string;
}

const COPY_STATUS_LABELS = {
  available: "ว่าง",
  borrowed: "ยืมอยู่",
  reserved: "จองอยู่",
  lost: "สูญหาย",
  damaged: "ชำรุด",
  withdrawn: "ถอนออก",
} as const;

export function BookDetail({ bookId }: BookDetailProps) {
  const {
    book,
    isLoading,
    isError,
    errorMessage,
    isSubmitting,
    submitError,
    successMessage,
    availableCopies,
    hasActiveReservation,
    load,
    checkout,
    reserve,
  } = useBookDetail();

  useEffect(() => {
    void load(bookId);
  }, [bookId, load]);

  const handleCheckout = () => {
    const firstAvailable = availableCopies[0];
    if (firstAvailable) {
      void checkout(firstAvailable.copyCode);
    }
  };

  return (
    <div data-slot="book-detail-page" className="flex flex-col gap-4">
      <Link
        href="/search"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        กลับไปค้นหา
      </Link>

      {isError ? (
        <section
          data-slot="book-detail-error"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-accent-coral/10 text-accent-coral">
            <TriangleAlertIcon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">ไม่พบหนังสือ</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {errorMessage ?? "ไม่สามารถโหลดข้อมูลหนังสือได้"}
          </p>
          <Button type="button" variant="outline" onClick={() => void load(bookId)}>
            ลองใหม่อีกครั้ง
          </Button>
        </section>
      ) : isLoading || book === null ? (
        <div data-slot="book-detail-loading" className="flex flex-col gap-4">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      ) : (
        <>
          <Card className="gap-0 overflow-hidden">
            <div className="relative flex h-52 items-center justify-center bg-muted sm:h-64">
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.coverUrl}
                  alt={`ปกหนังสือ ${book.title}`}
                  className="size-full object-cover"
                />
              ) : (
                <BookOpenTextIcon className="size-16 text-muted-foreground" aria-hidden="true" />
              )}
              <Badge
                variant={availableCopies.length > 0 ? "default" : "secondary"}
                className="absolute top-3 left-3 bg-background/90 backdrop-blur-md"
              >
                {availableCopies.length > 0
                  ? `ว่าง ${availableCopies.length} จาก ${book.copies.length}`
                  : "ถูกยืมหมด"}
              </Badge>
            </div>
            <CardContent className="flex flex-col gap-3 py-4">
              <div>
                <h1 className="text-title font-semibold text-foreground">{book.title}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">{book.author}</p>
              </div>
              {book.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">{book.description}</p>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {book.publisher && (
                  <>
                    <dt className="text-muted-foreground">สำนักพิมพ์</dt>
                    <dd className="font-medium text-foreground">{book.publisher}</dd>
                  </>
                )}
                {book.publishedYear && (
                  <>
                    <dt className="text-muted-foreground">ปีพิมพ์</dt>
                    <dd className="font-medium text-foreground">{book.publishedYear + 543}</dd>
                  </>
                )}
                {book.isbn && (
                  <>
                    <dt className="text-muted-foreground">ISBN</dt>
                    <dd className="font-medium tabular-nums text-foreground">{book.isbn}</dd>
                  </>
                )}
                {book.language && (
                  <>
                    <dt className="text-muted-foreground">ภาษา</dt>
                    <dd className="font-medium text-foreground">{book.language}</dd>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card size="sm" className="gap-3">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-title font-semibold text-foreground">ความพร้อมของสำเนา</h2>
                <span className="text-sm text-muted-foreground">{book.copies.length} สำเนา</span>
              </div>
              {book.copies.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีสำเนาในระบบ</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {book.copies.map((copy) => (
                    <li
                      key={copy.id}
                      className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
                    >
                      <span className="font-medium tabular-nums text-foreground">
                        {copy.copyCode}
                      </span>
                      <Badge
                        variant={
                          copy.status === "available"
                            ? "default"
                            : copy.status === "borrowed"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {COPY_STATUS_LABELS[copy.status] ?? copy.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}

              {availableCopies.length > 0 ? (
                <Button type="button" size="lg" disabled={isSubmitting} onClick={handleCheckout}>
                  <CalendarCheckIcon />
                  {isSubmitting ? "กำลังดำเนินการ..." : "ยืมหนังสือเล่มนี้"}
                </Button>
              ) : hasActiveReservation ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-brand-500/10 px-4 py-3 text-sm">
                  <p className="flex items-center gap-2 font-medium text-brand-700 dark:text-brand-300">
                    <Clock3Icon className="size-4" aria-hidden="true" />
                    คุณอยู่ในคิวของหนังสือเล่มนี้แล้ว
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    render={<Link href="/my-reservations" />}
                  >
                    ดูคิวของฉัน
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={() => void reserve(book.id)}
                >
                  <Clock3Icon />
                  {isSubmitting ? "กำลังดำเนินการ..." : "จองหนังสือ (เข้าคิว)"}
                </Button>
              )}

              {successMessage && (
                <section
                  data-slot="book-detail-success"
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-brand-500/30 bg-brand-500/5 px-3 py-2.5 text-sm text-brand-700 dark:text-brand-300"
                >
                  <CircleCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <p>
                    {successMessage} —{" "}
                    <Link href="/my-loans" className="font-medium underline underline-offset-4">
                      ดูการยืมของฉัน
                    </Link>
                  </p>
                </section>
              )}

              {submitError && (
                <section
                  data-slot="book-detail-error-message"
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-accent-coral/30 bg-accent-coral/5 px-3 py-2.5 text-sm text-accent-coral"
                >
                  <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <p>{submitError}</p>
                </section>
              )}

              {availableCopies.length === 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  เมื่อมีสำเนาคืน คุณจะได้อันดับคิวถัดไป — ติดตามสถานะได้ที่หน้าการจองของฉัน
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
