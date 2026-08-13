import { Type } from "@sinclair/typebox";
import { t } from "elysia";

import {
  errorResponseSchema,
  successResponseSchema,
} from "../../../../shared/schemas/response.schema";

export interface IUploadCoverBody {
  bookId: string;
  file: File;
}

export const uploadCoverBodySchema = Type.Object({
  bookId: Type.String({ minLength: 1, description: "รหัสหนังสือ (uuid)" }),
  file: t.File({
    type: "image/*",
    maxSize: "5m",
    description: "ไฟล์รูปปก (JPG/PNG/WEBP สูงสุด 5MB)",
  }),
});

export const uploadCoverSuccessResponseSchema = successResponseSchema(
  Type.Object({ url: Type.String({ description: "URL รูปปกที่อัปโหลดแล้ว" }) }),
);

export const storageErrorResponseSchema = errorResponseSchema;
