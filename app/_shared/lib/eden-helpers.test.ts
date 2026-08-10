import type { Treaty } from "@elysiajs/eden";
import { describe, expect, it } from "vitest";

import { EdenRequestError, edenRequest, type EdenResolvedResponse } from "./eden-helpers";

interface TestItem {
  id: string;
  title: string;
}

type TreatyResponseWithError = Treaty.TreatyResponse<{
  200: { success: true; data: TestItem };
  404: { success: false; error: string };
}>;

const _assignProbeWithError: EdenResolvedResponse<{ success: true; data: TestItem }> =
  null as unknown as TreatyResponseWithError;

type TreatyResponseSuccessOnly = Treaty.TreatyResponse<{
  200: { success: true; data: TestItem };
}>;

const _assignProbeSuccessOnly: EdenResolvedResponse<{ success: true; data: TestItem }> =
  null as unknown as TreatyResponseSuccessOnly;

describe("edenRequest", () => {
  it("คืน data เมื่อ response เป็น { success: true, data }", async () => {
    const response: EdenResolvedResponse<{ success: true; data: TestItem }> = {
      data: { success: true, data: { id: "b1", title: "ทดสอบ" } },
      error: null,
      status: 200,
      headers: {},
    };

    const result = await edenRequest(response);

    expect(result).toEqual({ id: "b1", title: "ทดสอบ" });
  });

  it("ขว้าง EdenRequestError typed เมื่อ response เป็น { success: false, error }", async () => {
    const response: EdenResolvedResponse<{ success: false; error: string }> = {
      data: { success: false, error: "ไม่พบหนังสือ" },
      error: null,
      status: 404,
      headers: {},
    };

    const promise = edenRequest(response);

    await expect(promise).rejects.toBeInstanceOf(EdenRequestError);
    await expect(promise).rejects.toMatchObject({ status: 404, message: "ไม่พบหนังสือ" });
  });

  it("ขว้าง EdenRequestError โดยอ่าน error.value เมื่อ treaty ส่ง error branch (non-2xx)", async () => {
    const response: EdenResolvedResponse<never> = {
      data: null,
      error: { status: 401, value: { success: false, error: "ต้องเข้าสู่ระบบ" } },
      status: 401,
      headers: {},
    };

    const promise = edenRequest(response);

    await expect(promise).rejects.toBeInstanceOf(EdenRequestError);
    await expect(promise).rejects.toMatchObject({ status: 401, message: "ต้องเข้าสู่ระบบ" });
  });

  it("คืน object ฉบับเต็มพร้อม total เมื่อ response เป็น paginated envelope", async () => {
    const response: EdenResolvedResponse<{
      success: true;
      data: TestItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }> = {
      data: {
        success: true,
        data: [{ id: "b1", title: "ทดสอบ" }],
        total: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
      },
      error: null,
      status: 200,
      headers: {},
    };

    const result = await edenRequest(response);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });
});
