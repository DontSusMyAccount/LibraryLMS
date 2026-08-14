import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { type AnyElysia, Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";

import { toHttpError } from "./libs/http-error.factory";
import { createUploadsRoute } from "./modules/storage/uploads.route";

const isProd = (env: Record<string, string | undefined>) => env.NODE_ENV === "production";

export const UPLOADS_ROOT = "uploads";

export interface CreateAppOptions {
  isDev?: boolean;
  mountUploadsRoute?: boolean;
}

export function buildApp<T extends AnyElysia>(appModule: T, options: CreateAppOptions = {}) {
  const isDev = options.isDev ?? !isProd(process.env);
  const mountUploadsRoute = options.mountUploadsRoute ?? true;

  const app = new Elysia()
    // CORS: prod จำกัดเฉพาะ web app origin เท่านั้น (mirror ไว้ทั้งสองรูปแบบ)
    // — frontend เรียก API ผ่าน BFF same-origin เป็นหลัก แต่ถ้ามีใครเรียก API เว็บตรง
    //   ก็ต้องไม่ allow ทุก origin + credentials (เดิม default สะท้อน origin กลับทั้งหมด)
    // — dev ปล่อยกว้าง (localhost + e2e ใช้ eden เรียกตรง)
    .use(
      cors({
        origin: isDev ? true : /^https:\/\/(attpon\.online|www\.attpon\.online)$/,
        credentials: false,
      }),
    )
    // 100/นาที/ต่อ IP ต่ำเกินไปสำหรับการใช้งานจริง (admin dashboard + หน้าจัดการหลายรายการ)
    // และทำให้ e2e suite ล้ม (ทุก request จาก IP เดียว ::1) — 1000/นาที กัน abuse ได้พอสมควร
    .use(rateLimit({ max: 1000, duration: 60_000 }))
    .use(
      openapi({
        enabled: isDev,
        documentation: {
          info: {
            title: "Library LMS API",
            version: "0.1.0",
            description: "ระบบห้องสมุด Library LMS — admin backoffice API",
          },
        },
      }),
    )
    .onError(({ code, error, set }) => {
      const httpError = toHttpError(error, code);
      set.status = httpError.statusCode;
      return httpError.body;
    })
    .use(appModule);

  // Workers ไม่มี filesystem — mount /uploads/* เฉพาะ driver=local (Bun)
  if (mountUploadsRoute) {
    app.use(createUploadsRoute(UPLOADS_ROOT));
  }

  return app;
}
