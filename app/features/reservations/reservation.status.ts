import type { BookWithCopies, ReservationStatus } from "@libsys/shared";

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  waiting: "รอคิว",
  ready: "พร้อมรับ",
  fulfilled: "รับแล้ว",
  expired: "หมดอายุ",
  cancelled: "ยกเลิก",
  suspended: "ระงับชั่วคราว",
};

export interface StatusTone {
  badgeClass: string;
  dotClass: string;
}

export const RESERVATION_STATUS_TONES: Record<ReservationStatus, StatusTone> = {
  waiting: {
    badgeClass: "bg-accent-amber/15 text-accent-amber dark:text-accent-amber",
    dotClass: "bg-accent-amber",
  },
  ready: {
    badgeClass: "bg-accent-mint/15 text-brand-700 dark:text-brand-300",
    dotClass: "bg-accent-mint",
  },
  fulfilled: {
    badgeClass: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
    dotClass: "bg-brand-500",
  },
  expired: {
    badgeClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  cancelled: {
    badgeClass: "bg-accent-coral/15 text-accent-coral dark:text-accent-coral",
    dotClass: "bg-accent-coral",
  },
  suspended: {
    badgeClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

export function statusToneFor(status: ReservationStatus): StatusTone {
  return RESERVATION_STATUS_TONES[status];
}

export function reservationStatusLabel(status: ReservationStatus): string {
  return RESERVATION_STATUS_LABELS[status];
}

export interface BookNameMapValue {
  title?: string;
  author?: string;
}

export function buildBookNameMap(books: BookWithCopies[]): Map<string, BookNameMapValue> {
  const map = new Map<string, BookNameMapValue>();
  for (const book of books) {
    map.set(book.id, { title: book.title, author: book.author });
  }
  return map;
}
