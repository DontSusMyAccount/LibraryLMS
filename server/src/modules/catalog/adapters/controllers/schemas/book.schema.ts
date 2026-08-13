import { Type } from "@sinclair/typebox";

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../../../../../shared";
import {
  errorResponseSchema,
  paginatedResponseSchema,
  successResponseSchema,
} from "../../../../shared/schemas/response.schema";

const copyStatusSchema = Type.Union([
  Type.Literal("available"),
  Type.Literal("borrowed"),
  Type.Literal("reserved"),
  Type.Literal("lost"),
  Type.Literal("damaged"),
  Type.Literal("withdrawn"),
]);

export const bookCopySchema = Type.Object(
  {
    id: Type.String({ description: "รหัสสำเนา" }),
    bookId: Type.String({ description: "รหัสหนังสือ" }),
    branchId: Type.Optional(Type.String({ description: "รหัสสาขา" })),
    copyCode: Type.String({ description: "รหัสสำเนา (ไม่ซ้ำ)" }),
    status: copyStatusSchema,
    shelfLocation: Type.Optional(Type.String({ description: "ตำแหน่งชั้นวาง" })),
    acquiredAt: Type.Optional(Type.String({ description: "วันที่รับเข้า (YYYY-MM-DD)" })),
    createdAt: Type.String({ description: "เวลาที่สร้าง" }),
  },
  { description: "สำเนาหนังสือ" },
);

export const bookTitleSchema = Type.Object(
  {
    id: Type.String({ description: "รหัสหนังสือ" }),
    isbn: Type.Optional(Type.String({ description: "ISBN (ISBN-10 / ISBN-13)" })),
    title: Type.String({ description: "ชื่อหนังสือ" }),
    author: Type.String({ description: "ผู้แต่ง" }),
    publisher: Type.Optional(Type.String({ description: "สำนักพิมพ์" })),
    language: Type.Optional(Type.String({ description: "ภาษา" })),
    categoryId: Type.Optional(Type.String({ description: "รหัสหมวดหมู่" })),
    description: Type.Optional(Type.String({ description: "คำอธิบาย" })),
    coverUrl: Type.Optional(Type.String({ description: "URL รูปปก" })),
    publishedYear: Type.Optional(Type.Number({ description: "ปีที่พิมพ์" })),
    createdAt: Type.String({ description: "เวลาที่สร้าง" }),
    updatedAt: Type.String({ description: "เวลาที่แก้ไขล่าสุด" }),
  },
  { description: "ข้อมูลหนังสือ (title)" },
);

export const bookWithCopiesSchema = Type.Object(
  {
    ...bookTitleSchema.properties,
    copies: Type.Array(bookCopySchema, { description: "รายการสำเนาทั้งหมด" }),
  },
  { description: "หนังสือพร้อมสำเนา" },
);

export const bookListItemSchema = Type.Object(
  {
    ...bookWithCopiesSchema.properties,
    totalCopies: Type.Number({ description: "จำนวนสำเนาทั้งหมด" }),
    availableCopies: Type.Number({ description: "จำนวนสำเนาที่พร้อมยืม" }),
  },
  { description: "หนังสือพร้อมสรุปจำนวนสำเนา (สำหรับรายการ/แดชบอร์ด)" },
);

const isbnPattern = "^[0-9Xx\\-\\s]+$";

export const createBookBodySchema = Type.Object(
  {
    isbn: Type.Optional(
      Type.String({
        pattern: isbnPattern,
        minLength: 10,
        maxLength: 20,
        description: "ISBN (ISBN-10 หรือ ISBN-13 ใส่ขีดได้)",
      }),
    ),
    title: Type.String({ minLength: 1, description: "ชื่อหนังสือ (จำเป็น)" }),
    author: Type.String({ minLength: 1, description: "ผู้แต่ง (จำเป็น)" }),
    publisher: Type.Optional(Type.String({ description: "สำนักพิมพ์" })),
    language: Type.Optional(Type.String({ description: "ภาษา" })),
    categoryId: Type.Optional(Type.String({ description: "รหัสหมวดหมู่" })),
    description: Type.Optional(Type.String({ description: "คำอธิบาย" })),
    coverUrl: Type.Optional(Type.String({ description: "URL รูปปก" })),
    publishedYear: Type.Optional(Type.Number({ description: "ปีที่พิมพ์" })),
  },
  { description: "ข้อมูลหนังสือใหม่" },
);

export const updateBookBodySchema = Type.Object(
  {
    isbn: Type.Optional(
      Type.String({
        pattern: isbnPattern,
        minLength: 10,
        maxLength: 20,
        description: "ISBN (ISBN-10 หรือ ISBN-13 ใส่ขีดได้)",
      }),
    ),
    title: Type.Optional(Type.String({ minLength: 1, description: "ชื่อหนังสือ" })),
    author: Type.Optional(Type.String({ minLength: 1, description: "ผู้แต่ง" })),
    publisher: Type.Optional(Type.String({ description: "สำนักพิมพ์" })),
    language: Type.Optional(Type.String({ description: "ภาษา" })),
    categoryId: Type.Optional(Type.String({ description: "รหัสหมวดหมู่" })),
    description: Type.Optional(Type.String({ description: "คำอธิบาย" })),
    coverUrl: Type.Optional(Type.String({ description: "URL รูปปก" })),
    publishedYear: Type.Optional(Type.Number({ description: "ปีที่พิมพ์" })),
  },
  { description: "ข้อมูลหนังสือที่ต้องการแก้ไข" },
);

export const listBooksQuerySchema = Type.Object({
  categoryId: Type.Optional(Type.String({ description: "กรองด้วยรหัสหมวดหมู่" })),
  search: Type.Optional(Type.String({ description: "ค้นหาชื่อหนังสือ/ผู้แต่ง (ILIKE)" })),
  page: Type.Optional(Type.Number({ minimum: 1, default: DEFAULT_PAGE, description: "เลขหน้า" })),
  limit: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: MAX_PAGE_SIZE,
      default: DEFAULT_PAGE_SIZE,
      description: "จำนวนต่อหน้า",
    }),
  ),
});

export const bookIdParamsSchema = Type.Object({
  id: Type.String({ minLength: 1, description: "รหัสหนังสือ (uuid)" }),
});

export const createBookSuccessResponseSchema = successResponseSchema(bookTitleSchema);
export const updateBookSuccessResponseSchema = successResponseSchema(bookTitleSchema);
export const getBookSuccessResponseSchema = successResponseSchema(bookWithCopiesSchema);
export const listBooksSuccessResponseSchema = paginatedResponseSchema(bookListItemSchema);

export const catalogErrorResponseSchema = errorResponseSchema;
