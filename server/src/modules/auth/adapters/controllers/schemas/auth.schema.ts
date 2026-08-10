import { Type } from "@sinclair/typebox";

import { successResponseSchema } from "../../../../shared/schemas/response.schema";

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

export const sessionUserSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  fullName: Type.String(),
  role: userRoleSchema,
  status: userStatusSchema,
  branchId: Type.Optional(Type.String()),
});

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

export const loginRequestSchema = Type.Object({
  email: Type.RegExp(/^\S+@\S+\.\S+$/),
  password: Type.String({ minLength: 1 }),
});

export const loginDataSchema = Type.Object({
  token: Type.String(),
  user: userPublicSchema,
});

export const loginSuccessResponseSchema = successResponseSchema(loginDataSchema);
export const meSuccessResponseSchema = successResponseSchema(sessionUserSchema);
export const logoutSuccessResponseSchema = successResponseSchema(
  Type.Object({ ok: Type.Literal(true) }),
);
