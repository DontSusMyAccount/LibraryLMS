import "reflect-metadata";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { container } from "tsyringe";

import { TOKENS } from "../tokens";
import { DrizzleUserRepository } from "./adapters/repository/user.drizzle.repository";
import { userRepositoryToken } from "./applications/ports/user.repository";
import { CreateUserUsecase } from "./applications/usecases/create-user.usecase";
import { FindUserUsecase } from "./applications/usecases/find-user.usecase";
import { ListUsersUsecase } from "./applications/usecases/list-users.usecase";
import { UpdateUserUsecase } from "./applications/usecases/update-user.usecase";
import { UsersController } from "./adapters/controllers/user.controller";

export interface UsersModuleDeps {
  db: PostgresJsDatabase;
  jwtSecret: string;
  internalSecret: string;
}

export function registerUsersModule(deps: UsersModuleDeps): void {
  container.register(TOKENS.Db, { useValue: deps.db });
  container.register(TOKENS.JwtSecret, { useValue: deps.jwtSecret });
  container.register(TOKENS.InternalSecret, { useValue: deps.internalSecret });
  container.register(userRepositoryToken, { useClass: DrizzleUserRepository });
  container.register(CreateUserUsecase, { useClass: CreateUserUsecase });
  container.register(FindUserUsecase, { useClass: FindUserUsecase });
  container.register(ListUsersUsecase, { useClass: ListUsersUsecase });
  container.register(UpdateUserUsecase, { useClass: UpdateUserUsecase });
  container.register(UsersController, { useClass: UsersController });
}

export function resolveUsersController(): UsersController {
  return container.resolve(UsersController);
}
