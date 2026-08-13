import "reflect-metadata";

import { Elysia } from "elysia";
import { inject, injectable } from "tsyringe";

import { authPlugin } from "../../../auth.plugin";
import { TOKENS } from "../../../tokens";
import { ListCategoriesUsecase } from "../../applications/usecases/list-categories.usecase";
import {
  categoryErrorResponseSchema,
  listCategoriesSuccessResponseSchema,
} from "./schemas/category.schema";

@injectable()
export class CategoryController {
  constructor(
    @inject(ListCategoriesUsecase) private readonly listCategoriesUsecase: ListCategoriesUsecase,
    @inject(TOKENS.JwtSecret) private readonly jwtSecret: string,
    @inject(TOKENS.InternalSecret) private readonly internalSecret: string,
  ) {}

  getRoutes() {
    return new Elysia({ prefix: "/catalog" })
      .use(authPlugin({ jwtSecret: this.jwtSecret, internalSecret: this.internalSecret }))
      .guard({ role: true }, (app) =>
        app.get("/categories", (() => this.list()) as unknown as () => Promise<never>, {
          response: {
            200: listCategoriesSuccessResponseSchema,
            404: categoryErrorResponseSchema,
          },
          detail: {
            tags: ["Catalog"],
            summary: "รายการหมวดหมู่ (tree)",
            description: "ทุก role ที่ active เข้าถึงได้ (ฝั่งผู้ยืมใช้กรองการค้นหา)",
          },
        }),
      );
  }

  private async list() {
    const data = await this.listCategoriesUsecase.execute();
    return { success: true as const, data };
  }
}
