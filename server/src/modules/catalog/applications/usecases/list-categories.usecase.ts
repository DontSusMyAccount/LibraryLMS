import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { categoryRepositoryToken, type ICategoryRepository } from "../ports/category.repository";
import type { ICategoryNode, IListCategoriesReturnType } from "../schemas/catalog-schemas";

@injectable()
export class ListCategoriesUsecase {
  constructor(@inject(categoryRepositoryToken) private readonly categories: ICategoryRepository) {}

  async execute(): Promise<IListCategoriesReturnType> {
    const records = await this.categories.list();
    return buildCategoryTree(records);
  }
}

function buildCategoryTree(records: Awaited<ReturnType<ICategoryRepository["list"]>>) {
  const byParent = new Map<string, ICategoryNode[]>();
  const roots: ICategoryNode[] = [];

  const nodes: ICategoryNode[] = records.map((record) => ({ ...record, children: [] }));
  for (const node of nodes) {
    if (node.parentId) {
      const siblings = byParent.get(node.parentId);
      if (siblings) {
        siblings.push(node);
      } else {
        byParent.set(node.parentId, [node]);
      }
    } else {
      roots.push(node);
    }
  }

  const sortByName = (list: ICategoryNode[]): ICategoryNode[] =>
    [...list].sort((a, b) => a.name.localeCompare(b.name, "th"));

  const attach = (nodesToAttach: ICategoryNode[]): ICategoryNode[] => {
    const sorted = sortByName(nodesToAttach);
    for (const node of sorted) {
      const children = byParent.get(node.id);
      if (children) {
        node.children = attach(children);
      }
    }
    return sorted;
  };

  return attach(roots);
}
