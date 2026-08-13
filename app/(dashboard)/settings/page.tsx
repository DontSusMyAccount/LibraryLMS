"use client";

import { Palette } from "lucide-react";

import { ThemeToggle } from "@/app/_shared/components/theme-toggle";

export default function SettingsPage() {
  return (
    <div data-slot="settings-page" className="flex flex-col gap-6">
      <h1 className="text-heading2 font-bold text-foreground">การตั้งค่า</h1>

      <section className="flex items-center justify-between rounded-lg border border-border p-6">
        <div className="flex items-center gap-3">
          <Palette className="size-5 text-muted-foreground" aria-hidden />
          <div>
            <h2 className="text-body font-medium text-foreground">ธีม</h2>
            <p className="text-caption text-muted-foreground">สลับโหมดสว่าง / โหมดมืด</p>
          </div>
        </div>
        <ThemeToggle />
      </section>
    </div>
  );
}
