import { describe, expect, it } from "vitest";

import { ADMIN, forgedHeaders, proxyHeaders, request, STUDENT, VICTIM } from "./setup";

describe("Me portal — IDOR: /me/* ใช้ user จาก session เท่านั้น (ไม่มีช่องให้ client ระบุ userId)", () => {
  it("student ส่ง ?userId=<victim> ใน query → ถูกละเว้น ไม่เกิดสิทธิ์ข้าม (ผลเหมือนไม่ส่ง param)", async () => {
    const baseline = await request("/me/loans", { headers: proxyHeaders(STUDENT) });
    const withParam = await request(`/me/loans?userId=${VICTIM.id}`, {
      headers: proxyHeaders(STUDENT),
    });

    // guard อนุญาต student ทั้งคู่ (ผล 500 จาก fake db = ถึง handler แล้ว ไม่ใช่ 401/403/404)
    expect(baseline.status).not.toBe(401);
    expect(baseline.status).not.toBe(403);
    expect(baseline.status).not.toBe(404);
    expect(withParam.status).toBe(baseline.status);
    expect(withParam.status).not.toBe(404);
  });

  it("โจมตีด้วย header ปลอม (internal secret ผิด) แม้ใส่ role=admin → 401 ไม่เชื่อถือ", async () => {
    const response = await request("/me/loans", {
      headers: forgedHeaders({ ...ADMIN, id: VICTIM.id }),
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });

  it("ไม่ส่ง internal secret เลย → 401 (ข้าม auth ผ่าน proxy header ไม่ได้)", async () => {
    const response = await request("/me/loans", {
      headers: {
        "x-user-id": STUDENT.id,
        "x-user-role": "student",
        "x-user-status": "active",
      },
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });

  it("โจมตีด้วย header ปลอม + เรียกร้อง /me/ (profile) → 401 ไม่ได้ตัวตนคนอื่น", async () => {
    const response = await request("/me/", {
      headers: forgedHeaders({ ...STUDENT, id: VICTIM.id }),
    });

    expect(response.status).toBe(401);
    expect(response.body?.success).toBe(false);
  });
});
