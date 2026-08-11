"use client";

import { create } from "zustand";

import type { ReservationStatus } from "@libsys/shared";

import {
  fetchReservations as fetchReservationsAction,
  fulfill as fulfillAction,
  markReady as markReadyAction,
} from "../actions/reservation.action";
import type { ReservationListItem } from "../reservation.types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;

const FALLBACK_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่";

interface ReservationStoreState {
  reservations: ReservationListItem[];
  status: ReservationStatus | null;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  expandedBookId: string | null;
  isBusy: boolean;
  loadReservations: () => Promise<void>;
  setStatus: (status: ReservationStatus | null) => Promise<void>;
  setPage: (page: number) => Promise<void>;
  markReady: (id: string) => Promise<boolean>;
  fulfill: (id: string, loanId: string) => Promise<boolean>;
  toggleExpand: (bookId: string) => void;
  queuePerBook: (bookId: string) => ReservationListItem[];
  reset: () => void;
}

export const initialReservationState = {
  reservations: [],
  status: null,
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
  isLoading: false,
  isError: false,
  errorMessage: null,
  expandedBookId: null,
  isBusy: false,
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

function toListParams(state: Pick<ReservationStoreState, "status" | "page" | "limit">) {
  return {
    status: state.status,
    page: state.page,
    limit: state.limit,
  };
}

function mergeReservation(
  reservations: ReservationListItem[],
  updated: ReservationListItem,
): ReservationListItem[] {
  return reservations.map((item) => (item.id === updated.id ? { ...item, ...updated } : item));
}

export const useReservationStore = create<ReservationStoreState>((set, get) => ({
  ...initialReservationState,

  loadReservations: async () => {
    set({ isLoading: true, isError: false, errorMessage: null });
    try {
      const result = await fetchReservationsAction(toListParams(get()));
      set({
        reservations: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, isError: true, errorMessage: toErrorMessage(error) });
    }
  },

  setStatus: async (status) => {
    set({ status, page: DEFAULT_PAGE });
    await get().loadReservations();
  },

  setPage: async (page) => {
    set({ page });
    await get().loadReservations();
  },

  markReady: async (id) => {
    set({ isBusy: true, errorMessage: null });
    try {
      const reservation = await markReadyAction(id);
      set({
        isBusy: false,
        reservations: mergeReservation(get().reservations, reservation),
      });
      return true;
    } catch (error) {
      set({ isBusy: false, errorMessage: toErrorMessage(error) });
      return false;
    }
  },

  fulfill: async (id, loanId) => {
    set({ isBusy: true, errorMessage: null });
    try {
      const reservation = await fulfillAction(id, loanId);
      set({
        isBusy: false,
        reservations: mergeReservation(get().reservations, reservation),
      });
      return true;
    } catch (error) {
      set({ isBusy: false, errorMessage: toErrorMessage(error) });
      return false;
    }
  },

  toggleExpand: (bookId) => {
    set({ expandedBookId: get().expandedBookId === bookId ? null : bookId });
  },

  queuePerBook: (bookId) => {
    const queue = get()
      .reservations.filter((item) => item.bookId === bookId)
      .sort((a, b) => a.reservedAt.localeCompare(b.reservedAt));
    return queue;
  },

  reset: () => set({ ...initialReservationState }),
}));
