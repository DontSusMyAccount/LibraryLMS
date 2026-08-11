import { describe, expect, it } from "vitest";

import { ADMIN, forgedHeaders, proxyHeaders, request, STUDENT, VICTIM } from "./setup";

describe("IDOR — ผู้ใช้ A แตะข้อมูลการยืม/ผู้ใช้ของ B ไม่ได้", () => {
  it("student ปลอม proxy header เป็น id ของคนอื่น → GET /circulation/loans/active?userId=B → 403", async () => {
    const response = await request(`/circulation/loans/active?userId=${VICTIM.id}`, {
      headers: proxyHeaders(STUDENT),
    });

    expect(response.status).toBe(403);
    expect(response.body?.success).toBe(false);
    expect(typeof response.body?.error).toBe("string");
  });

  it("student เรียกดูข้อมูล user คนอื่น → GET /users/:id → 403", async () => {
    const response = await request(`/users/${VICTIM.id}`, {
      headers: proxyHeaders(STUDENT),
    });

    expect(response.status).toBe(403);
    expect(response.body?.success).toBe(false);
  });

  it("student เรียก /users/search → 403 (รายชื่อผู้ใช้สงวนไว้ admin/librarian)", async () => {
    const response = await request("/users/search?q=ทดสอบ", {
      headers: proxyHeaders(STUDENT),
    });

    expect(response.status).toBe(403);
    expect(response.body?.success).toBe(false);
  });

  it("โจมตีด้วย header ปลอม (internal secret ผิด) แม้ใส่ role=admin → 401 ไม่เชื่อถือ", async () => {
    const response = await request("/circulation/loans/active?userId=anyone", {
      headers: forgedHeaders({ ...ADMIN, id: VICTIM.id }),
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });

  it("โจมตีด้วย header ปลอม + เรียกร้อง /auth/me → 401 ไม่ได้ตัวตนคนอื่น", async () => {
    const response = await request("/auth/me", {
      headers: forgedHeaders(ADMIN),
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });

  it("ไม่ส่ง internal secret เลย → 401 (ป้องกันไม่ให้ข้าม auth ผ่าน proxy header)", async () => {
    const response = await request("/circulation/loans/active?userId=anyone", {
      headers: {
        "x-user-id": ADMIN.id,
        "x-user-role": "admin",
        "x-user-status": "active",
      },
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });
});
