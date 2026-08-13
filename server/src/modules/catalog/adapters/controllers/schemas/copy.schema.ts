import { Type } from "@sinclair/typebox";

import {
  errorResponseSchema,
  successResponseSchema,
} from "../../../../shared/schemas/response.schema";
import { bookCopySchema } from "./book.schema";

const copyStatusSchema = Type.Union([
  Type.Literal("available"),
  Type.Literal("borrowed"),
  Type.Literal("reserved"),
  Type.Literal("lost"),
  Type.Literal("damaged"),
  Type.Literal("withdrawn"),
]);

export const bookIdParamsSchema = Type.Object({
  id: Type.String({ minLength: 1, description: "รหัสหนังสือ (uuid)" }),
});

export const copyIdParamsSchema = Type.Object({
  id: Type.String({ minLength: 1, description: "รหัสสำเนาหนังสือ (uuid)" }),
});

export const createCopyBodySchema = Type.Object(
  {
    copyCode: Type.String({ minLength: 1, description: "รหัสสำเนา (ไม่ซ้ำในระบบ)" }),
    branchId: Type.Optional(Type.String({ description: "รหัสสาขา" })),
    shelfLocation: Type.Optional(Type.String({ description: "ตำแหน่งชั้นวาง" })),
    acquiredAt: Type.Optional(Type.String({ description: "วันที่รับเข้า (YYYY-MM-DD)" })),
  },
  { description: "ข้อมูลสำเนาหนังสือใหม่" },
);

export const updateCopyStatusBodySchema = Type.Object(
  {
    status: copyStatusSchema,
  },
  { description: "สถานะใหม่ของสำเนา (ผ่าน state machine)" },
);

export const createCopySuccessResponseSchema = successResponseSchema(bookCopySchema);
export const updateCopyStatusSuccessResponseSchema = successResponseSchema(bookCopySchema);

export const copyErrorResponseSchema = errorResponseSchema;
