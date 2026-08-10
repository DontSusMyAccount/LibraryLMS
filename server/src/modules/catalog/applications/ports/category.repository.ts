import type { Category } from "../../../../shared";

export const categoryRepositoryToken = Symbol("CategoryRepository").toString();

export interface ICategoryRepository {
  list(): Promise<Category[]>;
}
