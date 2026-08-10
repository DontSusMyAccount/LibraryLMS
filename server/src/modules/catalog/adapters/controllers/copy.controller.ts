import "reflect-metadata";

import { Elysia } from "elysia";
import { inject, injectable } from "tsyringe";

import { authPlugin } from "../../../auth.plugin";
import { TOKENS } from "../../../tokens";
import type {
  ICreateCopyBody,
  IUpdateCopyStatusBody,
} from "../../applications/schemas/catalog-schemas";
import { CreateCopyUsecase } from "../../applications/usecases/create-copy.usecase";
import { UpdateCopyStatusUsecase } from "../../applications/usecases/update-copy-status.usecase";
import {
  bookIdParamsSchema,
  copyErrorResponseSchema,
  copyIdParamsSchema,
  createCopyBodySchema,
  createCopySuccessResponseSchema,
  updateCopyStatusBodySchema,
  updateCopyStatusSuccessResponseSchema,
} from "./schemas/copy.schema";

@injectable()
export class CopyController {
  constructor(
    @inject(CreateCopyUsecase) private readonly createCopyUsecase: CreateCopyUsecase,
    @inject(UpdateCopyStatusUsecase)
    private readonly updateCopyStatusUsecase: UpdateCopyStatusUsecase,
    @inject(TOKENS.JwtSecret) private readonly jwtSecret: string,
    @inject(TOKENS.InternalSecret) private readonly internalSecret: string,
  ) {}

  getRoutes() {
    return new Elysia({ prefix: "/catalog" })
      .use(authPlugin({ jwtSecret: this.jwtSecret, internalSecret: this.internalSecret }))
      .guard({ role: ["admin", "librarian"] }, (app) =>
        app
          .post("/books/:id/copies", ({ params, body }) => this.createCopy(params, body), {
            params: bookIdParamsSchema,
            body: createCopyBodySchema,
            response: {
              200: createCopySuccessResponseSchema,
              404: copyErrorResponseSchema,
              409: copyErrorResponseSchema,
            },
            detail: { tags: ["Catalog"], summary: "เพิ่มสำเนาหนังสือ" },
          })
          .put("/copies/:id/status", ({ params, body }) => this.updateStatus(params, body), {
            params: copyIdParamsSchema,
            body: updateCopyStatusBodySchema,
            response: {
              200: updateCopyStatusSuccessResponseSchema,
              404: copyErrorResponseSchema,
              409: copyErrorResponseSchema,
            },
            detail: {
              tags: ["Catalog"],
              summary: "เปลี่ยนสถานะสำเนาหนังสือ",
              description: "ผ่าน state machine — การเปลี่ยนที่ผิดกฎจะถูกปฏิเสธ (409)",
            },
          }),
      );
  }

  private async createCopy(params: { id: string }, body: ICreateCopyBody) {
    const result = await this.createCopyUsecase.execute({
      command: { ...body, bookId: params.id },
    });
    return { success: true as const, data: result.copy };
  }

  private async updateStatus(params: { id: string }, body: IUpdateCopyStatusBody) {
    const result = await this.updateCopyStatusUsecase.execute({
      command: { id: params.id, status: body.status },
    });
    return { success: true as const, data: result.copy };
  }
}
