import { execSync } from "node:child_process";
import path from "node:path";

/**
 * globalSetup — seed ข้อมูล e2e ผ่าน bun script
 * bun โหลด .env เอง (เหมือน db:seed) จึงไม่ต้องพึ่ง env ของ process ปัจจุบัน
 */
export default function globalSetup(): void {
  const root = path.resolve(__dirname, "..");
  execSync("bun run server/src/e2e/fixtures.ts", {
    cwd: root,
    stdio: "inherit",
    encoding: "utf8",
  });
}
