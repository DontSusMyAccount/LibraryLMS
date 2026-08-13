import { createHash, timingSafeEqual } from "node:crypto";

import { Elysia } from "elysia";

import { DomainForbiddenError, DomainUnauthorizedError } from "../domains/errors";
import {
  type SessionUser,
  type UserRole,
  type UserStatus,
  USER_ROLES,
  USER_STATUSES,
} from "../shared";
import { verifyAuthToken } from "./auth/jwt";

export interface AuthPluginOptions {
  internalSecret: string;
  jwtSecret: string;
}

export type RoleGuardValue = true | UserRole | UserRole[];

export interface AuthenticatedState {
  user: SessionUser;
}

type HeaderMap = Record<string, string | undefined>;

const PROXY_HEADER_NAMES = {
  internalSecret: "x-internal-secret",
  userId: "x-user-id",
  userRole: "x-user-role",
  userStatus: "x-user-status",
  fullName: "x-fullname",
} as const;

const UNAUTHORIZED_MESSAGE = "ยังไม่ได้เข้าสู่ระบบ หรือ session หมดอายุ";
const INACTIVE_ACCOUNT_MESSAGE = "บัญชีผู้ใช้ถูกระงับใช้งาน";
const FORBIDDEN_MESSAGE = "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้";

function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

function isUserStatus(value: string): value is UserStatus {
  return (USER_STATUSES as readonly string[]).includes(value);
}

function readHeader(headers: HeaderMap, name: string): string | undefined {
  const normalizedName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === normalizedName) {
      return value;
    }
  }
  return undefined;
}

function decodeHeaderValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function timingSafeSecretEqual(provided: string, expected: string): boolean {
  const providedDigest = createHash("sha256").update(provided).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

function buildSessionUserFromProxyHeaders(headers: HeaderMap): SessionUser | null {
  const userId = readHeader(headers, PROXY_HEADER_NAMES.userId);
  const roleRaw = readHeader(headers, PROXY_HEADER_NAMES.userRole);
  const statusRaw = readHeader(headers, PROXY_HEADER_NAMES.userStatus);
  const fullName = readHeader(headers, PROXY_HEADER_NAMES.fullName);

  if (!userId || !roleRaw || !statusRaw || !fullName) {
    return null;
  }
  if (!isUserRole(roleRaw) || !isUserStatus(statusRaw)) {
    return null;
  }

  return {
    id: userId,
    email: readHeader(headers, "x-user-email") ?? "",
    fullName: decodeHeaderValue(fullName),
    role: roleRaw,
    status: statusRaw,
  };
}

async function resolveSessionUser(
  headers: HeaderMap,
  options: AuthPluginOptions,
): Promise<SessionUser | null> {
  const providedInternalSecret = readHeader(headers, PROXY_HEADER_NAMES.internalSecret);
  if (
    providedInternalSecret &&
    timingSafeSecretEqual(providedInternalSecret, options.internalSecret)
  ) {
    return buildSessionUserFromProxyHeaders(headers);
  }

  const authorization = readHeader(headers, "authorization");
  const bearerToken = authorization?.trim().toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : undefined;
  if (bearerToken) {
    return verifyAuthToken(bearerToken, options.jwtSecret);
  }

  return null;
}

export function authPlugin(options: AuthPluginOptions) {
  return new Elysia().macro({
    role(value: RoleGuardValue) {
      return {
        resolve: async ({ headers }: { headers: HeaderMap }) => {
          const user = await resolveSessionUser(headers, options);
          if (!user) {
            throw new DomainUnauthorizedError(UNAUTHORIZED_MESSAGE);
          }
          if (user.status !== "active") {
            throw new DomainUnauthorizedError(INACTIVE_ACCOUNT_MESSAGE);
          }
          if (value !== true) {
            const allowedRoles = Array.isArray(value) ? value : [value];
            if (!allowedRoles.includes(user.role)) {
              throw new DomainForbiddenError(FORBIDDEN_MESSAGE);
            }
          }
          return { user };
        },
      };
    },
  });
}
