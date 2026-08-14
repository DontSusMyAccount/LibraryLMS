"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRightIcon,
  BookOpenTextIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  LogOutIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSidebar } from "@/app/_shared/hooks/use-sidebar";
import { ROUTES } from "@/app/_shared/constants/routes";
import { useAuthStore } from "@/app/features/login/stores/auth.store";

interface NavItemDef {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroupDef {
  label: string;
  items: NavItemDef[];
}

const NAV_GROUPS: NavGroupDef[] = [
  {
    label: "ภาพรวม",
    items: [{ label: "ภาพรวม", href: "/dashboard", icon: LayoutDashboardIcon }],
  },
  {
    label: "การจัดการ",
    items: [
      { label: "แคตตาล็อก", href: "/catalog", icon: BookOpenTextIcon },
      { label: "เคาน์เตอร์ยืม-คืน", href: "/circulation", icon: ArrowLeftRightIcon },
      { label: "คิวจอง", href: "/reservations", icon: ListChecksIcon },
      { label: "สมาชิก", href: "/members", icon: UsersIcon },
    ],
  },
];

const SIDEBAR_WIDTH_CLASS = "w-60";

interface SidebarContentProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

function SidebarContent({ collapsed, onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);

  const userFullName = session?.fullName ?? "ผู้ใช้งาน";
  const handleLogout = async () => {
    await useAuthStore.getState().signOut();
    router.push(ROUTES.AUTH_SIGNIN);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo mark + system name */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <div className="relative size-10 shrink-0">
          <Image
            src="/brand/logo.png"
            alt="Library LMS"
            fill
            sizes="40px"
            className="object-contain"
          />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-title font-semibold text-white">Library LMS</p>
            <p className="text-caption text-accent-amber">ระบบห้องสมุด</p>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="scroll-fade flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-caption font-medium text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-lg text-label font-medium transition-colors",
                      collapsed ? "justify-center" : "px-3",
                      active
                        ? "bg-brand-500/15 text-brand-300"
                        : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400"
                      />
                    )}
                    <Icon className="size-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom user card */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg py-2",
            collapsed ? "justify-center" : "px-2",
          )}
        >
          <Avatar className="size-9 bg-brand-500/20">
            <AvatarFallback className="bg-transparent text-sm font-semibold text-brand-300">
              {userFullName.charAt(0) || "อ"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-label font-medium text-sidebar-foreground">
                  {userFullName}
                </p>
                <p className="truncate text-caption text-sidebar-foreground/50">{session?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="ออกจากระบบ"
                onClick={handleLogout}
                className="text-sidebar-foreground/60 hover:bg-white/5 hover:text-sidebar-foreground"
              >
                <LogOutIcon data-icon="inline-start" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, mobileOpen, closeMobile }: ReturnType<typeof useSidebar>) {
  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden shadow-float lg:block",
          SIDEBAR_WIDTH_CLASS,
          collapsed && "w-[72px]",
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={closeMobile}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className={cn("w-72 bg-sidebar text-sidebar-foreground", "max-w-[85%]")}
        >
          <SheetTitle className="sr-only">เมนูนำทาง</SheetTitle>
          <SidebarContent collapsed={false} onNavigate={closeMobile} />
        </SheetContent>
      </Sheet>
    </>
  );
}
