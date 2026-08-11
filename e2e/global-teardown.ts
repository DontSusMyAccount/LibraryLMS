import { execSync } from "node:child_process";
import path from "node:path";

/**
 * globalTeardown — ลบข้อมูล e2e ที่ seed ไว้ (ล้างให้ DB สะอาด)
 */
export default function globalTeardown(): void {
  const root = path.resolve(__dirname, "..");
  execSync("bun run server/src/e2e/fixtures.ts --cleanup", {
    cwd: root,
    stdio: "inherit",
    encoding: "utf8",
  });
}
