import { describe, it, expect } from "vitest";
import {
  DomainConflictError,
  DomainError,
  DomainForbiddenError,
  DomainNotFoundError,
  DomainUnauthorizedError,
} from "./index";

describe("Domain errors", () => {
  it("แต่ละ subclass มี statusCode ที่ถูกต้อง", () => {
    expect(new DomainUnauthorizedError().statusCode).toBe(401);
    expect(new DomainForbiddenError().statusCode).toBe(403);
    expect(new DomainNotFoundError().statusCode).toBe(404);
    expect(new DomainConflictError().statusCode).toBe(409);
  });

  it("ทุก subclass เป็น instanceof DomainError", () => {
    expect(new DomainUnauthorizedError()).toBeInstanceOf(DomainError);
    expect(new DomainForbiddenError()).toBeInstanceOf(DomainError);
    expect(new DomainNotFoundError()).toBeInstanceOf(DomainError);
    expect(new DomainConflictError()).toBeInstanceOf(DomainError);
  });

  it("ข้อความ error เป็นภาษาไทย", () => {
    expect(new DomainNotFoundError().message).toBe("ไม่พบข้อมูลที่ต้องการ");
    expect(new DomainConflictError().message).toBe("ข้อมูลขัดแย้งกับสถานะปัจจุบัน");
  });
});
