"use client";

import { create } from "zustand";

import { fetchMyLoans, fetchMyProfile, renewMyLoan } from "../actions/my-loans.action";
import type { MeProfile, MyLoanItem } from "../my-loans.types";

const FALLBACK_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่";

interface MyLoansStoreState {
  profile: MeProfile | null;
  loans: MyLoanItem[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  renewingId: string | null;
  renewError: string | null;
  load: () => Promise<void>;
  renew: (loanId: string) => Promise<boolean>;
  reset: () => void;
}

const initialState = {
  profile: null,
  loans: [],
  isLoading: false,
  isError: false,
  errorMessage: null,
  renewingId: null,
  renewError: null,
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

export const useMyLoansStore = create<MyLoansStoreState>((set) => ({
  ...initialState,

  load: async () => {
    set({ isLoading: true, isError: false, errorMessage: null });
    try {
      const [profile, loans] = await Promise.all([fetchMyProfile(), fetchMyLoans()]);
      set({ profile, loans, isLoading: false });
    } catch (error) {
      set({ isLoading: false, isError: true, errorMessage: toErrorMessage(error) });
    }
  },

  renew: async (loanId) => {
    set({ renewingId: loanId, renewError: null });
    try {
      const result = await renewMyLoan(loanId);
      set((state) => ({
        loans: state.loans.map((item) =>
          item.loan.id === loanId ? { ...item, loan: result.loan } : item,
        ),
        renewingId: null,
      }));
      return true;
    } catch (error) {
      set({ renewingId: null, renewError: toErrorMessage(error) });
      return false;
    }
  },

  reset: () => set({ ...initialState }),
}));
