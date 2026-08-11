import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/src/__tests__/integration/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // shared real DB — run files sequentially to avoid cross-file data collisions
    fileParallelism: false,
  },
});
