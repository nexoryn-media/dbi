export const DEFAULT_THEME = {
  brandName: "Dashboard",
  logoUrl: "",
  faviconUrl: "",
  colors: {
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    accent: "#8b5cf6",
    background: "#09090b",
    surface: "#18181b",
    surfaceHover: "#27272a",
    text: "#fafafa",
    textSecondary: "#a1a1aa",
    border: "#27272a",
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
    sidebarBg: "#18181b",
    topbarBg: "#09090b",
  },
  radiusCard: "12px",
  radiusButton: "8px",
  radiusInput: "8px",
  logoSize: "28px",
  fontFamily: "Inter",
  fontUrl:
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
};

export type TenantTheme = typeof DEFAULT_THEME;

export const PREMADE_THEMES = [
  // --- DARK THEMES ---
  {
    id: "midnight",
    name: "Midnight Blue",
    colors: {
      primary: "#3b82f6",
      accent: "#8b5cf6",
      background: "#020617", // slate-950
      surface: "#0f172a", // slate-900
      sidebarBg: "#020617",
      topbarBg: "#020617",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
    }
  },
  {
    id: "obsidian",
    name: "Obsidian Red",
    colors: {
      primary: "#ef4444",
      accent: "#f87171",
      background: "#000000",
      surface: "#0a0a0a",
      sidebarBg: "#050505",
      topbarBg: "#000000",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
    }
  },
  {
    id: "cyberpunk",
    name: "Neon Cyber",
    colors: {
      primary: "#0ea5e9", // sky-500
      accent: "#f43f5e", // rose-500
      background: "#09090b",
      surface: "#18181b", // zinc-900
      sidebarBg: "#09090b",
      topbarBg: "#09090b",
      success: "#22c55e",
      warning: "#eab308",
      error: "#f43f5e",
    }
  },
  {
    id: "monochrome-dark",
    name: "Carbon Dark",
    colors: {
      primary: "#ffffff",
      accent: "#a1a1aa",
      background: "#111111",
      surface: "#1c1c1c",
      sidebarBg: "#111111",
      topbarBg: "#111111",
      success: "#34d399",
      warning: "#fbbf24",
      error: "#f87171",
    }
  },

  // --- LIGHT THEMES ---
  {
    id: "snow",
    name: "Snow White",
    colors: {
      primary: "#2563eb", // blue-600
      accent: "#4f46e5", // indigo-600
      background: "#ffffff",
      surface: "#f8fafc", // slate-50
      sidebarBg: "#f1f5f9", // slate-100
      topbarBg: "#ffffff",
      success: "#16a34a", // green-600
      warning: "#d97706", // amber-600
      error: "#dc2626", // red-600
    }
  },
  {
    id: "nordic-light",
    name: "Nordic Frost",
    colors: {
      primary: "#0ea5e9", // sky-500
      accent: "#8b5cf6", // violet-500
      background: "#f8fafc", // slate-50
      surface: "#ffffff",
      sidebarBg: "#ffffff",
      topbarBg: "#f8fafc",
      success: "#059669", // emerald-600
      warning: "#ea580c", // orange-600
      error: "#e11d48", // rose-600
    }
  },
  {
    id: "warm-sunrise",
    name: "Warm Sunrise",
    colors: {
      primary: "#ea580c", // orange-600
      accent: "#dc2626", // red-600
      background: "#fffbeb", // amber-50
      surface: "#ffffff",
      sidebarBg: "#fef3c7", // amber-100
      topbarBg: "#fffbeb",
      success: "#16a34a",
      warning: "#d97706",
      error: "#dc2626",
    }
  },
  {
    id: "mint-breeze",
    name: "Mint Breeze",
    colors: {
      primary: "#059669", // emerald-600
      accent: "#0ea5e9", // sky-600
      background: "#f0fdf4", // green-50
      surface: "#ffffff",
      sidebarBg: "#dcfce7", // green-100
      topbarBg: "#f0fdf4",
      success: "#15803d", // green-700
      warning: "#ca8a04", // yellow-600
      error: "#b91c1c", // red-700
    }
  }
];
