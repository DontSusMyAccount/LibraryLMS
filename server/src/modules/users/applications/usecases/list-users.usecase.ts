import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, toPublic } from "../../../../shared";
import {
  userRepositoryToken,
  type IUserRepository,
  type SearchUsersOptions,
} from "../ports/user.repository";
import type { IListUsersQuery, IListUsersReturnType } from "../schemas/user-schemas";

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
export class ListUsersUsecase {
  constructor(@inject(userRepositoryToken) private readonly repository: IUserRepository) {}

  async execute({ query }: { query: IListUsersQuery }): Promise<IListUsersReturnType> {
    const page = normalizePage(query.page);
    const limit = normalizeLimit(query.limit);
    const keyword = (query.q ?? "").trim();

    const searchOptions: SearchUsersOptions = {
      page,
      limit,
      ...(query.role !== undefined && { role: query.role }),
      ...(query.status !== undefined && { status: query.status }),
    };

    const paginated = await this.repository.searchByKeyword(keyword, searchOptions);
    return {
      ...paginated,
      data: paginated.data.map((user) => toPublic(user)),
      page,
      limit,
    };
  }
}
