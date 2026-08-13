import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.factory";
import { createAppModule } from "../../modules/app.module";

const JWT_SECRET = "jwt-secret-".padEnd(32, "x");
const INTERNAL_SECRET = "internal-secret-".padEnd(16, "x");

const deps = {
  db: {} as unknown as PostgresJsDatabase,
  jwtSecret: JWT_SECRET,
  internalSecret: INTERNAL_SECRET,
  storageDriver: "local" as const,
  uploadRoot: "uploads",
};

const app = buildApp(createAppModule(deps));

async function handleRequest(path: string, init?: RequestInit) {
  const response = await app.handle(new Request(`http://localhost${path}`, init));
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe("app boot wiring", () => {
  it("GET /health => 200", async () => {
    const { status, body } = await handleRequest("/health");

    expect(status).toBe(200);
    expect(body).toEqual({ success: true, data: { status: "ok" } });
  });

  it("route ที่ต้อง auth แต่ไม่มี header => 401 envelope", async () => {
    const { status, body } = await handleRequest("/auth/me");

    expect(status).toBe(401);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  it("users route ที่ต้อง auth แต่ไม่มี header => 401 envelope (regression: onError order)", async () => {
    const { status, body } = await handleRequest("/users/search?q=test");

    expect(status).toBe(401);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  it("unknown route => 404 envelope", async () => {
    const { status, body } = await handleRequest("/does-not-exist");

    expect(status).toBe(404);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  it("body ไม่ถูกต้อง => 422 envelope", async () => {
    const { status, body } = await handleRequest("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(status).toBe(422);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
  });
});
