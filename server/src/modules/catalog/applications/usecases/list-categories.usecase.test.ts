import { describe, expect, it } from "vitest";

import type { Category } from "../../../../shared";
import type { ICategoryRepository } from "../ports/category.repository";
import { ListCategoriesUsecase } from "./list-categories.usecase";

function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    name: "หมวดทดสอบ",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createCategoryRepository(records: Category[]): ICategoryRepository {
  return {
    list: async () => records,
  };
}

const CATEGORIES: Category[] = [
  buildCategory({ id: "cat-2", name: "ปรัชญา จิตวิทยา" }),
  buildCategory({ id: "cat-1", name: "คอมพิวเตอร์" }),
  buildCategory({
    id: "cat-1-1",
    name: "การเขียนโปรแกรม",
    parentId: "cat-1",
  }),
  buildCategory({
    id: "cat-1-2",
    name: "ข้อมูลขนาดใหญ่",
    parentId: "cat-1",
  }),
  buildCategory({ id: "cat-3", name: "ศาสนา" }),
];

describe("ListCategoriesUsecase", () => {
  it("จัดเรียงเป็น tree: root เรียงตามชื่อ, children เรียงตามชื่อ", async () => {
    const usecase = new ListCategoriesUsecase(createCategoryRepository(CATEGORIES));

    const result = await usecase.execute();

    expect(result).toHaveLength(3);
    expect(result.map((node) => node.id)).toEqual(["cat-1", "cat-2", "cat-3"]);

    const computer = result[0];
    expect(computer!.children.map((child) => child.id)).toEqual(["cat-1-1", "cat-1-2"]);
  });

  it("ไม่มีหมวดย่อย children เป็น array ว่าง", async () => {
    const usecase = new ListCategoriesUsecase(
      createCategoryRepository([buildCategory({ id: "only", name: "หมวดเดียว" })]),
    );

    const result = await usecase.execute();

    expect(result).toHaveLength(1);
    expect(result[0]!.children).toEqual([]);
  });

  it("รายการที่ว่างเปล่าคืน []", async () => {
    const usecase = new ListCategoriesUsecase(createCategoryRepository([]));

    const result = await usecase.execute();

    expect(result).toEqual([]);
  });
});
