import type { MemberType, UserRole } from "@libsys/shared";

const RENEWALS_FALLBACK: Record<string, number> = {
  "admin:general": 10,
  "librarian:general": 6,
  "faculty:general": 6,
  "staff:general": 4,
  "student:undergraduate": 2,
  "student:graduate": 3,
};

export function resolveMaxRenewals(role: UserRole, memberType: MemberType): number {
  const exact = RENEWALS_FALLBACK[`${role}:${memberType}`];
  if (exact != null) {
    return exact;
  }
  return RENEWALS_FALLBACK[`${role}:general`] ?? 0;
}

export function isRenewDisabled(
  renewedCount: number,
  maxRenewals: number,
  hasActiveReservation: boolean,
): boolean {
  return renewedCount >= maxRenewals || hasActiveReservation;
}
