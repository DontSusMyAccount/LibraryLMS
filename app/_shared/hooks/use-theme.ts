"use client";

import { useCallback } from "react";
import { useTheme } from "next-themes";

export function useThemeMode() {
  const { resolvedTheme, setTheme, theme } = useTheme();

  const isDark = resolvedTheme === "dark";

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  return { theme, resolvedTheme, isDark, toggleTheme, setTheme };
}
