import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../../../../shared";
import { bookRepositoryToken, type IBookRepository } from "../ports/book.repository";
import { copyRepositoryToken, type ICopyRepository } from "../ports/copy.repository";
import type {
  IBookListItem,
  IListBooksQuery,
  IListBooksReturnType,
} from "../schemas/catalog-schemas";

function normalizePage(value: number | undefined): number {
  const page =
    typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : DEFAULT_PAGE;
  return Math.max(DEFAULT_PAGE, page);
}

function normalizeLimit(value: number | undefined): number {
  const limit =
    typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, limit));
}

@injectable()
export class ListBooksUsecase {
  constructor(
    @inject(bookRepositoryToken) private readonly books: IBookRepository,
    @inject(copyRepositoryToken) private readonly copies: ICopyRepository,
  ) {}

  async execute({ query }: { query: IListBooksQuery }): Promise<IListBooksReturnType> {
    const page = normalizePage(query.page);
    const limit = normalizeLimit(query.limit);
    const search = query.search?.trim() || undefined;

    const paginated = await this.books.list({
      categoryId: query.categoryId,
      search,
      page,
      limit,
    });

    if (paginated.data.length === 0) {
      return { ...paginated, data: [], page, limit };
    }

    const bookIds = paginated.data.map((book) => book.id);
    const copiesByBookId = groupCopiesByBookId(await this.copies.listByBookIds(bookIds));

    const data: IBookListItem[] = paginated.data.map((book) => {
      const copies = copiesByBookId.get(book.id) ?? [];
      return {
        ...book,
        copies,
        totalCopies: copies.length,
        availableCopies: copies.filter((copy) => copy.status === "available").length,
      };
    });

    return { ...paginated, data, page, limit };
  }
}

function groupCopiesByBookId(copies: Awaited<ReturnType<ICopyRepository["listByBookIds"]>>) {
  const grouped = new Map<string, Awaited<ReturnType<ICopyRepository["listByBookIds"]>>>();
  for (const copy of copies) {
    const existing = grouped.get(copy.bookId);
    if (existing) {
      existing.push(copy);
    } else {
      grouped.set(copy.bookId, [copy]);
    }
  }
  return grouped;
}
