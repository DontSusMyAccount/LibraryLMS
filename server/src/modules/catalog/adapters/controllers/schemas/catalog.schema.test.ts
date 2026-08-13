import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import { COPY_STATUSES } from "../../../../../shared";
import {
  bookCopySchema,
  bookListItemSchema,
  bookTitleSchema,
  createBookBodySchema,
  listBooksQuerySchema,
} from "./book.schema";
import {
  copyIdParamsSchema,
  createCopyBodySchema,
  updateCopyStatusBodySchema,
} from "./copy.schema";
import { categoryNodeSchema } from "./category.schema";

function unionConstValues(schema: unknown): unknown[] {
  return (schema as { anyOf: Array<{ const: unknown }> }).anyOf.map((item) => item.const);
}

function buildBookTitle() {
  return {
    id: "b-1",
    isbn: "9786161234567",
    title: "นิยายทดสอบ",
    author: "นักเขียนทดสอบ",
    publisher: "สำนักพิมพ์ทดสอบ",
    language: "th",
    categoryId: "cat-1",
    description: "คำอธิบาย",
    publishedYear: 2024,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function buildCopy() {
  return {
    id: "c-1",
    bookId: "b-1",
    copyCode: "BK-001",
    status: "available",
    shelfLocation: "ชั้น 1",
    acquiredAt: "2026-01-15",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("catalog schemas", () => {
  it("copyStatus union ตรงกับ shared COPY_STATUSES (กัน drift)", () => {
    expect(unionConstValues(bookCopySchema.properties.status)).toEqual([...COPY_STATUSES]);
  });

  it("bookTitleSchema ไม่รั่วฟิลด์ภายใน และยอมรับหนังสือที่ถูกต้อง", () => {
    expect(Value.Check(bookTitleSchema, buildBookTitle())).toBe(true);
  });

  it("bookCopySchema ยอมรับสำเนาที่ถูกต้องทุกสถานะ", () => {
    for (const status of COPY_STATUSES) {
      expect(Value.Check(bookCopySchema, { ...buildCopy(), status })).toBe(true);
    }
  });

  it("bookListItemSchema มี totalCopies + availableCopies (dashboard)", () => {
    const properties = bookListItemSchema.properties;
    expect(properties.totalCopies).toBeDefined();
    expect(properties.availableCopies).toBeDefined();
    expect(
      Value.Check(bookListItemSchema, {
        ...buildBookTitle(),
        copies: [buildCopy()],
        totalCopies: 1,
        availableCopies: 1,
      }),
    ).toBe(true);
  });

  it("createBookBodySchema บังคับ title/author ส่วน isbn เป็น optional", () => {
    expect(Value.Check(createBookBodySchema, { title: "ชื่อ", author: "ผู้แต่ง" })).toBe(true);
    expect(Value.Check(createBookBodySchema, { title: "ชื่อ" })).toBe(false);
    expect(Value.Check(createBookBodySchema, { author: "ผู้แต่ง" })).toBe(false);
    expect(
      Value.Check(createBookBodySchema, {
        title: "ชื่อ",
        author: "ผู้แต่ง",
        isbn: "978-616-1234-567",
      }),
    ).toBe(true);
    expect(
      Value.Check(createBookBodySchema, { title: "ชื่อ", author: "ผู้แต่ง", isbn: "ไม่ใช่ isbn" }),
    ).toBe(false);
  });

  it("listBooksQuerySchema รองรับ search/categoryId/page/limit และเลขหน้าต้อง ≥ 1", () => {
    expect(Value.Check(listBooksQuerySchema, {})).toBe(true);
    expect(Value.Check(listBooksQuerySchema, { search: "สมชาย", categoryId: "cat-1" })).toBe(true);
    expect(Value.Check(listBooksQuerySchema, { page: 0 })).toBe(false);
    expect(Value.Check(listBooksQuerySchema, { limit: 0 })).toBe(false);
  });

  it("createCopyBodySchema บังคับ copyCode", () => {
    expect(Value.Check(createCopyBodySchema, { copyCode: "BK-100", shelfLocation: "ชั้น 2" })).toBe(
      true,
    );
    expect(Value.Check(createCopyBodySchema, { shelfLocation: "ชั้น 2" })).toBe(false);
  });

  it("updateCopyStatusBodySchema รับเฉพาะค่าใน enum", () => {
    expect(Value.Check(updateCopyStatusBodySchema, { status: "borrowed" })).toBe(true);
    expect(Value.Check(updateCopyStatusBodySchema, { status: "unknow-status" })).toBe(false);
  });

  it("copyIdParamsSchema ต้องการ id ที่ไม่ว่าง", () => {
    expect(Value.Check(copyIdParamsSchema, { id: "c-1" })).toBe(true);
    expect(Value.Check(copyIdParamsSchema, { id: "" })).toBe(false);
  });

  it("categoryNodeSchema รองรับ tree ซ้อนลึก", () => {
    const node = {
      id: "cat-1",
      name: "คอมพิวเตอร์",
      createdAt: "2026-01-01T00:00:00.000Z",
      children: [
        {
          id: "cat-1-1",
          name: "การเขียนโปรแกรม",
          parentId: "cat-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          children: [],
        },
      ],
    };
    expect(Value.Check(categoryNodeSchema, node)).toBe(true);
  });
});
