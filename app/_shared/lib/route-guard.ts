import { ROUTES } from "@/app/_shared/constants/routes";
import type { UserRole } from "@libsys/shared";

/** path ที่เป็น backoffice — มีเฉพาะ admin/librarian */
export const BACKOFFICE_PATHS = [
  "/dashboard",
  "/catalog",
  "/circulation",
  "/reservations",
  "/members",
  "/profile",
  "/settings",
] as const;

/** path ฝั่งผู้ยืม (student/faculty/staff portal) */
export const BORROWER_PATHS = ["/my-loans"] as const;

export const PROTECTED_PATHS = [...BACKOFFICE_PATHS, ...BORROWER_PATHS] as const;

export const MATCHER_PATHS: string[] = [
  ...PROTECTED_PATHS.map((path) => `${path}/:path*`),
  ROUTES.AUTH_SIGNIN,
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isBackofficePath(pathname: string): boolean {
  return BACKOFFICE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const BACKOFFICE_ROLES: readonly UserRole[] = ["admin", "librarian"];

export function isBackofficeRole(role: UserRole): boolean {
  return BACKOFFICE_ROLES.includes(role);
}

/** หน้าแรกตามบทบาท — admin/librarian ไป dashboard, ผู้ยืมไป /my-loans */
export function resolveHomeByRole(role: UserRole | undefined): string {
  return role !== undefined && isBackofficeRole(role) ? ROUTES.DASHBOARD : ROUTES.MY_LOANS;
}

export function resolveRouteGuard(
  pathname: string,
  isLoggedIn: boolean,
  role?: UserRole,
): string | null {
  if (isProtectedPath(pathname) && !isLoggedIn) {
    return ROUTES.AUTH_SIGNIN;
  }
  if (pathname === ROUTES.AUTH_SIGNIN && isLoggedIn) {
    return resolveHomeByRole(role);
  }
  // ผู้ยืมพยายามเข้าหน้า backoffice → กลับหน้า home ของตัวเอง
  if (isLoggedIn && role !== undefined && isBackofficePath(pathname) && !isBackofficeRole(role)) {
    return resolveHomeByRole(role);
  }
  return null;
}
