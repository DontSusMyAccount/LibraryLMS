import { describe, it, expect } from "vitest";
import { toHttpError } from "./http-error.factory";
import {
  DomainConflictError,
  DomainError,
  DomainForbiddenError,
  DomainNotFoundError,
  DomainUnauthorizedError,
} from "../domains/errors";

describe("toHttpError", () => {
  it.each<[DomainError, number]>([
    [new DomainUnauthorizedError(), 401],
    [new DomainForbiddenError(), 403],
    [new DomainNotFoundError(), 404],
    [new DomainConflictError(), 409],
  ])("maps %s → %i", (error, statusCode) => {
    const result = toHttpError(error);
    expect(result.statusCode).toBe(statusCode);
    expect(result.body).toEqual({ success: false, error: error.message });
  });

  it("DomainError ฐาน (statusCode 400) → 400", () => {
    const result = toHttpError(new DomainError("คำขอไม่ถูกต้อง", 400));
    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({ success: false, error: "คำขอไม่ถูกต้อง" });
  });

  it("error ที่ไม่ใช่ DomainError → 500 + ข้อความไทย", () => {
    const result = toHttpError(new Error("boom"));
    expect(result.statusCode).toBe(500);
    expect(result.body).toEqual({ success: false, error: "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่" });
  });

  it("code VALIDATION → 422 + ข้อความไทย", () => {
    const result = toHttpError(new Error("body ไม่ถูกต้อง"), "VALIDATION");
    expect(result.statusCode).toBe(422);
    expect(result.body).toEqual({ success: false, error: "ข้อมูลไม่ถูกต้อง โปรดตรวจสอบ" });
  });

  it("code NOT_FOUND → 404 + ข้อความไทย", () => {
    const result = toHttpError(new Error("ไม่มี route นี้"), "NOT_FOUND");
    expect(result.statusCode).toBe(404);
    expect(result.body).toEqual({ success: false, error: "ไม่พบทรัพยากรที่ขอ" });
  });

  it("DomainError ยัง map ตาม statusCode เมื่อ code ไม่ใช่ VALIDATION/NOT_FOUND", () => {
    const result = toHttpError(new DomainForbiddenError(), "UNKNOWN");
    expect(result.statusCode).toBe(403);
  });

  it("ค่า unknown (ไม่ใช่ Error) → 500", () => {
    const result = toHttpError(undefined);
    expect(result.statusCode).toBe(500);
  });
});
