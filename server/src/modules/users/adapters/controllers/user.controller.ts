import "reflect-metadata";

import { Elysia } from "elysia";
import { inject, injectable } from "tsyringe";

import { authPlugin } from "../../../auth.plugin";
import {
  errorResponseSchema,
  paginatedResponseSchema,
  successResponseSchema,
} from "../../../shared/schemas/response.schema";
import { TOKENS } from "../../../tokens";
import type { IListUsersQuery } from "../../applications/schemas/user-schemas";
import { FindUserUsecase } from "../../applications/usecases/find-user.usecase";
import { ListUsersUsecase } from "../../applications/usecases/list-users.usecase";
import {
  findUserParamsSchema,
  searchUsersQuerySchema,
  userPublicSchema,
} from "./schemas/user.schema";

@injectable()
export class UsersController {
  constructor(
    @inject(FindUserUsecase) private readonly findUserUsecase: FindUserUsecase,
    @inject(ListUsersUsecase) private readonly listUsersUsecase: ListUsersUsecase,
    @inject(TOKENS.JwtSecret) private readonly jwtSecret: string,
    @inject(TOKENS.InternalSecret) private readonly internalSecret: string,
  ) {}

  getRoutes() {
    return new Elysia({ prefix: "/users" })
      .use(authPlugin({ jwtSecret: this.jwtSecret, internalSecret: this.internalSecret }))
      .guard({ role: ["admin", "librarian"] }, (app) =>
        app
          .get("/search", ({ query }) => this.search(query), {
            query: searchUsersQuerySchema,
            response: { 200: paginatedResponseSchema(userPublicSchema), 404: errorResponseSchema },
          })
          .get("/:id", ({ params }) => this.findById(params), {
            params: findUserParamsSchema,
            response: { 200: successResponseSchema(userPublicSchema), 404: errorResponseSchema },
          }),
      );
  }

  private async search(query: IListUsersQuery) {
    const result = await this.listUsersUsecase.execute({ query });
    return { success: true as const, ...result };
  }

  private async findById(params: { id: string }) {
    const result = await this.findUserUsecase.execute({
      command: { studentOrStaffId: params.id },
    });
    return { success: true as const, data: result.user };
  }
}
