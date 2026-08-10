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
  findUserParamsSchema,
  findUserSuccessResponseSchema,
  searchUsersQuerySchema,
  userPublicSchema,
} from "./user.schema";

function unionConstValues(schema: unknown): unknown[] {
  return (schema as { anyOf: Array<{ const: unknown }> }).anyOf.map((item) => item.const);
}

function buildMember() {
  return {
    id: "u-1",
    email: "a@x.ac.th",
    fullName: "นิสิตทดสอบ",
    role: "student" as UserRole,
    memberType: "undergraduate" as MemberType,
    studentOrStaffId: "610012345",
    status: "active" as UserStatus,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("user.schema", () => {
  it("literal unions ใน userPublicSchema ตรงกับ shared constants (กัน drift)", () => {
    expect(unionConstValues(userPublicSchema.properties.role)).toEqual([...USER_ROLES]);
    expect(unionConstValues(userPublicSchema.properties.status)).toEqual([...USER_STATUSES]);
    expect(unionConstValues(userPublicSchema.properties.memberType)).toEqual([...MEMBER_TYPES]);
  });

  it("userPublicSchema ไม่มี passwordHash และยอมรับ member ที่ถูกต้อง", () => {
    expect((userPublicSchema as { properties: object }).properties).not.toHaveProperty(
      "passwordHash",
    );
    expect(Value.Check(userPublicSchema, buildMember())).toBe(true);
  });

  it("searchUsersQuerySchema ยอมรับ query ที่ถูกต้องและบังคับ q", () => {
    expect(Value.Check(searchUsersQuerySchema, { q: "นิสิต" })).toBe(true);
    expect(Value.Check(searchUsersQuerySchema, { q: "นิสิต", page: 2, limit: 25 })).toBe(true);
    expect(Value.Check(searchUsersQuerySchema, { q: "" })).toBe(false);
  });

  it("findUserParamsSchema ต้องการ id ที่ไม่ว่าง", () => {
    expect(Value.Check(findUserParamsSchema, { id: "610012345" })).toBe(true);
    expect(Value.Check(findUserParamsSchema, { id: "" })).toBe(false);
  });

  it("find-user response envelope ตรวจ { success: true, data } และ schema ไม่มี passwordHash", () => {
    expect(Value.Check(findUserSuccessResponseSchema, { success: true, data: buildMember() })).toBe(
      true,
    );
    expect(
      (
        findUserSuccessResponseSchema.properties.data as {
          properties: Record<string, unknown>;
        }
      ).properties,
    ).not.toHaveProperty("passwordHash");
  });
});
