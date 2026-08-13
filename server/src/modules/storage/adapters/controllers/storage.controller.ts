import "reflect-metadata";

import { Elysia } from "elysia";
import { inject, injectable } from "tsyringe";

import { authPlugin } from "../../../auth.plugin";
import { TOKENS } from "../../../tokens";
import { UploadCoverUsecase } from "../../applications/usecases/upload-cover.usecase";
import {
  storageErrorResponseSchema,
  type IUploadCoverBody,
  uploadCoverBodySchema,
  uploadCoverSuccessResponseSchema,
} from "./schemas/storage.schema";

@injectable()
export class StorageController {
  constructor(
    @inject(UploadCoverUsecase) private readonly uploadCoverUsecase: UploadCoverUsecase,
    @inject(TOKENS.JwtSecret) private readonly jwtSecret: string,
    @inject(TOKENS.InternalSecret) private readonly internalSecret: string,
  ) {}

  getRoutes() {
    return new Elysia({ prefix: "/storage" })
      .use(authPlugin({ jwtSecret: this.jwtSecret, internalSecret: this.internalSecret }))
      .guard({ role: ["admin", "librarian"] }, (app) =>
        app.post("/covers", ({ body }) => this.uploadCover(body), {
          body: uploadCoverBodySchema,
          response: {
            200: uploadCoverSuccessResponseSchema,
            409: storageErrorResponseSchema,
            422: storageErrorResponseSchema,
          },
          detail: {
            tags: ["Storage"],
            summary: "อัปโหลดรูปปกหนังสือ (multipart)",
            description:
              "รับไฟล์รูป JPG/PNG/WEBP สูงสุด 5MB แล้วคืน URL สำหรับใส่ใน books.cover_url",
          },
        }),
      );
  }

  private async uploadCover(body: IUploadCoverBody) {
    const buffer = new Uint8Array(await body.file.arrayBuffer());
    const result = await this.uploadCoverUsecase.execute({
      input: {
        bookId: body.bookId,
        filename: body.file.name,
        body: buffer,
        contentType: body.file.type,
      },
    });
    return { success: true as const, data: { url: result.url } };
  }
}
