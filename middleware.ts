import { auth } from "@/auth";
import { MATCHER_PATHS, resolveRouteGuard } from "@/app/_shared/lib/route-guard";
import { NextResponse } from "next/server";

export default auth((req) => {
  const redirectPath = resolveRouteGuard(req.nextUrl.pathname, Boolean(req.auth?.user));
  if (!redirectPath) {
    return undefined;
  }
  return NextResponse.redirect(new URL(redirectPath, req.nextUrl));
});

export const config = { matcher: MATCHER_PATHS };
