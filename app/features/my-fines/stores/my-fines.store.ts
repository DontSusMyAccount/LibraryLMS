"use client";

import { create } from "zustand";

import { fetchMyFines } from "../actions/my-fines.action";
import type { FineRecord } from "@libsys/shared";

const FALLBACK_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่";

interface MyFinesStoreState {
  fines: FineRecord[];
  unpaidTotal: number;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  load: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  fines: [],
  unpaidTotal: 0,
  isLoading: false,
  isError: false,
  errorMessage: null,
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

export const useMyFinesStore = create<MyFinesStoreState>((set) => ({
  ...initialState,

  load: async () => {
    set({ isLoading: true, isError: false, errorMessage: null });
    try {
      const result = await fetchMyFines();
      set({ fines: result.fines, unpaidTotal: result.unpaidTotal, isLoading: false });
    } catch (error) {
      set({ isLoading: false, isError: true, errorMessage: toErrorMessage(error) });
    }
  },

  reset: () => set({ ...initialState }),
}));
