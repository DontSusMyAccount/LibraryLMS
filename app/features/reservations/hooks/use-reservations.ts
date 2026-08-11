"use client";

import { useReservationStore } from "../stores/reservation.store";

export function useReservations() {
  const reservations = useReservationStore((state) => state.reservations);
  const status = useReservationStore((state) => state.status);
  const page = useReservationStore((state) => state.page);
  const totalPages = useReservationStore((state) => state.totalPages);
  const total = useReservationStore((state) => state.total);
  const isLoading = useReservationStore((state) => state.isLoading);
  const isError = useReservationStore((state) => state.isError);
  const errorMessage = useReservationStore((state) => state.errorMessage);
  const expandedBookId = useReservationStore((state) => state.expandedBookId);
  const isBusy = useReservationStore((state) => state.isBusy);

  const loadReservations = useReservationStore((state) => state.loadReservations);
  const setStatus = useReservationStore((state) => state.setStatus);
  const setPage = useReservationStore((state) => state.setPage);
  const markReady = useReservationStore((state) => state.markReady);
  const fulfill = useReservationStore((state) => state.fulfill);
  const toggleExpand = useReservationStore((state) => state.toggleExpand);
  const queuePerBook = useReservationStore((state) => state.queuePerBook);

  return {
    reservations,
    status,
    page,
    total,
    totalPages,
    isLoading,
    isError,
    errorMessage,
    expandedBookId,
    isBusy,
    loadReservations,
    setStatus,
    setPage,
    markReady,
    fulfill,
    toggleExpand,
    queuePerBook,
  };
}
