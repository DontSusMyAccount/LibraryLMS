import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { ROUTES } from "@/app/_shared/constants/routes";
import { USER_ROLES, USER_STATUSES } from "@libsys/shared";
import type { UserRole, UserStatus } from "@libsys/shared";

const BACKEND_LOGIN_PATH = "/auth/login";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const LOGIN_FETCH_TIMEOUT_MS = 10_000;

const WRONG_CREDENTIALS_CODE = "invalid_credentials";
const INACTIVE_ACCOUNT_CODE = "inactive_account";

class InvalidCredentialsError extends CredentialsSignin {
  code = WRONG_CREDENTIALS_CODE;
}

class InactiveAccountError extends CredentialsSignin {
  code = INACTIVE_ACCOUNT_CODE;
}

interface BackendUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
}

interface BackendLoginData {
  token: string;
  user: BackendUser;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly unknown[]).includes(value);
}

function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === "string" && (USER_STATUSES as readonly unknown[]).includes(value);
}

function parseBackendLoginData(payload: unknown): BackendLoginData | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const root = payload as Record<string, unknown>;
  if (root.success !== true) {
    return null;
  }
  const data = root.data;
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const dataRecord = data as Record<string, unknown>;
  const user = dataRecord.user;
  if (typeof user !== "object" || user === null) {
    return null;
  }
  const userRecord = user as Record<string, unknown>;
  if (
    typeof dataRecord.token !== "string" ||
    typeof userRecord.id !== "string" ||
    typeof userRecord.email !== "string" ||
    typeof userRecord.fullName !== "string" ||
    !isUserRole(userRecord.role) ||
    !isUserStatus(userRecord.status)
  ) {
    return null;
  }
  return {
    token: dataRecord.token,
    user: {
      id: userRecord.id,
      email: userRecord.email,
      fullName: userRecord.fullName,
      role: userRecord.role,
      status: userRecord.status,
    },
  };
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    status: UserStatus;
    fullName: string;
    email: string;
  }
}

declare module "@auth/core/types" {
  interface User {
    id: string;
    role: UserRole;
    status: UserStatus;
    fullName: string;
  }
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      fullName: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: ROUTES.AUTH_SIGNIN },
  providers: [
    Credentials({
      credentials: {
        email: { label: "อีเมล", type: "email" },
        password: { label: "รหัสผ่าน", type: "password" },
      },
      async authorize(rawCredentials) {
        const email = typeof rawCredentials?.email === "string" ? rawCredentials.email.trim() : "";
        const password =
          typeof rawCredentials?.password === "string" ? rawCredentials.password : "";
        if (!email || !password) {
          throw new InvalidCredentialsError();
        }

        const backendUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!backendUrl) {
          throw new InvalidCredentialsError();
        }

        let response: Response;
        try {
          response = await fetch(`${backendUrl.replace(/\/+$/, "")}${BACKEND_LOGIN_PATH}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
            signal: AbortSignal.timeout(LOGIN_FETCH_TIMEOUT_MS),
          });
        } catch {
          throw new InvalidCredentialsError();
        }

        if (!response.ok) {
          throw new InvalidCredentialsError();
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new InvalidCredentialsError();
        }

        const loginData = parseBackendLoginData(payload);
        if (!loginData) {
          throw new InvalidCredentialsError();
        }
        if (loginData.user.status !== "active") {
          throw new InactiveAccountError();
        }

        return {
          id: loginData.user.id,
          email: loginData.user.email,
          name: loginData.user.fullName,
          role: loginData.user.role,
          status: loginData.user.status,
          fullName: loginData.user.fullName,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.fullName = user.fullName;
        token.email = user.email ?? "";
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.status = token.status;
      session.user.fullName = token.fullName;
      session.user.email = token.email;
      return session;
    },
  },
});
