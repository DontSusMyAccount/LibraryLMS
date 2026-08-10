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

  it("JWT_SECRET fallback เป็น AUTH_SECRET เมื่อไม่ได้ตั้ง", () => {
    const authSecret = "a".repeat(32);
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/library_lms",
      AUTH_SECRET: authSecret,
      INTERNAL_SECRET: "b".repeat(16),
    });
    expect(env.JWT_SECRET).toBe(authSecret);
  });

  it("JWT_SECRET ที่ตั้งเองจะไม่ fallback ไป AUTH_SECRET", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/library_lms",
      AUTH_SECRET: "a".repeat(32),
      JWT_SECRET: "c".repeat(32),
      INTERNAL_SECRET: "b".repeat(16),
    });
    expect(env.JWT_SECRET).toBe("c".repeat(32));
  });

  it("JWT_SECRET ที่สั้นกว่า 32 ตัวอักษรจะถูกปฏิเสธ", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgresql://u:p@localhost:5432/library_lms",
        AUTH_SECRET: "a".repeat(32),
        JWT_SECRET: "short",
        INTERNAL_SECRET: "b".repeat(16),
      }),
    ).toThrowError(/JWT_SECRET/);
  });
});
