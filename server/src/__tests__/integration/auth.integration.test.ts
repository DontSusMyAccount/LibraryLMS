import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authHeaders, bootstrapTestContext, type TestContext } from "./setup";

describe("Auth — real DB", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await bootstrapTestContext();
  });

  afterAll(async () => {
    await ctx.client.end();
  });

  it("login สำเร็จด้วย admin ที่ seed ไว้ → ได้ token + user", async () => {
    const response = await ctx.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@library.local", password: "Admin@1234" }),
    });

    expect(response.status).toBe(200);
    expect(response.body?.success).toBe(true);
    const data = response.body?.data as {
      token: string;
      user: { email: string; role: string; status: string };
    };
    expect(typeof data.token).toBe("string");
    expect(data.token.length).toBeGreaterThan(0);
    expect(data.user.email).toBe("admin@library.local");
    expect(data.user.role).toBe("admin");
    expect(data.user.status).toBe("active");
  });

  it("password ผิด → 401 envelope", async () => {
    const response = await ctx.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@library.local", password: "wrong-password" }),
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
    expect(typeof response.body?.error).toBe("string");
  });

  it("/auth/me ด้วย Bearer token → คืน user ปัจจุบัน", async () => {
    const response = await ctx.request("/auth/me", {
      headers: authHeaders(ctx.adminToken),
    });

    expect(response.status).toBe(200);
    const user = response.body?.data as { id: string; email: string; role: string };
    expect(user.id).toBe(ctx.adminUser.id);
    expect(user.email).toBe(ctx.adminUser.email);
    expect(user.role).toBe("admin");
  });

  it("/auth/me ไม่มี token → 401", async () => {
    const response = await ctx.request("/auth/me");
    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });

  it("/auth/me ด้วย InternalSecret proxy header → ปลอมตัว admin ได้ (ตัวจริงคือ Next.js proxy)", async () => {
    const response = await ctx.request("/auth/me", {
      headers: {
        "x-internal-secret": process.env.INTERNAL_SECRET as string,
        "x-user-id": ctx.adminUser.id,
        "x-user-role": "admin",
        "x-user-status": "active",
        "x-fullname": encodeURIComponent("ผู้ดูแลระบบ"),
      },
    });

    expect(response.status).toBe(200);
    const user = response.body?.data as { id: string };
    expect(user.id).toBe(ctx.adminUser.id);
  });
});
