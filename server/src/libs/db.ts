import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

export interface DbConnection {
  client: Sql;
  db: PostgresJsDatabase;
}

export interface DbClientOptions {
  prepare?: boolean;
  fetch_types?: boolean;
  max?: number;
  idle_timeout?: number;
  connect_timeout?: number;
}

/**
 * Serverless (Cloudflare Workers + Hyperdrive): client สร้างใหม่ทุก request
 * - prepare: true — Hyperdrive cache prepared statement + query result;
 *   false ใช้กับ transaction pooling (Supabase/Neon) เท่านั้น ไม่ใช่กรณีนี้
 *   (ถ้าเจอ error "prepared statement already exists" ใน prod ให้กลับไป false)
 * - fetch_types: false — schema เป็น scalar/enum/jsonb ไม่มี array type
 *   → ข้าม type fetch ตอน connect ประหยัด 1 round-trip ต่อ connection
 * - max: 1          client นี้เป็น per-request — ใช้ connection เดียวพอ
 * - idle_timeout    ปิด socket idle เร็ว ๆ — client ใหม่ทุก request ถ้าค้างนาน
 *                   จะกอง connection ชน Workers limit concurrent external (~6) → 503
 */
export const SERVERLESS_DB_OPTIONS: DbClientOptions = {
  prepare: true,
  fetch_types: false,
  max: 1,
  idle_timeout: 1,
  connect_timeout: 10,
};

/** Persistent (Bun on Render): process อยู่ยาว — ใช้ pool ปกติ (postgres.js default max 10, idle_timeout 0) */
export const PERSISTENT_DB_OPTIONS: DbClientOptions = {
  prepare: true,
  fetch_types: false,
  connect_timeout: 10,
};

export function createDatabaseClient(
  url: string,
  options: DbClientOptions = SERVERLESS_DB_OPTIONS,
): DbConnection {
  const client = postgres(url, options);
  return { client, db: drizzle(client) };
}
