import type { UserStatus } from "@libsys/shared";

import { cn } from "@/lib/utils";

import { STATUS_LABELS } from "@/app/_shared/constants/member.labels";

export { STATUS_LABELS };

interface MemberStatusConfig {
  badgeClass: string;
  dotClass: string;
}

const STATUS_CONFIG: Record<UserStatus, MemberStatusConfig> = {
  active: {
    badgeClass: "bg-accent-mint/15 text-brand-700 dark:text-brand-300",
    dotClass: "bg-accent-mint",
  },
  suspended: {
    badgeClass: "bg-accent-coral/15 text-accent-coral dark:text-accent-coral",
    dotClass: "bg-accent-coral",
  },
  graduated: {
    badgeClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  inactive: {
    badgeClass: "bg-ink-body/15 text-ink-body",
    dotClass: "bg-ink-body",
  },
};

interface MemberStatusBadgeProps {
  status: UserStatus;
  className?: string;
}

function MemberStatusBadge({ status, className }: MemberStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      data-slot="member-status-badge"
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-medium whitespace-nowrap",
        config.badgeClass,
        className,
      )}
    >
      <span
        data-slot="member-status-dot"
        className={cn("size-1.5 shrink-0 rounded-full", config.dotClass)}
      />
      <span data-slot="member-status-label">{STATUS_LABELS[status]}</span>
    </span>
  );
}

export { MemberStatusBadge };

export type { MemberStatusBadgeProps };
