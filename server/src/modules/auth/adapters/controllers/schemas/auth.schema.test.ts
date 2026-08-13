import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  MEMBER_TYPES,
  USER_ROLES,
  USER_STATUSES,
  type MemberType,
  type UserRole,
  type UserStatus,
} from "../../../../../shared";
import {
  loginDataSchema,
  loginRequestSchema,
  logoutSuccessResponseSchema,
  meSuccessResponseSchema,
  userPublicSchema,
} from "./auth.schema";

function unionConstValues(schema: unknown): unknown[] {
  return (schema as { anyOf: Array<{ const: unknown }> }).anyOf.map((item) => item.const);
}

describe("auth.schema", () => {
  it("literal unions ใน schema ตรงกับ shared constants (กัน drift)", () => {
    const userSchema = loginDataSchema.properties.user;
    expect(unionConstValues(userSchema.properties.role)).toEqual([...USER_ROLES]);
    expect(unionConstValues(userSchema.properties.status)).toEqual([...USER_STATUSES]);
    expect(unionConstValues(userSchema.properties.memberType)).toEqual([...MEMBER_TYPES]);
  });

  it("loginRequestSchema ยอมรับ body ที่ถูกต้องและปฏิเสธ body ไม่ครบ", () => {
    expect(Value.Check(loginRequestSchema, { email: "a@x.ac.th", password: "secret" })).toBe(true);
    expect(Value.Check(loginRequestSchema, { email: "a@x.ac.th" })).toBe(false);
  });

  it("userPublicSchema ไม่มี passwordHash และยอมรับ user ที่ถูกต้อง", () => {
    expect((userPublicSchema as { properties: object }).properties).not.toHaveProperty(
      "passwordHash",
    );

    const user = {
      id: "u-1",
      email: "a@x.ac.th",
      fullName: "บรรณารักษ์ทดสอบ",
      role: "librarian" as UserRole,
      memberType: "general" as MemberType,
      status: "active" as UserStatus,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(Value.Check(userPublicSchema, user)).toBe(true);
  });

  it("response schemas ตรวจ response envelope { success: true, data }", () => {
    const sessionUser = {
      id: "u-1",
      email: "a@x.ac.th",
      fullName: "บรรณารักษ์ทดสอบ",
      role: "librarian",
      status: "active",
    };
    const loginResponse = {
      success: true,
      data: {
        token: "jwt-token",
        user: {
          ...sessionUser,
          memberType: "general",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };
    expect(Value.Check(loginDataSchema, loginResponse.data)).toBe(true);
    expect(Value.Check(meSuccessResponseSchema, { success: true, data: sessionUser })).toBe(true);
    expect(Value.Check(logoutSuccessResponseSchema, { success: true, data: { ok: true } })).toBe(
      true,
    );
    expect(Value.Check(loginRequestSchema, Type.Object({}))).toBe(false);
  });
});
