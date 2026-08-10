"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  ChevronRightIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/app/_shared/components/theme-toggle";

interface TopbarProps {
  onMenuClick: () => void;
}

const CRUMB_LABELS: Record<string, string> = {
  "/dashboard": "ภาพรวม",
  "/catalog": "แคตตาล็อก",
  "/circulation": "เคาน์เตอร์ยืม-คืน",
  "/reservations": "คิวจอง",
};

function useBreadcrumb() {
  const pathname = usePathname();
  const leaf = CRUMB_LABELS[pathname] ?? "ภาพรวม";
  return { leaf };
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { leaf } = useBreadcrumb();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-0 bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <Button variant="ghost" size="icon-lg" aria-label="สลับเมนู" onClick={onMenuClick}>
        <MenuIcon data-icon="inline-start" />
      </Button>

      {/* Breadcrumb */}
      <nav
        aria-label="เบรดครัมบ์"
        className="hidden items-center gap-1.5 text-label text-muted-foreground sm:flex"
      >
        <Link href="/dashboard" className="hover:text-foreground">
          หน้าหลัก
        </Link>
        <ChevronRightIcon className="size-4 text-muted-foreground/60" />
        <span className="font-medium text-foreground">{leaf}</span>
      </nav>

      {/* Search pill */}
      <div className="hidden h-10 w-80 items-center gap-2 rounded-full bg-muted px-4 md:flex">
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          placeholder="ค้นหาหนังสือ สมาชิก การยืม…"
          aria-label="ค้นหา"
          className="h-full min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
        />
        <kbd className="rounded-md bg-background px-1.5 py-0.5 text-caption text-muted-foreground ring-1 ring-border">
          /
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />

        {/* Notification bell with dot */}
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="การแจ้งเตือน (3 รายการที่ยังไม่ได้อ่าน)"
          className="relative"
        >
          <BellIcon data-icon="inline-start" />
          <span
            aria-hidden
            className="absolute top-2 right-2.5 size-2 rounded-full bg-destructive ring-2 ring-background"
          />
        </Button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-2.5 px-2">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-brand-500/15 text-sm font-semibold text-brand-600 dark:text-brand-300">
                    อ
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-label font-medium text-foreground md:block">
                  แอดมินห้องสมุด
                </span>
              </Button>
            }
          >
            <span className="sr-only">เปิดเมนูบัญชี</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuLabel>แอดมินห้องสมุด</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon data-icon="inline-start" />
              โปรไฟล์ของฉัน
            </DropdownMenuItem>
            <DropdownMenuItem>
              <SettingsIcon data-icon="inline-start" />
              การตั้งค่า
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <LogOutIcon data-icon="inline-start" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
