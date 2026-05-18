"use client";

import { useEffect } from "react";
import type { TenantTheme } from "@/lib/theme-constants";

interface ThemeProviderProps {
  theme: TenantTheme | null;
  children: React.ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    // We rely entirely on the server-rendered <style id="tenant-theme"> block
    // in layout.tsx to provide the calculated, high-contrast CSS variables.
    // Client-side injection here would override those calculations with raw database values.
  }, [theme]);

  return <>{children}</>;
}
