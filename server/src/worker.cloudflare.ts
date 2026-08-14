import { createAppFromEnv } from "./app";
import { SERVERLESS_DB_OPTIONS } from "./libs/db";

/**
 * Cloudflare Workers entry point (แทน worker.ts ที่ใช้ Bun TCP)
 * - env มาจาก fetch handler binding ไม่ใช่ process.env
 * - DATABASE_URL อ่านจาก Hyperdrive binding (CF proxy → Neon) ถ้ามี
 * - สร้าง app + DB client ใหม่ทุก request (ห้าม cache เป็น global —
 *   connection ที่สร้างใน request หนึ่งถูก request ถัดไปใช้ไม่ได้:
 *   "Cannot perform I/O on behalf of a different request")
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

/** ขั้นต่ำที่ fetch handler ใช้ — รอ async work (ปิด connection) หลัง response */
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
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
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    // สร้าง app + DB client ใหม่ทุก request (ตามคำแนะนำ Cloudflare Hyperdrive:
    // อย่า cache client ใน global — I/O object ของ request หนึ่งใช้ข้าม request ไม่ได้)
    // Hyperdrive จัดการ connection pooling ให้ฝั่ง server แล้ว ต้นทุน ~2ms/request
    const { app, dbConnection } = createAppFromEnv(toEnvRecord(env), SERVERLESS_DB_OPTIONS);
    try {
      const response = await app.fetch(stripApiPrefix(request));
      // ปิด connection หลัง response ถูกสร้าง — client เป็น per-request ถ้าไม่ปิดจะค้าง
      // ใน isolate ชน Workers limit concurrent external connections (~6) → 503
      ctx.waitUntil(dbConnection.client.end().catch(() => {}));
      return response;
    } catch (err) {
      ctx.waitUntil(dbConnection.client.end().catch(() => {}));
      throw err;
    }
  },
};
