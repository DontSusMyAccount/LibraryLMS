import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Elysia } from "elysia";

import { toHttpError } from "../../libs/http-error.factory";
import { createAppModule } from "../../modules/app.module";

const JWT_SECRET = "jwt-secret-".padEnd(32, "x");
const INTERNAL_SECRET = "internal-secret-".padEnd(16, "x");

// security tests ตรวจ auth layer เท่านั้น — ไม่แตะ DB จริง (ใช้ fake db เหมือน app-boot)
const deps = {
  db: {} as unknown as PostgresJsDatabase,
  jwtSecret: JWT_SECRET,
  internalSecret: INTERNAL_SECRET,
  storageDriver: "local" as const,
  uploadRoot: "uploads",
};

export interface SecurityResponse {
  status: number;
  body: Record<string, unknown> | null;
}

function buildApp() {
  return new Elysia()
    .onError(({ code, error, set }) => {
      const httpError = toHttpError(error, code);
      set.status = httpError.statusCode;
      return httpError.body;
    })
    .use(createAppModule(deps));
}

const app = buildApp();

export async function request(path: string, init?: RequestInit): Promise<SecurityResponse> {
  const response = await app.handle(new Request(`http://localhost${path}`, init));
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: response.status, body };
}

export interface ProxyUser {
  id: string;
  role: string;
  status: string;
  fullName?: string;
}

/** สร้าง proxy headers — ตัวที่ Next.js proxy ตั้งให้จริง (มี internal secret ที่ถูกต้อง) */
export function proxyHeaders(user: ProxyUser): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-internal-secret": INTERNAL_SECRET,
    "x-user-id": user.id,
    "x-user-role": user.role,
    "x-user-status": user.status,
    "x-fullname": encodeURIComponent(user.fullName ?? "ผู้ใช้งาน"),
  };
}

/** จำลองผู้โจมตีที่ปลอม header โดยไม่มี internal secret (หรือ secret ผิด) */
export function forgedHeaders(user: ProxyUser, secret = "attacker-secret"): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-internal-secret": secret,
    "x-user-id": user.id,
    "x-user-role": user.role,
    "x-user-status": user.status,
    "x-fullname": encodeURIComponent(user.fullName ?? "ผู้บุกรุก"),
  };
}

export const STUDENT = {
  id: "u-student-0001",
  role: "student",
  status: "active",
} as const;

export const FACULTY = {
  id: "u-faculty-0002",
  role: "faculty",
  status: "active",
} as const;

export const STAFF = {
  id: "u-staff-0003",
  role: "staff",
  status: "active",
} as const;

export const ADMIN = {
  id: "u-admin-0004",
  role: "admin",
  status: "active",
} as const;

export const VICTIM = {
  id: "u-victim-9999",
  role: "student",
  status: "active",
} as const;
