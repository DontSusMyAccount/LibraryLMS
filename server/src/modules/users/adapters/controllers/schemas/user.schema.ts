import { Type } from "@sinclair/typebox";

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../../../../../shared";
import {
  errorResponseSchema,
  paginatedResponseSchema,
  successResponseSchema,
} from "../../../../shared/schemas/response.schema";

const userRoleSchema = Type.Union([
  Type.Literal("admin"),
  Type.Literal("librarian"),
  Type.Literal("faculty"),
  Type.Literal("staff"),
  Type.Literal("student"),
]);

const userStatusSchema = Type.Union([
  Type.Literal("active"),
  Type.Literal("suspended"),
  Type.Literal("graduated"),
  Type.Literal("inactive"),
]);

const memberTypeSchema = Type.Union([
  Type.Literal("general"),
  Type.Literal("undergraduate"),
  Type.Literal("graduate"),
]);

export const userPublicSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  fullName: Type.String(),
  role: userRoleSchema,
  memberType: memberTypeSchema,
  studentOrStaffId: Type.Optional(Type.String()),
  phone: Type.Optional(Type.String()),
  branchId: Type.Optional(Type.String()),
  status: userStatusSchema,
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const searchUsersQuerySchema = Type.Object({
  q: Type.String({ minLength: 1 }),
  role: Type.Optional(userRoleSchema),
  status: Type.Optional(userStatusSchema),
  page: Type.Optional(Type.Number({ minimum: 1, default: DEFAULT_PAGE })),
  limit: Type.Optional(
    Type.Number({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE }),
  ),
});

export const findUserParamsSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
});

export const createUserBodySchema = Type.Object(
  {
    email: Type.String({ format: "email", description: "อีเมล (จำเป็น)" }),
    fullName: Type.String({ minLength: 1, description: "ชื่อ-นามสกุล (จำเป็น)" }),
    role: userRoleSchema,
    password: Type.String({ minLength: 8, description: "รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)" }),
    memberType: Type.Optional(memberTypeSchema),
    studentOrStaffId: Type.Optional(Type.String({ description: "รหัสนักศึกษา/พนักงาน" })),
    phone: Type.Optional(Type.String({ description: "เบอร์โทรศัพท์" })),
    branchId: Type.Optional(Type.String({ description: "รหัสสาขา" })),
  },
  { description: "ข้อมูลสมาชิกใหม่" },
);

export const updateUserBodySchema = Type.Object(
  {
    fullName: Type.Optional(Type.String({ minLength: 1, description: "ชื่อ-นามสกุล" })),
    role: Type.Optional(userRoleSchema),
    status: Type.Optional(userStatusSchema),
    memberType: Type.Optional(memberTypeSchema),
    studentOrStaffId: Type.Optional(Type.String({ description: "รหัสนักศึกษา/พนักงาน" })),
    phone: Type.Optional(Type.String({ description: "เบอร์โทรศัพท์" })),
    branchId: Type.Optional(Type.String({ description: "รหัสสาขา" })),
  },
  {
    additionalProperties: false,
    minProperties: 1,
    description: "ข้อมูลสมาชิกที่ต้องการแก้ไข (ห้ามส่ง email/password)",
  },
);

export const searchUsersSuccessResponseSchema = paginatedResponseSchema(userPublicSchema);
export const findUserSuccessResponseSchema = successResponseSchema(userPublicSchema);
export const createUserSuccessResponseSchema = successResponseSchema(userPublicSchema);
export const updateUserSuccessResponseSchema = successResponseSchema(userPublicSchema);

export const usersErrorResponseSchema = errorResponseSchema;
