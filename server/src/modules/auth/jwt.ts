import { jwtVerify, SignJWT, type JWTPayload } from "jose";

import { DomainUnauthorizedError } from "../../domains/errors";
import {
  type SessionUser,
  type UserRecord,
  type UserRole,
  type UserStatus,
  USER_ROLES,
  USER_STATUSES,
} from "../../shared";

const AUTH_TOKEN_ALGORITHM = "HS256" as const;
const AUTH_TOKEN_TYPE = "JWT" as const;
const AUTH_TOKEN_EXPIRES_IN = "7d" as const;

function toSecretBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly unknown[]).includes(value);
}

function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === "string" && (USER_STATUSES as readonly unknown[]).includes(value);
}

export async function signAuthToken(user: UserRecord, secret: string): Promise<string> {
  const payload: JWTPayload = {
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
  };
  if (user.branchId) {
    payload.branchId = user.branchId;
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: AUTH_TOKEN_ALGORITHM, typ: AUTH_TOKEN_TYPE })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(AUTH_TOKEN_EXPIRES_IN)
    .sign(toSecretBytes(secret));
}

export async function verifyAuthToken(token: string, secret: string): Promise<SessionUser> {
  let payload;
  try {
    const verified = await jwtVerify(token, toSecretBytes(secret));
    payload = verified.payload;
  } catch {
    throw new DomainUnauthorizedError();
  }

  if (
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.fullName !== "string" ||
    !isUserRole(payload.role) ||
    !isUserStatus(payload.status)
  ) {
    throw new DomainUnauthorizedError();
  }

  return {
    id: payload.sub,
    email: payload.email,
    fullName: payload.fullName,
    role: payload.role,
    status: payload.status,
    branchId: typeof payload.branchId === "string" ? payload.branchId : undefined,
  };
}
