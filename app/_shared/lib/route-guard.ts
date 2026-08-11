import { ROUTES } from "@/app/_shared/constants/routes";

export const PROTECTED_PATHS = [
  "/dashboard",
  "/catalog",
  "/circulation",
  "/reservations",
  "/members",
] as const;

export const MATCHER_PATHS: string[] = [
  ...PROTECTED_PATHS.map((path) => `${path}/:path*`),
  ROUTES.AUTH_SIGNIN,
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function resolveRouteGuard(pathname: string, isLoggedIn: boolean): string | null {
  if (isProtectedPath(pathname) && !isLoggedIn) {
    return ROUTES.AUTH_SIGNIN;
  }
  if (pathname === ROUTES.AUTH_SIGNIN && isLoggedIn) {
    return ROUTES.DASHBOARD;
  }
  return null;
}
