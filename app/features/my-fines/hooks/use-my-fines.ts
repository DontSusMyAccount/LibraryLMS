"use client";

import { useMyFinesStore } from "../stores/my-fines.store";

export function useMyFines() {
  const fines = useMyFinesStore((state) => state.fines);
  const unpaidTotal = useMyFinesStore((state) => state.unpaidTotal);
  const isLoading = useMyFinesStore((state) => state.isLoading);
  const isError = useMyFinesStore((state) => state.isError);
  const errorMessage = useMyFinesStore((state) => state.errorMessage);

  const load = useMyFinesStore((state) => state.load);

  return { fines, unpaidTotal, isLoading, isError, errorMessage, load };
}
