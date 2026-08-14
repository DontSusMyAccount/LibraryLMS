import { createDatabaseClient } from "../libs/db";
import { parseEnv } from "../libs/env";

/**
 * เปิด extension ที่ schema ต้องใช้ก่อน drizzle push
 * - pg_trgm: index gin_trgm_ops (users.full_name / users.email — idx_users_*_trgm)
 * - pgcrypto: uuid_generate ฯลฯ (ดู server/src/infrastructure/database/triggers.sql)
 *
 * รันผ่าน `bun run db:extensions` — ใช้ใน CI ก่อน db:push และตอนตั้ง DB ใหม่
 */
async function main(): Promise<void> {
  const env = parseEnv(process.env as Record<string, string | undefined>);
  const { client } = createDatabaseClient(env.DATABASE_URL);

  try {
    await client.unsafe(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
    `);
    console.log("[extensions] pgcrypto + pg_trgm พร้อมใช้งาน");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("[extensions] ผิดพลาด:", error);
  process.exit(1);
});
