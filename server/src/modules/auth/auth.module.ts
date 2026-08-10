import "reflect-metadata";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { container } from "tsyringe";

import { TOKENS } from "../tokens";
import { AuthController } from "./adapters/controllers/auth.controller";
import { DrizzleAuthRepository } from "./adapters/repository/auth.drizzle.repository";
import { authRepositoryToken } from "./applications/ports/auth.repository";
import { LoginUsecase } from "./applications/usecases/login.usecase";

export interface AuthModuleDeps {
  db: PostgresJsDatabase;
  jwtSecret: string;
  internalSecret: string;
}

export function registerAuthModule(deps: AuthModuleDeps): void {
  container.register(TOKENS.Db, { useValue: deps.db });
  container.register(TOKENS.JwtSecret, { useValue: deps.jwtSecret });
  container.register(TOKENS.InternalSecret, { useValue: deps.internalSecret });
  container.register(authRepositoryToken, { useClass: DrizzleAuthRepository });
  container.register(LoginUsecase, { useClass: LoginUsecase });
  container.register(AuthController, { useClass: AuthController });
}

export function resolveAuthController(): AuthController {
  return container.resolve(AuthController);
}
