"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenTextIcon, CalendarClockIcon, SearchIcon, WalletIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/search", label: "ค้นหา", icon: SearchIcon },
  { href: "/my-loans", label: "การยืม", icon: BookOpenTextIcon },
  { href: "/my-reservations", label: "คิวจอง", icon: CalendarClockIcon },
  { href: "/my-fines", label: "ค่าปรับ", icon: WalletIcon },
] as const;

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav
      data-slot="portal-nav"
      aria-label="เมนูหลัก"
      className="sticky bottom-0 z-20 border-t border-border/60 bg-background/85 backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-2xl items-stretch justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-brand-600 dark:text-brand-300"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
