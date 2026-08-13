import type { ReactNode } from "react";

import { PortalNav } from "./components/portal-nav";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center gap-3 px-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-500 text-white">
            <span className="text-sm font-semibold">บ</span>
          </div>
          <div className="leading-tight">
            <p className="text-title font-semibold text-foreground">Library LMS</p>
            <p className="text-caption text-muted-foreground">ฝั่งผู้ยืม</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-24 sm:pb-28">{children}</main>
      <PortalNav />
    </div>
  );
}
