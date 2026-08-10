import { defineConfig } from "vitest/config";

import baseConfig from "./vitest.config";

export default defineConfig({
  ...baseConfig,
  test: {
    environment: baseConfig.test?.environment ?? "node",
    include: ["server/src/__tests__/**/*.test.ts"],
  },
});
