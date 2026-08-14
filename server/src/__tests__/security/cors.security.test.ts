import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.factory";
import { createAppModule } from "../../modules/app.module";

/**
 * CORS — prod ต้องไม่สะท้อน origin อื่นกลับ (เดิม default @elysiajs/cors สะท้อน
 * ทุก origin + credentials:true → attacker site อ่าน response ของ API ได้โดยตรง)
 *
 * หมายเหตุ: ใช้ buildApp({ isDev: false }) จำลอง production (NODE_ENV ยังไม่ใช่
 * production ใน vitest) — frontend จริงเรียก API ผ่าน BFF same-origin เสมอ
 * CORS คือ defense ชั้นนอกสำหรับคนที่พยายามเรียก API เว็บโดยตรง
 */

const FAKE_DEPS = {
  db: {} as never,
  jwtSecret: "jwt-secret-xxxxxxxxxxxxxxxxxxxxxxxxxx",
  internalSecret: "internal-secret-xxxxxxxx",
  storageDriver: "local" as const,
  uploadRoot: "uploads",
};

// จำลอง worker ที่รันด้วย NODE_ENV=production
const prodApp = buildApp(createAppModule(FAKE_DEPS), { isDev: false });
const devApp = buildApp(createAppModule(FAKE_DEPS), { isDev: true });

function corsRequest(app: typeof prodApp, origin: string, path = "/health") {
  return app.handle(
    new Request(`http://localhost${path}`, {
      headers: {
        origin,
        "x-internal-secret": "internal-secret-xxxxxxxx",
      },
    }),
  );
}

describe("CORS — prod จำกัด origin เฉพาะ attpon.online", () => {
  it("origin https://attpon.online → ได้ Allow-Origin เท่ากับ origin", async () => {
    const response = await corsRequest(prodApp, "https://attpon.online");
    expect(response.headers.get("access-control-allow-origin")).toBe("https://attpon.online");
  });

  it("origin https://www.attpon.online → ได้ Allow-Origin", async () => {
    const response = await corsRequest(prodApp, "https://www.attpon.online");
    expect(response.headers.get("access-control-allow-origin")).toBe("https://www.attpon.online");
  });

  it("origin https://evil.example → ไม่มี Allow-Origin (browser บล็อกเอง)", async () => {
    const response = await corsRequest(prodApp, "https://evil.example");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("origin ที่เป็น subdomain ไม่ตรงรูปแบบ (https://evil.attpon.online) → ไม่มี Allow-Origin", async () => {
    const response = await corsRequest(prodApp, "https://evil.attpon.online");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("prod ไม่ตั้ง allow-credentials (ห้าม cross-origin ใช้ cookie)", async () => {
    const response = await corsRequest(prodApp, "https://attpon.online");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });

  it("dev mode ยัง allow localhost (e2e/eden เรียกตรงได้)", async () => {
    const response = await corsRequest(devApp, "http://localhost:3001");
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3001");
  });
});
