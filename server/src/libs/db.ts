import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

export interface DbConnection {
  client: Sql;
  db: PostgresJsDatabase;
}

export function createDatabaseClient(url: string): DbConnection {
  // Serverless-friendly pool options (Cloudflare Workers + Hyperdrive):
  // - max: 1          client นี้เป็น per-request — ใช้ connection เดียวพอ
  // - idle_timeout    ปิด socket idle เร็ว ๆ — client ใหม่ทุก request ถ้าค้างนาน
  //                   จะกอง connection ชน Workers limit concurrent external (~6) → 503
  // - connect_timeout จำกัดเวลารอเชื่อมต่อ
  const client = postgres(url, {
    // prepare: true — Hyperdrive cache prepared statement + query result;
    // false ใช้กับ transaction pooling (Supabase/Neon) เท่านั้น ไม่ใช่กรณีนี้
    // (ถ้าเจอ error "prepared statement already exists" ใน prod ให้กลับไป false)
    prepare: true,
    // fetch_types: false — schema เป็น scalar/enum/jsonb ไม่มี array type
    // → ข้าม type fetch ตอน connect ประหยัด 1 round-trip ต่อ connection
    fetch_types: false,
    max: 1,
    idle_timeout: 1,
    connect_timeout: 10,
  });
  return { client, db: drizzle(client) };
}
