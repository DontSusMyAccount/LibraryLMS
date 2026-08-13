import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (Playwright) — รันผ่าน `bun run test:e2e`
 *
 * - webServer: `bun run dev` (รัน web:3000 + api:3001 พร้อมกัน)
 *   reuseExistingServer: true → ถ้ามี dev อยู่แล้วจะ reuse (ไม่เปิดซ้อน)
 * - globalSetup/globalTeardown: seed + cleanup ข้อมูล e2e ผ่าน bun script
 *   (bun โหลด .env เอง — playwright ไม่ต้องแตะ env เลย)
 * - workers: 1 + fullyParallel: false — ข้อมูลแชร์ DB จริงต้องรันตามลำดับ
 */

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
});
