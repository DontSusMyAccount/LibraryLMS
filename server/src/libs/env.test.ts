import { describe, it, expect } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("throws เมื่อ DATABASE_URL/AUTH_SECRET/INTERNAL_SECRET ขาด", () => {
    expect(() => parseEnv({})).toThrowError(/DATABASE_URL/);
  });
  it("parse ค่าครบแล้วคืน typed env", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/library_lms",
      PORT: "3001",
      AUTH_SECRET: "x".repeat(32),
      INTERNAL_SECRET: "y".repeat(16),
      NEXT_PUBLIC_API_URL: "http://localhost:3001",
    });
    expect(env.PORT).toBe(3001);
  });
});
