import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { type AnyElysia, Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";

import { toHttpError } from "./libs/http-error.factory";
import { createUploadsRoute } from "./modules/storage/uploads.route";

const isDev = process.env.NODE_ENV !== "production";

export const UPLOADS_ROOT = "uploads";

export function buildApp<T extends AnyElysia>(appModule: T) {
  return new Elysia()
    .use(cors())
    .use(rateLimit({ max: 100, duration: 60_000 }))
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
    .use(appModule)
    .use(createUploadsRoute(UPLOADS_ROOT));
}
