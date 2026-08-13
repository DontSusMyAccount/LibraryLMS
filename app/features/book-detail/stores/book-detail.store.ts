"use client";

import { create } from "zustand";

import type { BookWithCopies } from "@libsys/shared";
import type { MyReservationItem } from "@/app/features/my-reservations/my-reservations.types";
import { formatThaiDate } from "@/app/features/circulation/circulation.format";

import {
  checkoutBook,
  fetchBookWithCopies,
  fetchMyReservations,
  reserveBook,
} from "../actions/book-detail.action";

const FALLBACK_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่";

interface BookDetailStoreState {
  book: BookWithCopies | null;
  reservations: MyReservationItem[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  successMessage: string | null;
  load: (bookId: string) => Promise<void>;
  checkout: (copyCode: string) => Promise<boolean>;
  reserve: (bookId: string) => Promise<boolean>;
  reset: () => void;
}

const initialState = {
  book: null,
  reservations: [],
  isLoading: false,
  isError: false,
  errorMessage: null,
  isSubmitting: false,
  submitError: null,
  successMessage: null,
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

export const useBookDetailStore = create<BookDetailStoreState>((set, get) => ({
  ...initialState,

  load: async (bookId) => {
    set({ isLoading: true, isError: false, errorMessage: null });
    try {
      const [book, reservations] = await Promise.all([
        fetchBookWithCopies(bookId),
        fetchMyReservations(),
      ]);
      set({ book, reservations, isLoading: false });
    } catch (error) {
      set({ isLoading: false, isError: true, errorMessage: toErrorMessage(error) });
    }
  },

  checkout: async (copyCode) => {
    set({ isSubmitting: true, submitError: null, successMessage: null });
    try {
      const result = await checkoutBook(copyCode);
      set({
        isSubmitting: false,
        successMessage: `ยืมสำเร็จ ✓ กำหนดคืน ${formatThaiDate(result.dueDate)}`,
      });
      const bookId = get().book?.id;
      if (bookId) {
        // best-effort: refetch สถานะสำเนาหลังยืม (ล้มเหลวไม่บล็อก success message)
        const book = await fetchBookWithCopies(bookId).catch(() => null);
        if (book) {
          set({ book });
        }
      }
      return true;
    } catch (error) {
      set({ isSubmitting: false, submitError: toErrorMessage(error) });
      return false;
    }
  },

  reserve: async (bookId) => {
    set({ isSubmitting: true, submitError: null, successMessage: null });
    try {
      await reserveBook(bookId);
      set({
        isSubmitting: false,
        successMessage: "จองสำเร็จ — รอรับหนังสือเมื่อพร้อม (เช็คที่หน้าการจองของฉัน)",
      });
      const reservations = await fetchMyReservations().catch(() => []);
      set({ reservations });
      return true;
    } catch (error) {
      set({ isSubmitting: false, submitError: toErrorMessage(error) });
      return false;
    }
  },

  reset: () => set({ ...initialState }),
}));
