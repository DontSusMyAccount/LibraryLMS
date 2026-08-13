import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/src/__tests__/security/**/*.test.ts"],
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
