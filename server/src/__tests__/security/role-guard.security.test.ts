import { describe, expect, it } from "vitest";

import { ADMIN, FACULTY, proxyHeaders, request, STAFF, STUDENT } from "./setup";

/**
 * guard อนุญาต student/faculty/staff บน /me/* — ถ้าไม่ถูก 401/403/404 แปลว่าผ่าน auth layer
 * (fake db → 500 ที่ handler ถือว่าผ่าน guard แล้ว เพราะ security suite ไม่แตะ DB จริง)
 * กัน 404 ด้วย: ถ้า route หาย/เปลี่ยนชื่อ test ต้อง fail ไม่ใช่ผ่านเงื่อน
 */
function expectPassesAuthLayer(status: number): void {
  expect(status).not.toBe(401);
  expect(status).not.toBe(403);
  expect(status).not.toBe(404);
}

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

  it("student เข้า /me/loans (self-service portal) ได้ → ผ่าน auth layer", async () => {
    const response = await request("/me/loans", {
      headers: proxyHeaders(STUDENT),
    });

    expectPassesAuthLayer(response.status);
  });

  it("faculty เข้า /me/reservations ได้ → ผ่าน auth layer", async () => {
    const response = await request("/me/reservations", {
      headers: proxyHeaders(FACULTY),
    });

    expectPassesAuthLayer(response.status);
  });

  it("admin เข้า /me/loans (portal) → 403 (backoffice ใช้ portal ไม่ได้)", async () => {
    const response = await request("/me/loans", {
      headers: proxyHeaders(ADMIN),
    });

    expect(response.status).toBe(403);
    expect(response.body?.success).toBe(false);
  });

  it("staff เข้า /me/fines (self-service) ได้ → ผ่าน auth layer", async () => {
    const response = await request("/me/fines", {
      headers: proxyHeaders(STAFF),
    });

    expectPassesAuthLayer(response.status);
  });

  it("librarian เข้า /me/fines → 403 (backoffice ใช้ portal ไม่ได้)", async () => {
    const librarian = { id: "u-librarian-0005", role: "librarian", status: "active" } as const;
    const response = await request("/me/fines", {
      headers: proxyHeaders(librarian),
    });

    expect(response.status).toBe(403);
    expect(response.body?.success).toBe(false);
  });
});
