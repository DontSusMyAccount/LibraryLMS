"use client";

import { create } from "zustand";

import { fetchDashboardData } from "../actions/dashboard.action";
import type { DashboardData, DashboardIdentity } from "../dashboard.types";

const EMPTY_IDENTITY: DashboardIdentity = {
  userId: null,
  userName: "",
};

const FALLBACK_ERROR_MESSAGE = "เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่";

interface DashboardStoreState {
  data: DashboardData | null;
  identity: DashboardIdentity;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  warnings: string[];
  load: (identity: DashboardIdentity) => Promise<void>;
  reset: () => void;
}

const initialState = {
  data: null,
  identity: EMPTY_IDENTITY,
  isLoading: false,
  isError: false,
  errorMessage: null,
  warnings: [],
};

export const useDashboardStore = create<DashboardStoreState>((set) => ({
  ...initialState,
  load: async (identity) => {
    set({
      isLoading: true,
      isError: false,
      errorMessage: null,
      warnings: [],
      identity,
    });
    try {
      const result = await fetchDashboardData(identity);
      set({
        data: result.data,
        warnings: result.warnings,
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : FALLBACK_ERROR_MESSAGE;
      set({
        isLoading: false,
        isError: true,
        errorMessage: message,
        warnings: [],
      });
    }
  },
  reset: () => set({ ...initialState }),
}));
