import { describe, it, expect } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { Type } from "@sinclair/typebox";
import {
  errorResponseSchema,
  paginatedResponseSchema,
  successResponseSchema,
} from "./response.schema";

describe("response.schema", () => {
  it("successResponseSchema ยอมรับ { success: true, data, message }", () => {
    const schema = successResponseSchema(Type.String());
    expect(Value.Check(schema, { success: true, data: "ok", message: "สำเร็จ" })).toBe(true);
  });

  it("successResponseSchema ปฏิเสธเมื่อ success: false", () => {
    const schema = successResponseSchema(Type.String());
    expect(Value.Check(schema, { success: false, data: "ok" })).toBe(false);
  });

  it("errorResponseSchema ตรวจ { success: false, error }", () => {
    expect(Value.Check(errorResponseSchema, { success: false, error: "ไม่พบข้อมูล" })).toBe(true);
    expect(Value.Check(errorResponseSchema, { success: true, data: {} })).toBe(false);
  });

  it("paginatedResponseSchema ตรวจ pagination fields ครบ", () => {
    const schema = paginatedResponseSchema(Type.Object({ id: Type.Number() }));
    const sample = {
      success: true,
      data: [{ id: 1 }, { id: 2 }],
      total: 2,
      page: 1,
      limit: 12,
      totalPages: 1,
    };
    expect(Value.Check(schema, sample)).toBe(true);
    expect(Value.Check(schema, { ...sample, totalPages: undefined })).toBe(false);
  });
});
