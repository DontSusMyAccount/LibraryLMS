import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { rateLimit } from "elysia-rate-limit";
import { toHttpError } from "./libs/http-error.factory";

const isDev = process.env.NODE_ENV !== "production";

export const app = new Elysia()
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
  .onError(({ error, set }) => {
    const httpError = toHttpError(error);
    set.status = httpError.statusCode;
    return httpError.body;
  });

export type App = typeof app;
