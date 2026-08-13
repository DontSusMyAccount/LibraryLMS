import "reflect-metadata";

import { Elysia } from "elysia";
import { inject, injectable } from "tsyringe";

import { authPlugin } from "../../../auth.plugin";
import { TOKENS } from "../../../tokens";
import type {
  ICreateBookCommand,
  IListBooksQuery,
  IUpdateBookBody,
} from "../../applications/schemas/catalog-schemas";
import { CreateBookUsecase } from "../../applications/usecases/create-book.usecase";
import { GetBookUsecase } from "../../applications/usecases/get-book.usecase";
import { ListBooksUsecase } from "../../applications/usecases/list-books.usecase";
import { UpdateBookUsecase } from "../../applications/usecases/update-book.usecase";
import {
  bookIdParamsSchema,
  catalogErrorResponseSchema,
  createBookBodySchema,
  createBookSuccessResponseSchema,
  getBookSuccessResponseSchema,
  listBooksQuerySchema,
  listBooksSuccessResponseSchema,
  updateBookBodySchema,
  updateBookSuccessResponseSchema,
} from "./schemas/book.schema";

@injectable()
export class BookController {
  constructor(
    @inject(CreateBookUsecase) private readonly createBookUsecase: CreateBookUsecase,
    @inject(UpdateBookUsecase) private readonly updateBookUsecase: UpdateBookUsecase,
    @inject(ListBooksUsecase) private readonly listBooksUsecase: ListBooksUsecase,
    @inject(GetBookUsecase) private readonly getBookUsecase: GetBookUsecase,
    @inject(TOKENS.JwtSecret) private readonly jwtSecret: string,
    @inject(TOKENS.InternalSecret) private readonly internalSecret: string,
  ) {}

  getRoutes() {
    return new Elysia({ prefix: "/catalog" })
      .use(authPlugin({ jwtSecret: this.jwtSecret, internalSecret: this.internalSecret }))
      .guard({ role: true }, (app) =>
        app
          // GET เปิดให้ทุก role ที่ active (ฝั่งผู้ยืมต้องค้นหาหนังสือได้)
          .get("/books", ({ query }) => this.list(query), {
            query: listBooksQuerySchema,
            response: {
              200: listBooksSuccessResponseSchema,
              404: catalogErrorResponseSchema,
            },
            detail: {
              tags: ["Catalog"],
              summary: "รายการหนังสือ (ค้นหา/กรองหมวด/แบ่งหน้า)",
              description:
                "ค้นหาชื่อหรือผู้แต่งด้วย ILIKE รองรับภาษาไทย — ทุก role ที่ active เข้าถึงได้",
            },
          })
          .get("/books/:id", ({ params }) => this.getById(params), {
            params: bookIdParamsSchema,
            response: {
              200: getBookSuccessResponseSchema,
              404: catalogErrorResponseSchema,
            },
            detail: {
              tags: ["Catalog"],
              summary: "ดูรายละเอียดหนังสือพร้อมสำเนาทั้งหมด",
              description: "ทุก role ที่ active เข้าถึงได้",
            },
          })
          // Mutation ยังจำกัดเฉพาะ admin/librarian
          .guard({ role: ["admin", "librarian"] }, (adminApp) =>
            adminApp
              .post("/books", ({ body, user }) => this.create(body, user.id), {
                body: createBookBodySchema,
                response: {
                  200: createBookSuccessResponseSchema,
                  404: catalogErrorResponseSchema,
                  409: catalogErrorResponseSchema,
                },
                detail: { tags: ["Catalog"], summary: "สร้างหนังสือใหม่" },
              })
              .put("/books/:id", ({ params, body, user }) => this.update(params, body, user.id), {
                params: bookIdParamsSchema,
                body: updateBookBodySchema,
                response: {
                  200: updateBookSuccessResponseSchema,
                  404: catalogErrorResponseSchema,
                  409: catalogErrorResponseSchema,
                },
                detail: { tags: ["Catalog"], summary: "แก้ไขข้อมูลหนังสือ" },
              }),
          ),
      );
  }

  private async list(query: IListBooksQuery) {
    const result = await this.listBooksUsecase.execute({ query });
    return { success: true as const, ...result };
  }

  private async create(body: ICreateBookCommand, actorId: string) {
    const result = await this.createBookUsecase.execute({ command: body, actorId });
    return { success: true as const, data: result.book };
  }

  private async getById(params: { id: string }) {
    const result = await this.getBookUsecase.execute({ command: { id: params.id } });
    return { success: true as const, data: result.book };
  }

  private async update(params: { id: string }, body: IUpdateBookBody, actorId: string) {
    const result = await this.updateBookUsecase.execute({
      command: { id: params.id, ...body },
      actorId,
    });
    return { success: true as const, data: result.book };
  }
}
