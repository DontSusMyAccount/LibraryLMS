import { auth } from "@/auth";
import { resolveRouteGuard } from "@/app/_shared/lib/route-guard";
import { NextResponse } from "next/server";

// matcher ต้องเป็น static literal (Turbopack อ่านค่าคงที่ข้ามไฟล์ไม่ได้)
// ต้องตรงกับ BACKOFFICE_PATHS + BORROWER_PATHS + ROUTES.AUTH_SIGNIN ใน route-guard
// — route-guard.test.ts ตรวจยืนยันความตรงกันของ MATCHER_PATHS ไว้แล้ว
export default auth((req) => {
  const user = req.auth?.user;
  const redirectPath = resolveRouteGuard(req.nextUrl.pathname, Boolean(user), user?.role);
  if (!redirectPath) {
    return undefined;
  }
  return NextResponse.redirect(new URL(redirectPath, req.nextUrl));
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/catalog/:path*",
    "/circulation/:path*",
    "/reservations/:path*",
    "/members/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/my-loans/:path*",
    "/login",
  ],
};
