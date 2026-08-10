import type { BorrowingPolicy, MemberType, UserRole } from "../shared";

export const DEFAULT_MEMBER_TYPE = "general" as const;

export interface PolicySnapshot {
  loanPeriodDays: number;
  dailyFineRate: number;
}

export function resolvePolicyByRole(
  policies: BorrowingPolicy[],
  role: UserRole,
  memberType: MemberType,
): BorrowingPolicy | null {
  const exact = policies.find((policy) => policy.role === role && policy.memberType === memberType);
  if (exact) {
    return exact;
  }
  const fallback = policies.find(
    (policy) => policy.role === role && policy.memberType === DEFAULT_MEMBER_TYPE,
  );
  return fallback ?? null;
}

export function snapshotPolicy(policy: BorrowingPolicy): PolicySnapshot {
  return {
    loanPeriodDays: policy.loanPeriodDays,
    dailyFineRate: policy.dailyFineRate,
  };
}
