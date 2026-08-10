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

  it("STORAGE_DRIVER default เป็น r2 เมื่อ R2_* ครบ", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/library_lms",
      AUTH_SECRET: "a".repeat(32),
      INTERNAL_SECRET: "b".repeat(16),
      R2_ACCOUNT_ID: "acc",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "s".repeat(32),
      R2_BUCKET_NAME: "covers",
    });
    expect(env.storageDriver).toBe("r2");
  });

  it("STORAGE_DRIVER default เป็น local เมื่อ R2_* ไม่ครบ", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/library_lms",
      AUTH_SECRET: "a".repeat(32),
      INTERNAL_SECRET: "b".repeat(16),
      R2_ACCOUNT_ID: "acc",
    });
    expect(env.storageDriver).toBe("local");
  });

  it("STORAGE_DRIVER=local มีผลแม้ R2_* ครบ", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/library_lms",
      AUTH_SECRET: "a".repeat(32),
      INTERNAL_SECRET: "b".repeat(16),
      R2_ACCOUNT_ID: "acc",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "s".repeat(32),
      R2_BUCKET_NAME: "covers",
      STORAGE_DRIVER: "local",
    });
    expect(env.storageDriver).toBe("local");
  });

  it("STORAGE_DRIVER=r2 ตั้งชัดเจนมีผล แม้ R2_* ไม่ครบ", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/library_lms",
      AUTH_SECRET: "a".repeat(32),
      INTERNAL_SECRET: "b".repeat(16),
      STORAGE_DRIVER: "r2",
    });
    expect(env.storageDriver).toBe("r2");
  });

  it("STORAGE_DRIVER ค่าที่ไม่อนุญาตจะถูกปฏิเสธ", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgresql://u:p@localhost:5432/library_lms",
        AUTH_SECRET: "a".repeat(32),
        INTERNAL_SECRET: "b".repeat(16),
        STORAGE_DRIVER: "s3",
      }),
    ).toThrowError(/STORAGE_DRIVER/);
  });
});
