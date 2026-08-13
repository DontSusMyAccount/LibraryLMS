"use client";

import { create } from "zustand";

import { cancelMyReservation, fetchMyReservations } from "../actions/my-reservations.action";
import type { MyReservationItem } from "../my-reservations.types";

const FALLBACK_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่";

interface MyReservationsStoreState {
  reservations: MyReservationItem[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  cancellingId: string | null;
  cancelError: string | null;
  load: () => Promise<void>;
  cancel: (reservationId: string) => Promise<boolean>;
  reset: () => void;
}

const initialState = {
  reservations: [],
  isLoading: false,
  isError: false,
  errorMessage: null,
  cancellingId: null,
  cancelError: null,
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

export const useMyReservationsStore = create<MyReservationsStoreState>((set) => ({
  ...initialState,

  load: async () => {
    set({ isLoading: true, isError: false, errorMessage: null });
    try {
      const reservations = await fetchMyReservations();
      set({ reservations, isLoading: false });
    } catch (error) {
      set({ isLoading: false, isError: true, errorMessage: toErrorMessage(error) });
    }
  },

  cancel: async (reservationId) => {
    set({ cancellingId: reservationId, cancelError: null });
    try {
      await cancelMyReservation(reservationId);
      set((state) => ({
        reservations: state.reservations.filter((item) => item.reservation.id !== reservationId),
        cancellingId: null,
      }));
      return true;
    } catch (error) {
      set({ cancellingId: null, cancelError: toErrorMessage(error) });
      return false;
    }
  },

  reset: () => set({ ...initialState }),
}));
