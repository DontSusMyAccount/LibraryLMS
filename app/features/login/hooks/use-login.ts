"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "../stores/auth.store";
import type { SignInCredentials } from "../stores/auth.store";

export function useLogin() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);
  const clearError = useAuthStore((state) => state.clearError);

  const handleSubmit = useCallback(
    async (credentials: SignInCredentials) => {
      await signIn(credentials, router);
    },
    [router, signIn],
  );

  return { session, isSubmitting, errorMessage, clearError, handleSubmit, signOut };
}
