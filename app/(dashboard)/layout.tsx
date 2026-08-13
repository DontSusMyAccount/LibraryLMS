"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Sidebar } from "@/app/_shared/components/sidebar";
import { Topbar } from "@/app/_shared/components/topbar";
import { useSidebar } from "@/app/_shared/hooks/use-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile } = useSidebar();

  const handleMenuClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      openMobile();
    } else {
      toggleCollapsed();
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        openMobile={openMobile}
        closeMobile={closeMobile}
        toggleCollapsed={toggleCollapsed}
      />
      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding-left] duration-200",
          collapsed ? "lg:pl-[72px]" : "lg:pl-60",
        )}
      >
        <Topbar onMenuClick={handleMenuClick} />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
