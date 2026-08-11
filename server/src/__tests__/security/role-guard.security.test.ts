import { describe, expect, it } from "vitest";

import { ADMIN, FACULTY, proxyHeaders, request, STAFF, STUDENT } from "./setup";

describe("Role guard — สิทธิ์ตามบทบาท", () => {
  it("student เรียก POST /catalog/books (สร้างหนังสือ) → 403", async () => {
    const response = await request("/catalog/books", {
      method: "POST",
      headers: proxyHeaders(STUDENT),
      body: JSON.stringify({ title: "ทดสอบ", author: "ทดสอบ" }),
    });

    expect(response.status).toBe(403);
    expect(response.body?.success).toBe(false);
  });

  it("student เรียก POST /circulation/checkout → 403", async () => {
    const response = await request("/circulation/checkout", {
      method: "POST",
      headers: proxyHeaders(STUDENT),
      body: JSON.stringify({ userId: "x", copyCode: "x" }),
    });

    expect(response.status).toBe(403);
    expect(response.body?.success).toBe(false);
  });

  it("faculty เรียก POST /reservations/ (สร้างคิวจอง) → 403", async () => {
    const response = await request("/reservations/", {
      method: "POST",
      headers: proxyHeaders(FACULTY),
      body: JSON.stringify({ bookId: "x", userId: "x" }),
    });

    expect(response.status).toBe(403);
    expect(response.body?.success).toBe(false);
  });

  it("staff เรียก PUT /reservations/:id/ready → 403", async () => {
    const response = await request("/reservations/some-id/ready", {
      method: "PUT",
      headers: proxyHeaders(STAFF),
    });

    expect(response.status).toBe(403);
    expect(response.body?.success).toBe(false);
  });

  it("admin เข้า /auth/me ได้ (ทุก role เข้าได้ ถ้า active) → 200", async () => {
    const response = await request("/auth/me", {
      headers: proxyHeaders(ADMIN),
    });

    expect(response.status).toBe(200);
    const user = response.body?.data as { id: string; role: string };
    expect(user.id).toBe(ADMIN.id);
    expect(user.role).toBe("admin");
  });

  it("student เข้า /auth/me ได้ (ทุก role เข้าได้) → 200", async () => {
    const response = await request("/auth/me", {
      headers: proxyHeaders(STUDENT),
    });

    expect(response.status).toBe(200);
    const user = response.body?.data as { id: string; role: string };
    expect(user.id).toBe(STUDENT.id);
    expect(user.role).toBe("student");
  });
});
