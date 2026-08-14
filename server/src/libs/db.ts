import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

export interface DbConnection {
  client: Sql;
  db: PostgresJsDatabase;
}

export function createDatabaseClient(url: string): DbConnection {
  // Serverless-friendly pool options:
  // - max: 1          Hyperdrive multiplexes อยู่แล้ว — pool ใหญ่แค่มี socket ตายกระจาย
  // - idle_timeout    ปิด socket idle เร็ว ๆ กัน socket ตายคา pool ตอน isolate freeze
  // - connect_timeout จำกัดเวลารอเชื่อมต่อ
  // - max_lifetime    หมุน socket ก่อนมันค้างนานเกิน (isolate freeze ไม่มี chance ได้ cleanup)
  const client = postgres(url, {
    prepare: false,
    max: 1,
    idle_timeout: 15,
    connect_timeout: 10,
    max_lifetime: 120,
  });
  return { client, db: drizzle(client) };
}
