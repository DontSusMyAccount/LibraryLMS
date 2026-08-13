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
import type {
  ICreateUserCommand,
  IListUsersQuery,
  IUpdateUserCommand,
} from "../../applications/schemas/user-schemas";
import { CreateUserUsecase } from "../../applications/usecases/create-user.usecase";
import { FindUserUsecase } from "../../applications/usecases/find-user.usecase";
import { ListUsersUsecase } from "../../applications/usecases/list-users.usecase";
import { UpdateUserUsecase } from "../../applications/usecases/update-user.usecase";
import {
  createUserBodySchema,
  createUserSuccessResponseSchema,
  findUserParamsSchema,
  searchUsersQuerySchema,
  updateUserBodySchema,
  updateUserSuccessResponseSchema,
  userPublicSchema,
  usersErrorResponseSchema,
} from "./schemas/user.schema";

@injectable()
export class UsersController {
  constructor(
    @inject(CreateUserUsecase) private readonly createUserUsecase: CreateUserUsecase,
    @inject(UpdateUserUsecase) private readonly updateUserUsecase: UpdateUserUsecase,
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
          })
          .post("/", ({ body }) => this.create(body), {
            body: createUserBodySchema,
            response: {
              200: createUserSuccessResponseSchema,
              404: usersErrorResponseSchema,
              409: usersErrorResponseSchema,
            },
            detail: { tags: ["Users"], summary: "สร้างสมาชิกใหม่" },
          })
          .patch("/:id", ({ params, body, user }) => this.update(params.id, body, user.id), {
            params: findUserParamsSchema,
            body: updateUserBodySchema,
            response: {
              200: updateUserSuccessResponseSchema,
              403: usersErrorResponseSchema,
              404: usersErrorResponseSchema,
              409: usersErrorResponseSchema,
            },
            detail: { tags: ["Users"], summary: "แก้ไขข้อมูลสมาชิก" },
          }),
      );
  }

  private async search(query: IListUsersQuery) {
    const result = await this.listUsersUsecase.execute({ query });
    return { success: true as const, ...result };
  }

  private async findById(params: { id: string }) {
    const result = await this.findUserUsecase.execute({
      query: { studentOrStaffId: params.id },
    });
    return { success: true as const, data: result.user };
  }

  private async create(body: ICreateUserCommand) {
    const result = await this.createUserUsecase.execute({ command: body });
    return { success: true as const, data: result.user };
  }

  private async update(id: string, body: IUpdateUserCommand, actorId: string) {
    const result = await this.updateUserUsecase.execute({ command: body, id, actorId });
    return { success: true as const, data: result.user };
  }
}
