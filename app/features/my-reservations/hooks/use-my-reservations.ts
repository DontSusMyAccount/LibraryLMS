"use client";

import { useMyReservationsStore } from "../stores/my-reservations.store";

export function useMyReservations() {
  const reservations = useMyReservationsStore((state) => state.reservations);
  const isLoading = useMyReservationsStore((state) => state.isLoading);
  const isError = useMyReservationsStore((state) => state.isError);
  const errorMessage = useMyReservationsStore((state) => state.errorMessage);
  const cancellingId = useMyReservationsStore((state) => state.cancellingId);
  const cancelError = useMyReservationsStore((state) => state.cancelError);

  const load = useMyReservationsStore((state) => state.load);
  const cancel = useMyReservationsStore((state) => state.cancel);

  return {
    reservations,
    isLoading,
    isError,
    errorMessage,
    cancellingId,
    cancelError,
    load,
    cancel,
  };
}
