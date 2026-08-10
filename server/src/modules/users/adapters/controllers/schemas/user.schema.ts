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
  page: Type.Optional(Type.Number({ minimum: 1, default: DEFAULT_PAGE })),
  limit: Type.Optional(
    Type.Number({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE }),
  ),
});

export const findUserParamsSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
});

export const searchUsersSuccessResponseSchema = paginatedResponseSchema(userPublicSchema);
export const findUserSuccessResponseSchema = successResponseSchema(userPublicSchema);

export const usersErrorResponseSchema = errorResponseSchema;
