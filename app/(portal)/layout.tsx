"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ReactNode } from "react";
import { LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/app/_shared/constants/routes";
import { useAuthStore } from "@/app/features/login/stores/auth.store";
import { PortalNav } from "./components/portal-nav";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    await useAuthStore.getState().signOut();
    router.push(ROUTES.AUTH_SIGNIN);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center gap-3 px-4">
          <div className="relative size-9 shrink-0">
            <Image
              src="/brand/logo.png"
              alt="Library LMS"
              fill
              sizes="36px"
              className="object-contain"
            />
          </div>
          <div className="leading-tight">
            <p className="text-title font-semibold text-foreground">Library LMS</p>
            <p className="text-caption text-muted-foreground">ฝั่งผู้ยืม</p>
          </div>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="ออกจากระบบ"
            onClick={() => void handleLogout()}
            className="ml-auto"
          >
            <LogOutIcon data-icon="inline-start" />
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-24 sm:pb-28">{children}</main>
      <PortalNav />
    </div>
  );
}
