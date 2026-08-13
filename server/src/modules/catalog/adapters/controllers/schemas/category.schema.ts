import { Type } from "@sinclair/typebox";

import {
  errorResponseSchema,
  successResponseSchema,
} from "../../../../shared/schemas/response.schema";

export const categoryNodeSchema = Type.Recursive(
  (self) =>
    Type.Object({
      id: Type.String({ description: "รหัสหมวดหมู่" }),
      name: Type.String({ description: "ชื่อหมวดหมู่" }),
      parentId: Type.Optional(Type.String({ description: "รหัสหมวดหมู่แม่" })),
      createdAt: Type.String({ description: "เวลาที่สร้าง" }),
      children: Type.Array(self, { description: "หมวดหมู่ย่อย" }),
    }),
  { description: "หมวดหมู่แบบ tree (children ซ้อนกันได้)" },
);

export const listCategoriesSuccessResponseSchema = successResponseSchema(
  Type.Array(categoryNodeSchema),
);

export const categoryErrorResponseSchema = errorResponseSchema;
