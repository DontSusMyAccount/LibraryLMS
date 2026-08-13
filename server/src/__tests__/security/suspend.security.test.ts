import { describe, expect, it } from "vitest";

import { proxyHeaders, request, STUDENT } from "./setup";

describe("Suspend — บัญชีที่ถูกระงับใช้ไม่ได้แม้มี proxy header ถูกต้อง", () => {
  it("status=suspended แม้ header ถูกต้อง → 401 (สิทธิ์ถูกระงับ)", async () => {
    const response = await request("/catalog/books", {
      headers: proxyHeaders({ ...STUDENT, status: "suspended" }),
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });

  it("status=inactive → 401", async () => {
    const response = await request("/auth/me", {
      headers: proxyHeaders({ ...STUDENT, status: "inactive" }),
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });

  it("status=graduated → 401", async () => {
    const response = await request("/auth/me", {
      headers: proxyHeaders({ ...STUDENT, status: "graduated" }),
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });

  it("status ที่ไม่รู้จัก (ไม่ใช่ enum) → 401 (ไม่เชื่อถือ header ที่ไม่ถูกต้อง)", async () => {
    const response = await request("/auth/me", {
      headers: proxyHeaders({ ...STUDENT, status: "hacker" }),
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });

  it("role ที่ไม่รู้จักใน header → 401 (ไม่เชื่อถือ role ปลอม)", async () => {
    const response = await request("/catalog/books", {
      headers: proxyHeaders({ ...STUDENT, role: "superadmin" }),
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });

  it("suspended student เรียก /me/loans (self-service) → 401", async () => {
    const response = await request("/me/loans", {
      headers: proxyHeaders({ ...STUDENT, status: "suspended" }),
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });

  it("suspended student เรียก /me/checkout → 401", async () => {
    const response = await request("/me/checkout", {
      method: "POST",
      headers: proxyHeaders({ ...STUDENT, status: "suspended" }),
      body: JSON.stringify({ copyCode: "BK-001" }),
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });
});
