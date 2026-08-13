"use client";

import { create } from "zustand";

import type { UserPublic } from "@libsys/shared";

import {
  checkin as checkinAction,
  checkout as checkoutAction,
  fetchMemberFinesTotal as fetchMemberFinesTotalAction,
  fetchMemberMaxRenewals as fetchMemberMaxRenewalsAction,
  loadActiveLoans as loadActiveLoansAction,
  recall as recallAction,
  renew as renewAction,
  searchMembers as searchMembersAction,
} from "../actions/circulation.action";
import { formatThaiDate } from "../circulation.format";
import type {
  ActiveLoanItem,
  CheckoutCartItem,
  DueDateStampData,
  MemberCardData,
} from "../circulation.types";

const FALLBACK_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่";
const SUSPENDED_BLOCK_MESSAGE = "สมาชิกถูกระงับสิทธิ์ ไม่สามารถยืมได้";
const MIXED_RESULT_MESSAGE = "บางรายการยืมสำเร็จ บางรายการไม่สำเร็จ โปรดตรวจสอบ";
const CHECKOUT_SUCCESS_PREFIX = "ยืมสำเร็จ กำหนดคืน";

const COPY_ALREADY_LOANED_ERROR = "สำเนานี้ถูกยืมอยู่";
const MEMBER_SUSPENDED_ERROR = "สมาชิกถูกระงับสิทธิ์การใช้งาน";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

function mapCirculationError(error: unknown): string {
  const message = toErrorMessage(error);
  if (message.includes("ถูกยืมอยู่")) {
    return COPY_ALREADY_LOANED_ERROR;
  }
  if (message.includes("ถูกระงับสิทธิ์")) {
    return MEMBER_SUSPENDED_ERROR;
  }
  return message;
}

interface CirculationStoreState {
  memberQuery: string;
  searchResults: UserPublic[];
  isSearching: boolean;
  selectedMember: MemberCardData | null;
  isMemberLoading: boolean;
  cart: CheckoutCartItem[];
  checkoutError: string | null;
  dueDateStamp: DueDateStampData | null;
  toastMessage: string | null;
  activeLoans: ActiveLoanItem[];
  isLoansLoading: boolean;
  isBusy: boolean;
  searchMember: (query: string) => Promise<void>;
  selectMember: (user: UserPublic) => Promise<void>;
  clearMember: () => void;
  addCopyCode: (copyCode: string) => void;
  removeCopyCode: (copyCode: string) => void;
  clearCart: () => void;
  checkout: () => Promise<void>;
  checkin: (copyCode: string) => Promise<boolean>;
  renew: (loanId: string) => Promise<boolean>;
  recall: (loanId: string) => Promise<boolean>;
  refreshActiveLoans: () => Promise<void>;
  canRenew: (loanId: string) => boolean;
  dismissToast: () => void;
  reset: () => void;
}

export const initialCirculationState = {
  memberQuery: "",
  searchResults: [],
  isSearching: false,
  selectedMember: null,
  isMemberLoading: false,
  cart: [],
  checkoutError: null,
  dueDateStamp: null,
  toastMessage: null,
  activeLoans: [],
  isLoansLoading: false,
  isBusy: false,
};

function buildMemberCard(
  user: UserPublic,
  activeLoans: ActiveLoanItem[],
  finesTotal: number | null,
  maxRenewals: number,
): MemberCardData {
  return {
    user,
    activeLoans,
    activeLoansCount: activeLoans.length,
    overdueCount: activeLoans.filter((item) => item.overdue).length,
    finesTotal,
    isSuspended: user.status === "suspended",
    maxRenewals,
  };
}

export const useCirculationStore = create<CirculationStoreState>((set, get) => ({
  ...initialCirculationState,

  searchMember: async (query) => {
    set({ memberQuery: query, isSearching: true, checkoutError: null });
    try {
      const results = await searchMembersAction(query);
      set({ searchResults: results, isSearching: false });
    } catch (error) {
      set({ searchResults: [], isSearching: false, checkoutError: mapCirculationError(error) });
    }
  },

  selectMember: async (user) => {
    set({ isMemberLoading: true, selectedMember: null, checkoutError: null, dueDateStamp: null });
    try {
      const [activeLoans, finesTotal, maxRenewals] = await Promise.all([
        loadActiveLoansAction(user.id),
        fetchMemberFinesTotalAction(),
        fetchMemberMaxRenewalsAction(user.role, user.memberType),
      ]);
      const memberCard = buildMemberCard(user, activeLoans, finesTotal, maxRenewals);
      set({ selectedMember: memberCard, activeLoans, isMemberLoading: false });
    } catch (error) {
      set({ isMemberLoading: false, checkoutError: mapCirculationError(error) });
    }
  },

  clearMember: () => {
    set({
      selectedMember: null,
      activeLoans: [],
      cart: [],
      dueDateStamp: null,
      checkoutError: null,
    });
  },

  addCopyCode: (copyCode) => {
    const normalized = copyCode.trim();
    if (!normalized) {
      return;
    }
    const cart = get().cart;
    if (cart.some((item) => item.copyCode === normalized)) {
      return;
    }
    set({ cart: [...cart, { copyCode: normalized, error: null }] });
  },

  removeCopyCode: (copyCode) => {
    set({ cart: get().cart.filter((item) => item.copyCode !== copyCode) });
  },

  clearCart: () => {
    set({ cart: [], checkoutError: null });
  },

  checkout: async () => {
    const member = get().selectedMember;
    const cart = get().cart;
    if (!member || cart.length === 0) {
      return;
    }
    if (member.isSuspended) {
      set({ checkoutError: SUSPENDED_BLOCK_MESSAGE });
      return;
    }
    set({ isBusy: true, checkoutError: null });
    const succeeded: string[] = [];
    const remaining: CheckoutCartItem[] = [];
    let lastDueDate: string | null = null;
    for (const item of cart) {
      try {
        const result = await checkoutAction(member.user.id, item.copyCode);
        succeeded.push(item.copyCode);
        lastDueDate = result.dueDate;
      } catch (error) {
        remaining.push({ copyCode: item.copyCode, error: mapCirculationError(error) });
      }
    }
    if (succeeded.length > 0 && lastDueDate) {
      set({
        isBusy: false,
        cart: remaining,
        dueDateStamp: {
          copyCodes: succeeded,
          dueDate: lastDueDate,
          memberName: member.user.fullName,
        },
        toastMessage: `${CHECKOUT_SUCCESS_PREFIX} ${formatThaiDate(lastDueDate)}`,
        checkoutError: remaining.length > 0 ? MIXED_RESULT_MESSAGE : null,
      });
    } else {
      set({
        isBusy: false,
        cart: remaining,
        checkoutError: remaining[0]?.error ?? FALLBACK_ERROR_MESSAGE,
      });
    }
    await get().refreshActiveLoans();
  },

  checkin: async (copyCode) => {
    set({ isBusy: true, checkoutError: null });
    try {
      const result = await checkinAction(copyCode);
      const fineMessage =
        result.fine != null ? ` ค่าปรับ ${result.fine.amount.toLocaleString("th-TH")} บาท` : "";
      set({ isBusy: false, toastMessage: `คืนสำเร็จ สำเนา ${copyCode}${fineMessage}` });
      return true;
    } catch (error) {
      set({ isBusy: false, checkoutError: mapCirculationError(error) });
      return false;
    }
  },

  renew: async (loanId) => {
    set({ isBusy: true, checkoutError: null });
    try {
      const result = await renewAction(loanId);
      set({
        isBusy: false,
        toastMessage: `ต่ออายุสำเร็จ กำหนดคืนใหม่ ${formatThaiDate(result.dueDate)}`,
      });
      await get().refreshActiveLoans();
      return true;
    } catch (error) {
      set({ isBusy: false, checkoutError: mapCirculationError(error) });
      return false;
    }
  },

  recall: async (loanId) => {
    set({ isBusy: true, checkoutError: null });
    try {
      const result = await recallAction(loanId);
      set({
        isBusy: false,
        toastMessage: `เรียกคืนสำเร็จ กำหนดคืนใหม่ ${formatThaiDate(result.dueDate)}`,
      });
      await get().refreshActiveLoans();
      return true;
    } catch (error) {
      set({ isBusy: false, checkoutError: mapCirculationError(error) });
      return false;
    }
  },

  refreshActiveLoans: async () => {
    const member = get().selectedMember;
    if (!member) {
      return;
    }
    set({ isLoansLoading: true });
    try {
      const loans = await loadActiveLoansAction(member.user.id);
      const nextMember: MemberCardData = {
        ...member,
        activeLoans: loans,
        activeLoansCount: loans.length,
        overdueCount: loans.filter((item) => item.overdue).length,
      };
      set({ selectedMember: nextMember, activeLoans: loans, isLoansLoading: false });
    } catch {
      set({ activeLoans: [], isLoansLoading: false });
    }
  },

  canRenew: (loanId) => {
    const member = get().selectedMember;
    const item = get().activeLoans.find((entry) => entry.loan.id === loanId);
    if (!member || !item) {
      return false;
    }
    return !(item.loan.renewedCount >= member.maxRenewals || item.hasActiveReservation);
  },

  dismissToast: () => {
    set({ toastMessage: null });
  },

  reset: () => {
    set({ ...initialCirculationState });
  },
}));
