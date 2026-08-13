"use client";

import { useBookDetailStore } from "../stores/book-detail.store";
import type { BookCopy } from "@libsys/shared";

export function useBookDetail() {
  const book = useBookDetailStore((state) => state.book);
  const reservations = useBookDetailStore((state) => state.reservations);
  const isLoading = useBookDetailStore((state) => state.isLoading);
  const isError = useBookDetailStore((state) => state.isError);
  const errorMessage = useBookDetailStore((state) => state.errorMessage);
  const isSubmitting = useBookDetailStore((state) => state.isSubmitting);
  const submitError = useBookDetailStore((state) => state.submitError);
  const successMessage = useBookDetailStore((state) => state.successMessage);

  const load = useBookDetailStore((state) => state.load);
  const checkout = useBookDetailStore((state) => state.checkout);
  const reserve = useBookDetailStore((state) => state.reserve);

  const availableCopies: BookCopy[] =
    book?.copies.filter((copy) => copy.status === "available") ?? [];
  const hasActiveReservation =
    book !== null &&
    reservations.some(
      (item) =>
        item.reservation.bookId === book.id &&
        (item.reservation.status === "waiting" || item.reservation.status === "ready"),
    );

  return {
    book,
    reservations,
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
  };
}
