import { defineConfig } from "drizzle-kit";

import { parseEnv } from "./server/src/libs/env";

function resolveDatabaseUrl(processEnv: Record<string, string | undefined>): string {
  try {
    return parseEnv(processEnv).DATABASE_URL;
  } catch {
    const fallbackUrl = processEnv.DATABASE_URL;
    if (fallbackUrl === undefined) {
      throw new Error(
        "DATABASE_URL is required to run drizzle-kit commands (set it in .env or the environment)",
      );
    }
    return fallbackUrl;
  }
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/src/infrastructure/database/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: resolveDatabaseUrl(process.env as Record<string, string | undefined>),
  },
  // quirk: db:push กับ DB ที่ setup มาก่อน (เช่น Render/Neon) อาจ fail
  // "column id is in a primary key" (SQLSTATE 42P16) — เป็น diff ระหว่าง
  // drizzle-kit กับ constraint เดิม ไม่เกี่ยวกับ schema นี้
  // ถ้าเจอ ให้รัน statements ใน drizzle/<latest>.sql ตรงๆ แทน db:push
});
