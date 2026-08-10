import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";

import { createDatabaseClient } from "./libs/db";
import { parseEnv } from "./libs/env";
import type { Env } from "./libs/env";
import { toHttpError } from "./libs/http-error.factory";
import { createAppModule } from "./modules/app.module";
import type { R2StorageConfig } from "./modules/storage/adapters/repository/r2.storage.repository";
import { createUploadsRoute } from "./modules/storage/uploads.route";

const isDev = process.env.NODE_ENV !== "production";

const UPLOADS_ROOT = "uploads";

function resolveR2Config(env: Env): R2StorageConfig | undefined {
  if (env.storageDriver !== "r2") {
    return undefined;
  }
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = env.R2_BUCKET_NAME?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return undefined;
  }
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: env.R2_PUBLIC_URL,
  };
}

const env = parseEnv(process.env);
const { db } = createDatabaseClient(env.DATABASE_URL);

const appModuleDeps = {
  db,
  jwtSecret: env.JWT_SECRET,
  internalSecret: env.INTERNAL_SECRET,
  storageDriver: env.storageDriver,
  r2Config: resolveR2Config(env),
  uploadRoot: UPLOADS_ROOT,
};
const appModule = createAppModule(appModuleDeps);

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
  .use(appModule)
  .use(createUploadsRoute(UPLOADS_ROOT))
  .onError(({ code, error, set }) => {
    const httpError = toHttpError(error, code);
    set.status = httpError.statusCode;
    return httpError.body;
  });

export type App = typeof app;
