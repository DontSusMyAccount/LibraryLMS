import { Elysia } from "elysia";
import { describe, expect, it } from "vitest";

import { DomainError } from "../../domains/errors";
import type { UserRecord } from "../../shared";
import { authPlugin } from "../auth.plugin";
import { signAuthToken } from "./jwt";

const INTERNAL_SECRET = "internal-secret-".padEnd(16, "x");
const JWT_SECRET = "jwt-secret-".padEnd(32, "x");

const user: UserRecord = {
  id: "u-1",
  email: "a@x.ac.th",
  passwordHash: "hashed",
  fullName: "บรรณารักษ์ทดสอบ",
  role: "librarian",
  memberType: "general",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function proxyHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "x-internal-secret": INTERNAL_SECRET,
    "x-user-id": user.id,
    "x-user-role": user.role,
    "x-user-status": user.status,
    "x-fullname": encodeURIComponent(user.fullName),
    ...overrides,
  };
}

function buildApp() {
  return new Elysia()
    .onError(({ error, set }) => {
      if (error instanceof DomainError) {
        set.status = error.statusCode;
        return { success: false, error: error.message };
      }
      set.status = 500;
      return { success: false, error: "เกิดข้อผิดพลาดภายในระบบ" };
    })
    .use(authPlugin({ internalSecret: INTERNAL_SECRET, jwtSecret: JWT_SECRET }))
    .guard({ role: true }, (inner) =>
      inner.get("/any", ({ user: resolvedUser }) => ({ success: true, user: resolvedUser })),
    )
    .guard({ role: "admin" }, (inner) =>
      inner.get("/admin", ({ user: resolvedUser }) => ({ success: true, user: resolvedUser })),
    )
    .guard({ role: ["admin", "librarian"] }, (inner) =>
      inner.get("/staff", ({ user: resolvedUser }) => ({ success: true, user: resolvedUser })),
    );
}

async function handleRequest(
  app: ReturnType<typeof buildApp>,
  path: string,
  headers: Record<string, string> = {},
) {
  const response = await app.handle(new Request(`http://localhost${path}`, { headers }));
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe("authPlugin role macro", () => {
  it("proxy headers ที่มี internal secret ถูกต้อง => resolve user และผ่าน role: true", async () => {
    const app = buildApp();

    const { status, body } = await handleRequest(app, "/any", proxyHeaders());

    expect(status).toBe(200);
    expect(body.user).toMatchObject({ id: "u-1", role: "librarian", status: "active" });
  });

  it("proxy headers ที่ internal secret ผิด => 401", async () => {
    const app = buildApp();

    const { status } = await handleRequest(
      app,
      "/any",
      proxyHeaders({ "x-internal-secret": "wrong" }),
    );

    expect(status).toBe(401);
  });

  it("ไม่มี internal secret และไม่มี bearer => 401", async () => {
    const app = buildApp();

    const { status } = await handleRequest(app, "/any");

    expect(status).toBe(401);
  });

  it("Bearer token ที่ sign ด้วย jwtSecret => resolve user", async () => {
    const app = buildApp();
    const token = await signAuthToken(user, JWT_SECRET);

    const { status, body } = await handleRequest(app, "/any", {
      authorization: `Bearer ${token}`,
    });

    expect(status).toBe(200);
    expect(body.user).toMatchObject({ id: "u-1", email: "a@x.ac.th", role: "librarian" });
  });

  it("Bearer token ปลอม => 401", async () => {
    const app = buildApp();

    const { status } = await handleRequest(app, "/any", {
      authorization: "Bearer not-a-real-token",
    });

    expect(status).toBe(401);
  });

  it("Bearer token ที่ sign ด้วย secret อื่น => 401", async () => {
    const app = buildApp();
    const foreignToken = await signAuthToken(user, "other-secret-".padEnd(32, "x"));

    const { status } = await handleRequest(app, "/any", {
      authorization: `Bearer ${foreignToken}`,
    });

    expect(status).toBe(401);
  });

  it("guard role: admin แต่ user เป็น librarian => 403", async () => {
    const app = buildApp();

    const { status, body } = await handleRequest(app, "/admin", proxyHeaders());

    expect(status).toBe(403);
    expect(body.error).toBe("ไม่มีสิทธิ์เข้าถึงข้อมูลนี้");
  });

  it("guard role: admin และ user เป็น admin => ผ่าน", async () => {
    const app = buildApp();

    const { status, body } = await handleRequest(
      app,
      "/admin",
      proxyHeaders({ "x-user-role": "admin" }),
    );

    expect(status).toBe(200);
    expect(body.user).toMatchObject({ role: "admin" });
  });

  it("guard role: [admin, librarian] และ user เป็น librarian => ผ่าน", async () => {
    const app = buildApp();

    const { status } = await handleRequest(app, "/staff", proxyHeaders());

    expect(status).toBe(200);
  });

  it("proxy headers ระบุ status suspended => 401 แม้ internal secret ถูก", async () => {
    const app = buildApp();

    const { status, body } = await handleRequest(
      app,
      "/any",
      proxyHeaders({ "x-user-status": "suspended" }),
    );

    expect(status).toBe(401);
    expect(body.error).toBe("บัญชีผู้ใช้ถูกระงับใช้งาน");
  });

  it("role ใน header ไม่ถูกต้อง => 401 (ไม่เชื่อถือ header ที่ไม่รู้จัก)", async () => {
    const app = buildApp();

    const { status } = await handleRequest(
      app,
      "/any",
      proxyHeaders({ "x-user-role": "superadmin" }),
    );

    expect(status).toBe(401);
  });
});
