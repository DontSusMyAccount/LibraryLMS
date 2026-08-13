import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["app/**/*.test.{ts,tsx}", "components/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": resolve(rootDir, "."),
      "@libsys/shared": resolve(rootDir, "server/src/shared.ts"),
    },
  },
});
