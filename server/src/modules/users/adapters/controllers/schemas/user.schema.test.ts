import { FormatRegistry } from "@sinclair/typebox";
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
  createUserBodySchema,
  createUserSuccessResponseSchema,
  findUserParamsSchema,
  findUserSuccessResponseSchema,
  searchUsersQuerySchema,
  updateUserBodySchema,
  updateUserSuccessResponseSchema,
  userPublicSchema,
} from "./user.schema";

FormatRegistry.Set("email", (value) =>
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
    value,
  ),
);

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

function buildCreateUserBody() {
  return {
    email: "new.student@x.ac.th",
    fullName: "นิสิตใหม่",
    role: "student",
    password: "secret123",
  };
}

function without(body: Record<string, unknown>, key: string): Record<string, unknown> {
  const copy = { ...body };
  delete copy[key];
  return copy;
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

  it("searchUsersQuerySchema ยอมรับ query ที่ถูกต้อง และ q เป็น optional (โหลดตารางเต็มได้)", () => {
    expect(Value.Check(searchUsersQuerySchema, {})).toBe(true);
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

  it("createUserBodySchema ยอมรับ body ครบถ้วน + optional fields", () => {
    expect(Value.Check(createUserBodySchema, buildCreateUserBody())).toBe(true);
    expect(
      Value.Check(createUserBodySchema, {
        ...buildCreateUserBody(),
        memberType: "graduate",
        studentOrStaffId: "610012345",
        phone: "0812345678",
        branchId: "b-1",
      }),
    ).toBe(true);
  });

  it("createUserBodySchema ปฏิเสธเมื่อขาด email/fullName/role/password", () => {
    expect(Value.Check(createUserBodySchema, without(buildCreateUserBody(), "email"))).toBe(false);
    expect(Value.Check(createUserBodySchema, without(buildCreateUserBody(), "fullName"))).toBe(
      false,
    );
    expect(Value.Check(createUserBodySchema, without(buildCreateUserBody(), "role"))).toBe(false);
    expect(Value.Check(createUserBodySchema, without(buildCreateUserBody(), "password"))).toBe(
      false,
    );
  });

  it("createUserBodySchema ปฏิเสธ email ผิดรูปแบบ", () => {
    expect(
      Value.Check(createUserBodySchema, { ...buildCreateUserBody(), email: "ไม่ใช่อีเมล" }),
    ).toBe(false);
    expect(Value.Check(createUserBodySchema, { ...buildCreateUserBody(), email: "a@b" })).toBe(
      false,
    );
  });

  it("createUserBodySchema ปฏิเสธ password สั้นกว่า 8 ตัวอักษร", () => {
    expect(
      Value.Check(createUserBodySchema, { ...buildCreateUserBody(), password: "1234567" }),
    ).toBe(false);
  });

  it("createUserBodySchema ปฏิเสธ role/memberType ที่ไม่อยู่ในรายการ", () => {
    expect(
      Value.Check(createUserBodySchema, { ...buildCreateUserBody(), role: "superadmin" }),
    ).toBe(false);
    expect(
      Value.Check(createUserBodySchema, { ...buildCreateUserBody(), memberType: "premium" }),
    ).toBe(false);
  });

  it("updateUserBodySchema ปฏิเสธ body ว่าง (minProperties 1)", () => {
    expect(Value.Check(updateUserBodySchema, {})).toBe(false);
  });

  it("updateUserBodySchema ปฏิเสธ field ไม่รู้จัก เช่น email/password", () => {
    expect(Value.Check(updateUserBodySchema, { email: "a@x.ac.th" })).toBe(false);
    expect(Value.Check(updateUserBodySchema, { password: "secret123" })).toBe(false);
  });

  it("updateUserBodySchema ยอมรับ partial ที่ถูกต้อง", () => {
    expect(Value.Check(updateUserBodySchema, { fullName: "ชื่อใหม่" })).toBe(true);
    expect(Value.Check(updateUserBodySchema, { role: "librarian", status: "suspended" })).toBe(
      true,
    );
  });

  it("updateUserBodySchema ปฏิเสธค่า role/status/memberType ที่ไม่ถูกต้อง", () => {
    expect(Value.Check(updateUserBodySchema, { role: "superadmin" })).toBe(false);
    expect(Value.Check(updateUserBodySchema, { status: "unknown" })).toBe(false);
    expect(Value.Check(updateUserBodySchema, { memberType: "premium" })).toBe(false);
  });

  it("searchUsersQuerySchema รองรับ role/status ตาม enum", () => {
    expect(
      Value.Check(searchUsersQuerySchema, { q: "นิสิต", role: "student", status: "active" }),
    ).toBe(true);
    expect(Value.Check(searchUsersQuerySchema, { q: "นิสิต", role: "superadmin" })).toBe(false);
    expect(Value.Check(searchUsersQuerySchema, { q: "นิสิต", status: "unknown" })).toBe(false);
  });

  it("create/update success response envelope ตรวจ { success: true, data } และไม่มี passwordHash", () => {
    expect(
      Value.Check(createUserSuccessResponseSchema, { success: true, data: buildMember() }),
    ).toBe(true);
    expect(
      Value.Check(updateUserSuccessResponseSchema, { success: true, data: buildMember() }),
    ).toBe(true);
  });
});
