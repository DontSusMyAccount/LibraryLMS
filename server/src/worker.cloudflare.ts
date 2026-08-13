import { createAppFromEnv } from "./app";
import type { App } from "./app";

/**
 * Cloudflare Workers entry point (แทน worker.ts ที่ใช้ Bun TCP)
 * - env มาจาก fetch handler binding ไม่ใช่ process.env
 * - DATABASE_URL อ่านจาก Hyperdrive binding (CF proxy → Neon) ถ้ามี
 * - สร้าง app แบบ lazy ครั้งเดียวต่อ isolate แล้ว cache ไว้ (DB client มี state)
 */

// Elysia compile request handler ด้วย Function() constructor (aot) โดย default
// ซึ่ง Workers runtime ห้าม ("Code generation from strings disallowed") —
// ปิด aot ให้ใช้ createDynamicHandler แทน (อ่านจาก process.env ทุก instance)
process.env.ELYSIA_AOT = "false";

interface HyperdriveBinding {
  connectionString: string;
}

export interface WorkerEnv {
  HYPERDRIVE?: HyperdriveBinding;
  DATABASE_URL?: string;
  AUTH_SECRET?: string;
  INTERNAL_SECRET?: string;
  JWT_SECRET?: string;
  NEXT_PUBLIC_API_URL?: string;
  NODE_ENV?: string;
  STORAGE_DRIVER?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_URL?: string;
}

function toEnvRecord(env: WorkerEnv): Record<string, string | undefined> {
  return {
    DATABASE_URL: env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL,
    AUTH_SECRET: env.AUTH_SECRET,
    INTERNAL_SECRET: env.INTERNAL_SECRET,
    JWT_SECRET: env.JWT_SECRET,
    NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL,
    NODE_ENV: env.NODE_ENV,
    STORAGE_DRIVER: env.STORAGE_DRIVER,
    R2_ACCOUNT_ID: env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: env.R2_PUBLIC_URL,
  };
}

let cachedApp: App | undefined;

function getApp(env: WorkerEnv): App {
  if (!cachedApp) {
    cachedApp = createAppFromEnv(toEnvRecord(env));
  }
  return cachedApp;
}

const API_ROUTE_PREFIX = "/api-backend";

/** ตัด prefix /api-backend ออกจาก pathname (web worker เรียกผ่าน BFF proxy ด้วย apiUrl + path) */
function stripApiPrefix(request: Request): Request {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(API_ROUTE_PREFIX)) {
    return request;
  }
  const strippedUrl = new URL(request.url);
  strippedUrl.pathname = url.pathname.slice(API_ROUTE_PREFIX.length) || "/";
  return new Request(strippedUrl.toString(), request);
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const app = getApp(env);
    return app.fetch(stripApiPrefix(request));
  },
};
