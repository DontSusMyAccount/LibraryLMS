"use client";

import { useCirculationStore } from "../stores/circulation.store";

export function useCirculation() {
  const memberQuery = useCirculationStore((state) => state.memberQuery);
  const searchResults = useCirculationStore((state) => state.searchResults);
  const isSearching = useCirculationStore((state) => state.isSearching);
  const selectedMember = useCirculationStore((state) => state.selectedMember);
  const isMemberLoading = useCirculationStore((state) => state.isMemberLoading);
  const cart = useCirculationStore((state) => state.cart);
  const checkoutError = useCirculationStore((state) => state.checkoutError);
  const dueDateStamp = useCirculationStore((state) => state.dueDateStamp);
  const toastMessage = useCirculationStore((state) => state.toastMessage);
  const activeLoans = useCirculationStore((state) => state.activeLoans);
  const isLoansLoading = useCirculationStore((state) => state.isLoansLoading);
  const isBusy = useCirculationStore((state) => state.isBusy);

  const searchMember = useCirculationStore((state) => state.searchMember);
  const selectMember = useCirculationStore((state) => state.selectMember);
  const clearMember = useCirculationStore((state) => state.clearMember);
  const addCopyCode = useCirculationStore((state) => state.addCopyCode);
  const removeCopyCode = useCirculationStore((state) => state.removeCopyCode);
  const clearCart = useCirculationStore((state) => state.clearCart);
  const checkout = useCirculationStore((state) => state.checkout);
  const checkin = useCirculationStore((state) => state.checkin);
  const renew = useCirculationStore((state) => state.renew);
  const recall = useCirculationStore((state) => state.recall);
  const canRenew = useCirculationStore((state) => state.canRenew);
  const dismissToast = useCirculationStore((state) => state.dismissToast);

  return {
    memberQuery,
    searchResults,
    isSearching,
    selectedMember,
    isMemberLoading,
    cart,
    checkoutError,
    dueDateStamp,
    toastMessage,
    activeLoans,
    isLoansLoading,
    isBusy,
    searchMember,
    selectMember,
    clearMember,
    addCopyCode,
    removeCopyCode,
    clearCart,
    checkout,
    checkin,
    renew,
    recall,
    canRenew,
    dismissToast,
  };
}
