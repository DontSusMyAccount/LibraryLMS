import "reflect-metadata";

import { Elysia } from "elysia";
import { inject, injectable } from "tsyringe";

import { authPlugin } from "../../../auth.plugin";
import { errorResponseSchema } from "../../../shared/schemas/response.schema";
import { TOKENS } from "../../../tokens";
import type { ILoginCommand } from "../../applications/schemas/auth-schemas";
import { LoginUsecase } from "../../applications/usecases/login.usecase";
import {
  loginRequestSchema,
  loginSuccessResponseSchema,
  logoutSuccessResponseSchema,
  meSuccessResponseSchema,
} from "./schemas/auth.schema";

@injectable()
export class AuthController {
  constructor(
    @inject(LoginUsecase) private readonly loginUsecase: LoginUsecase,
    @inject(TOKENS.JwtSecret) private readonly jwtSecret: string,
    @inject(TOKENS.InternalSecret) private readonly internalSecret: string,
  ) {}

  getRoutes() {
    return new Elysia({ prefix: "/auth" })
      .use(authPlugin({ jwtSecret: this.jwtSecret, internalSecret: this.internalSecret }))
      .post("/login", ({ body }) => this.login(body), {
        body: loginRequestSchema,
        response: { 200: loginSuccessResponseSchema, 401: errorResponseSchema },
      })
      .post("/logout", () => ({ success: true as const, data: { ok: true as const } }), {
        response: logoutSuccessResponseSchema,
      })
      .guard({ role: true }, (app) =>
        app.get("/me", ({ user }) => ({ success: true as const, data: user }), {
          response: meSuccessResponseSchema,
        }),
      );
  }

  private async login(body: ILoginCommand) {
    const result = await this.loginUsecase.execute({ command: body });
    return { success: true as const, data: result };
  }
}
