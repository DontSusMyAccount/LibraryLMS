import { describe, expect, it } from "vitest";

import { MATCHER_PATHS, isProtectedPath, resolveRouteGuard } from "./route-guard";

function matchesGlob(pattern: string, pathname: string): boolean {
  const wildcardSuffix = "/:path*";
  if (pattern.endsWith(wildcardSuffix)) {
    const base = pattern.slice(0, -wildcardSuffix.length);
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  return pathname === pattern;
}

describe("isProtectedPath", () => {
  it("คืน true สำหรับ path ที่ต้องการ login (exact match)", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
  });

  it("คืน true สำหรับ subpath ของ protected path", () => {
    expect(isProtectedPath("/members/abc-123")).toBe(true);
  });

  it("คืน false สำหรับ /login", () => {
    expect(isProtectedPath("/login")).toBe(false);
  });

  it("คืน false สำหรับ /api/*", () => {
    expect(isProtectedPath("/api/backend/books")).toBe(false);
  });

  it("คืน false สำหรับ root path", () => {
    expect(isProtectedPath("/")).toBe(false);
  });

  it("คืน false สำหรับ path ที่แค่มี prefix คล้ายกัน (prefix trap)", () => {
    expect(isProtectedPath("/dashboardx")).toBe(false);
  });
});

describe("resolveRouteGuard", () => {
  it("redirect ไป /login เมื่อเข้าหน้า protected โดยยังไม่ login", () => {
    expect(resolveRouteGuard("/catalog", false)).toBe("/login");
    expect(resolveRouteGuard("/members", false)).toBe("/login");
  });

  it("redirect ไป /dashboard เมื่อ login แล้วเข้า /login", () => {
    expect(resolveRouteGuard("/login", true)).toBe("/dashboard");
  });

  it("คืน null เมื่อ login แล้วเข้า protected path", () => {
    expect(resolveRouteGuard("/catalog", true)).toBeNull();
  });

  it("คืน null เมื่อยังไม่ login เข้า /login", () => {
    expect(resolveRouteGuard("/login", false)).toBeNull();
  });

  it("คืน null สำหรับ path ที่ไม่อยู่ในระบบ (เช่น root)", () => {
    expect(resolveRouteGuard("/", false)).toBeNull();
  });
});

describe("MATCHER_PATHS", () => {
  it("ครอบ protected path ทั้ง 5 + /login", () => {
    expect(MATCHER_PATHS).toEqual([
      "/dashboard/:path*",
      "/catalog/:path*",
      "/circulation/:path*",
      "/reservations/:path*",
      "/members/:path*",
      "/login",
    ]);
  });

  it("matcher ไม่ครอบ /api", () => {
    for (const pattern of MATCHER_PATHS) {
      expect(matchesGlob(pattern, "/api")).toBe(false);
      expect(matchesGlob(pattern, "/api/auth/nextauth")).toBe(false);
    }
  });

  it("matcher ครอบ protected path และ /login ตาม semantics ของ :path*", () => {
    expect(matchesGlob("/members/:path*", "/members")).toBe(true);
    expect(matchesGlob("/members/:path*", "/members/abc-123")).toBe(true);
    expect(matchesGlob("/login", "/login")).toBe(true);
    expect(matchesGlob("/login", "/login/foo")).toBe(false);
  });
});
