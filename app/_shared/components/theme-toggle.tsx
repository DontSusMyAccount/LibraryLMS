"use client";

import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useThemeMode } from "@/app/_shared/hooks/use-theme";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeMode();

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      onClick={toggleTheme}
    >
      <SunIcon data-icon="inline-start" className="dark:hidden" />
      <MoonIcon data-icon="inline-start" className="hidden dark:block" />
    </Button>
  );
}
