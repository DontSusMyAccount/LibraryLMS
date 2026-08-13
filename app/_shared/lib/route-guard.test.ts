import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  MATCHER_PATHS,
  isBackofficeRole,
  isProtectedPath,
  resolveHomeByRole,
  resolveRouteGuard,
} from "./route-guard";

function matchesGlob(pattern: string, pathname: string): boolean {
  const wildcardSuffix = "/:path*";
  if (pattern.endsWith(wildcardSuffix)) {
    const base = pattern.slice(0, -wildcardSuffix.length);
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  return pathname === pattern;
}

/** matcher ของ middleware.ts เป็น literal (Turbopack อ่านค่าคงที่ข้ามไฟล์ไม่ได้) — ต้องตรงตาม MATCHER_PATHS */
function middlewareMatcher(): string[] {
  const source = readFileSync(path.resolve("middleware.ts"), "utf8");
  const match = source.match(/matcher:\s*\[([\s\S]*?)\]/);
  if (!match) {
    throw new Error("ไม่พบ matcher literal ใน middleware.ts");
  }
  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

describe("isProtectedPath", () => {
  it("คืน true สำหรับ path ที่ต้องการ login (exact match)", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
  });

  it("คืน true สำหรับ subpath ของ protected path", () => {
    expect(isProtectedPath("/members/abc-123")).toBe(true);
  });

  it("คืน true สำหรับหน้า /my-loans (ฝั่งผู้ยืม)", () => {
    expect(isProtectedPath("/my-loans")).toBe(true);
    expect(isProtectedPath("/my-loans/history")).toBe(true);
  });

  it("คืน true สำหรับหน้า /profile และ /settings (backoffice ใหม่)", () => {
    expect(isProtectedPath("/profile")).toBe(true);
    expect(isProtectedPath("/settings")).toBe(true);
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

describe("isBackofficeRole", () => {
  it("admin/librarian = backoffice role", () => {
    expect(isBackofficeRole("admin")).toBe(true);
    expect(isBackofficeRole("librarian")).toBe(true);
  });

  it("faculty/staff/student = ไม่ใช่ backoffice role", () => {
    expect(isBackofficeRole("faculty")).toBe(false);
    expect(isBackofficeRole("staff")).toBe(false);
    expect(isBackofficeRole("student")).toBe(false);
  });
});

describe("resolveHomeByRole", () => {
  it("admin/librarian → /dashboard", () => {
    expect(resolveHomeByRole("admin")).toBe("/dashboard");
    expect(resolveHomeByRole("librarian")).toBe("/dashboard");
  });

  it("faculty/staff/student → /my-loans", () => {
    expect(resolveHomeByRole("faculty")).toBe("/my-loans");
    expect(resolveHomeByRole("staff")).toBe("/my-loans");
    expect(resolveHomeByRole("student")).toBe("/my-loans");
  });

  it("undefined role (ไม่มีข้อมูล session) → /my-loans (safe fallback)", () => {
    expect(resolveHomeByRole(undefined)).toBe("/my-loans");
  });
});

describe("resolveRouteGuard", () => {
  it("redirect ไป /login เมื่อเข้าหน้า protected โดยยังไม่ login", () => {
    expect(resolveRouteGuard("/catalog", false)).toBe("/login");
    expect(resolveRouteGuard("/members", false)).toBe("/login");
    expect(resolveRouteGuard("/my-loans", false)).toBe("/login");
    expect(resolveRouteGuard("/profile", false)).toBe("/login");
    expect(resolveRouteGuard("/settings", false)).toBe("/login");
  });

  it("login แล้วเข้า /login → redirect ตาม role (admin → /dashboard)", () => {
    expect(resolveRouteGuard("/login", true, "admin")).toBe("/dashboard");
    expect(resolveRouteGuard("/login", true, "librarian")).toBe("/dashboard");
  });

  it("login แล้วเข้า /login → redirect ตาม role (student → /my-loans)", () => {
    expect(resolveRouteGuard("/login", true, "student")).toBe("/my-loans");
    expect(resolveRouteGuard("/login", true, "faculty")).toBe("/my-loans");
  });

  it("คืน null เมื่อ login แล้วเข้า protected path ของตัวเอง", () => {
    expect(resolveRouteGuard("/catalog", true, "admin")).toBeNull();
    expect(resolveRouteGuard("/my-loans", true, "student")).toBeNull();
  });

  it("student เข้าหน้า backoffice → redirect กลับ /my-loans", () => {
    expect(resolveRouteGuard("/catalog", true, "student")).toBe("/my-loans");
    expect(resolveRouteGuard("/members", true, "faculty")).toBe("/my-loans");
    expect(resolveRouteGuard("/profile", true, "student")).toBe("/my-loans");
    expect(resolveRouteGuard("/settings", true, "student")).toBe("/my-loans");
  });

  it("คืน null เมื่อยังไม่ login เข้า /login", () => {
    expect(resolveRouteGuard("/login", false)).toBeNull();
  });

  it("คืน null สำหรับ path ที่ไม่อยู่ในระบบ (เช่น root)", () => {
    expect(resolveRouteGuard("/", false)).toBeNull();
  });
});

describe("MATCHER_PATHS", () => {
  it("ครอบ protected path ทั้งหมด + /login", () => {
    expect(MATCHER_PATHS).toEqual([
      "/dashboard/:path*",
      "/catalog/:path*",
      "/circulation/:path*",
      "/reservations/:path*",
      "/members/:path*",
      "/profile/:path*",
      "/settings/:path*",
      "/my-loans/:path*",
      "/login",
    ]);
  });

  it("matcher ไม่ครอบ /api", () => {
    for (const pattern of MATCHER_PATHS) {
      expect(matchesGlob(pattern, "/api")).toBe(false);
      expect(matchesGlob(pattern, "/api/auth/nextauth")).toBe(false);
    }
  });

  it("matcher literal ใน middleware.ts ตรงกับ MATCHER_PATHS (กันสำเนาหลุด sync)", () => {
    expect(middlewareMatcher()).toEqual([...MATCHER_PATHS]);
  });

  it("matcher ครอบ protected path และ /login ตาม semantics ของ :path*", () => {
    expect(matchesGlob("/members/:path*", "/members")).toBe(true);
    expect(matchesGlob("/members/:path*", "/members/abc-123")).toBe(true);
    expect(matchesGlob("/my-loans/:path*", "/my-loans")).toBe(true);
    expect(matchesGlob("/login", "/login")).toBe(true);
    expect(matchesGlob("/login", "/login/foo")).toBe(false);
  });
});
