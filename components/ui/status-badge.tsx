import { cn } from "@/lib/utils";

type Status = "confirmed" | "pending" | "cancelled";

interface StatusConfig {
  badgeClass: string;
  dotClass: string;
  label: string;
}

const STATUS_CONFIG: Record<Status, StatusConfig> = {
  confirmed: {
    badgeClass: "bg-accent-mint/15 text-brand-700 dark:text-brand-300",
    dotClass: "bg-accent-mint",
    label: "ยืมอยู่",
  },
  pending: {
    badgeClass: "bg-accent-amber/15 text-accent-amber dark:text-accent-amber",
    dotClass: "bg-accent-amber",
    label: "ค้างส่ง",
  },
  cancelled: {
    badgeClass: "bg-accent-coral/15 text-accent-coral dark:text-accent-coral",
    dotClass: "bg-accent-coral",
    label: "พร้อมรับ",
  },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      data-slot="status-badge"
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-medium whitespace-nowrap",
        config.badgeClass,
        className,
      )}
    >
      <span
        data-slot="status-dot"
        className={cn("size-1.5 shrink-0 rounded-full", config.dotClass)}
      />
      <span data-slot="status-label">{config.label}</span>
    </span>
  );
}

export { StatusBadge };
export type { Status };
