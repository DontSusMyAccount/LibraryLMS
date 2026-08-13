import { buildApp, UPLOADS_ROOT } from "./app.factory";
import { createDatabaseClient } from "./libs/db";
import { parseEnv } from "./libs/env";
import type { Env } from "./libs/env";
import { createAppModule } from "./modules/app.module";
import type { R2StorageConfig } from "./modules/storage/adapters/repository/r2.storage.repository";

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

/**
 * สร้าง Elysia app จาก env record (ไม่แตะ process.env — ใช้ได้ทั้ง Bun และ Cloudflare Workers)
 * สำหรับ Bun: worker.ts เรียกตอน module load แล้ว app.listen()
 * สำหรับ Workers: worker.cloudflare.ts เรียกแบบ lazy ใน fetch handler
 */
export function createAppFromEnv(envInput: Record<string, string | undefined>) {
  const env = parseEnv(envInput);
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

  return buildApp(appModule, {
    isDev: envInput.NODE_ENV !== "production",
    mountUploadsRoute: env.storageDriver === "local",
  });
}

export type App = ReturnType<typeof createAppFromEnv>;
