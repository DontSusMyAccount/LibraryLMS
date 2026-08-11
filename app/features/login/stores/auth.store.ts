"use client";

import {
  getSession,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
  type SignInResponse,
} from "next-auth/react";
import { create } from "zustand";

import { ROUTES } from "@/app/_shared/constants/routes";
import { USER_ROLES, USER_STATUSES } from "@libsys/shared";
import type { UserRole, UserStatus } from "@libsys/shared";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface LoginRouter {
  push: (href: string) => void;
}

type SignInResult = SignInResponse & { user?: AuthUser };

const WRONG_CREDENTIALS_MESSAGE = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
const INACTIVE_ACCOUNT_MESSAGE = "บัญชีผู้ใช้ถูกระงับใช้งาน";
const FALLBACK_SIGNIN_MESSAGE = "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

const INACTIVE_ACCOUNT_CODE = "inactive_account";
const INVALID_CREDENTIALS_CODE = "invalid_credentials";
const CREDENTIALS_SIGNIN_ERROR = "CredentialsSignin";

interface AuthStoreState {
  session: AuthUser | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  signIn: (credentials: SignInCredentials, router: LoginRouter) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const initialState = {
  session: null,
  isSubmitting: false,
  errorMessage: null,
};

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly unknown[]).includes(value);
}

function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === "string" && (USER_STATUSES as readonly unknown[]).includes(value);
}

function toAuthUser(user: unknown): AuthUser | null {
  if (typeof user !== "object" || user === null) {
    return null;
  }
  const record = user as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.email !== "string" ||
    typeof record.fullName !== "string" ||
    !isUserRole(record.role) ||
    !isUserStatus(record.status)
  ) {
    return null;
  }
  return {
    id: record.id,
    email: record.email,
    fullName: record.fullName,
    role: record.role,
    status: record.status,
  };
}

function toSignInErrorMessage(result: SignInResult | null | undefined): string {
  if (result == null) {
    return FALLBACK_SIGNIN_MESSAGE;
  }
  if (result.code === INACTIVE_ACCOUNT_CODE) {
    return INACTIVE_ACCOUNT_MESSAGE;
  }
  if (result.error === CREDENTIALS_SIGNIN_ERROR || result.code === INVALID_CREDENTIALS_CODE) {
    return WRONG_CREDENTIALS_MESSAGE;
  }
  return FALLBACK_SIGNIN_MESSAGE;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  ...initialState,
  signIn: async (credentials, router) => {
    set({ isSubmitting: true, errorMessage: null });
    try {
      const result = (await nextAuthSignIn("credentials", {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      })) as SignInResult;

      if (result == null || result.error != null || result.ok !== true) {
        set({ isSubmitting: false, errorMessage: toSignInErrorMessage(result) });
        return false;
      }

      const session = result.user != null ? { user: result.user } : await getSession();
      set({ isSubmitting: false, session: toAuthUser(session?.user) ?? null });
      router.push(ROUTES.DASHBOARD);
      return true;
    } catch {
      set({ isSubmitting: false, errorMessage: FALLBACK_SIGNIN_MESSAGE });
      return false;
    }
  },
  signOut: async () => {
    await nextAuthSignOut({ redirect: false });
    set({ session: null, errorMessage: null });
  },
  clearError: () => set({ errorMessage: null }),
}));
