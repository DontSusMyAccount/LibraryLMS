import "reflect-metadata";

import { asc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { inject, injectable } from "tsyringe";

import { categories } from "../../../../infrastructure/database/schema";
import type { Category } from "../../../../shared";
import { TOKENS } from "../../../tokens";
import type { ICategoryRepository } from "../../applications/ports/category.repository";

type CategoryRow = typeof categories.$inferSelect;

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

@injectable()
export class DrizzleCategoryRepository implements ICategoryRepository {
  constructor(@inject(TOKENS.Db) private readonly db: PostgresJsDatabase) {}

  async list(): Promise<Category[]> {
    const rows = await this.db.select().from(categories).orderBy(asc(categories.name));
    return rows.map(toCategory);
  }
}
