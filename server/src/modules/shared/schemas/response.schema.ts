import { Type, type TSchema } from "@sinclair/typebox";

export const successResponseSchema = <T extends TSchema>(schema: T) =>
  Type.Object({
    success: Type.Literal(true),
    data: schema,
    message: Type.Optional(Type.String()),
  });

export const errorResponseSchema = Type.Object({
  success: Type.Literal(false),
  error: Type.String(),
});

export const paginatedResponseSchema = <T extends TSchema>(schema: T) =>
  Type.Object({
    success: Type.Literal(true),
    data: Type.Array(schema),
    total: Type.Number(),
    page: Type.Number(),
    limit: Type.Number(),
    totalPages: Type.Number(),
  });

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
