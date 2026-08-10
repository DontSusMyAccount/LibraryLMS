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
});
