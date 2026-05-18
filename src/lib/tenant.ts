import { prisma } from "./db";
import { headers } from "next/headers";
import { DEFAULT_THEME, TenantTheme } from "./theme-constants";

// ─── Tenant Resolution ──────────────────────────────────────────

/**
 * Resolve tenant from the incoming request hostname.
 * Falls back to checking x-tenant-host header set by middleware.
 */
export async function getTenantByDomain(domain: string) {
  // Strip port for local dev (e.g., "localhost:3000" → "localhost")
  const cleanDomain = domain.split(":")[0];
  const subdomain = cleanDomain.split(".")[0];

  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { domain: cleanDomain }, 
        { domain: domain }, 
        { slug: cleanDomain },
        { slug: subdomain },
        { slug: `demo-${subdomain}` }
      ],
    },
  });

  return tenant;
}

/**
 * Get the current tenant from request headers.
 * Used in Server Components and API routes.
 */
export async function getCurrentTenant() {
  const headerList = await headers();
  const host =
    headerList.get("x-tenant-host") ||
    headerList.get("host") ||
    "localhost";

  return getTenantByDomain(host);
}

/**
 * Merge tenant's stored theme with defaults.
 */
export function resolveTheme(
  storedTheme: Record<string, unknown>
): TenantTheme {
  const storedColors =
    typeof storedTheme.colors === "object" && storedTheme.colors !== null
      ? storedTheme.colors
      : {};

  const merged: typeof DEFAULT_THEME = {
    ...DEFAULT_THEME,
    ...storedTheme,
    colors: {
      ...DEFAULT_THEME.colors,
      ...(storedColors as Partial<typeof DEFAULT_THEME.colors>),
    },
  };

  return sanitizeTheme(merged);
}

/**
 * Generate a CSS string of variables for a theme.
 */
export function generateThemeCSS(theme: TenantTheme): string {
  let css = ":root {\n";

  if (theme.colors) {
    const { background, surface, sidebarBg, topbarBg, primary } = theme.colors;

    // Auto-calculate text colors based on backgrounds
    const mainText = getContrastColor(background);
    const mainTextSec = mainText === "#fafafa" ? "#a1a1aa" : "#52525b";
    
    const sidebarText = getContrastColor(sidebarBg);
    const sidebarTextSec = sidebarText === "#fafafa" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";

    const topbarText = getContrastColor(topbarBg);

    // Auto-calculate border colors
    const borderColor = getBorderColor(background);
    const surfaceHover = mainText === "#fafafa" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

    // Inject only the known theme color keys after sanitization.
    Object.keys(DEFAULT_THEME.colors).forEach((key) => {
      const value = theme.colors[key as keyof typeof DEFAULT_THEME.colors];
      const cssVar = `--dash-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
      css += `  ${cssVar}: ${value};\n`;
    });

    // Inject calculated overrides
    css += `  --dash-text: ${mainText};\n`;
    css += `  --dash-text-secondary: ${mainTextSec};\n`;
    css += `  --dash-border: ${borderColor};\n`;
    css += `  --dash-surface-hover: ${surfaceHover};\n`;
    css += `  --dash-sidebar-text: ${sidebarText};\n`;
    css += `  --dash-sidebar-text-secondary: ${sidebarTextSec};\n`;
    css += `  --dash-topbar-text: ${topbarText};\n`;
    
    // Primary Hover (slightly darker/lighter)
    css += `  --dash-primary-hover: ${primary}ee;\n`;
  }

  // ... radius mapping ...
  const radiusMapping = {
    radiusCard: "--dash-radius-lg",
    radiusButton: "--dash-radius",
    radiusInput: "--dash-radius-input",
  };

  Object.entries(radiusMapping).forEach(([key, cssVar]) => {
    const value = (theme as any)[key] || (DEFAULT_THEME as any)[key];
    css += `  ${cssVar}: ${value};\n`;
  });

  if (theme.logoSize) {
    css += `  --dash-logo-size: ${theme.logoSize};\n`;
  }

  if (theme.fontFamily) {
    css += `  --dash-font: '${theme.fontFamily}', system-ui, sans-serif;\n`;
  }

  css += "}";
  return css;
}

function getContrastColor(hex: string) {
  if (!hex || hex === 'transparent') return "#fafafa";
  const color = hex.startsWith("#") ? hex.slice(1) : hex;
  if (color.length !== 6) return "#fafafa";
  
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#18181b" : "#fafafa";
}

function getBorderColor(hex: string) {
  if (!hex || hex === 'transparent') return "rgba(255,255,255,0.1)";
  const color = hex.startsWith("#") ? hex.slice(1) : hex;
  if (color.length !== 6) return "rgba(255,255,255,0.1)";

  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
}

function sanitizeTheme(theme: typeof DEFAULT_THEME): TenantTheme {
  const colors = Object.fromEntries(
    Object.entries(DEFAULT_THEME.colors).map(([key, fallback]) => [
      key,
      sanitizeColor(theme.colors[key as keyof typeof DEFAULT_THEME.colors], fallback),
    ])
  ) as typeof DEFAULT_THEME.colors;

  return {
    ...DEFAULT_THEME,
    ...theme,
    brandName: sanitizePlainText(theme.brandName, DEFAULT_THEME.brandName, 80),
    logoUrl: sanitizeUrl(theme.logoUrl),
    faviconUrl: sanitizeUrl(theme.faviconUrl),
    colors,
    radiusCard: sanitizeCssLength(theme.radiusCard, DEFAULT_THEME.radiusCard),
    radiusButton: sanitizeCssLength(theme.radiusButton, DEFAULT_THEME.radiusButton),
    radiusInput: sanitizeCssLength(theme.radiusInput, DEFAULT_THEME.radiusInput),
    logoSize: sanitizeCssLength(theme.logoSize, DEFAULT_THEME.logoSize),
    fontFamily: sanitizeFontFamily(theme.fontFamily, DEFAULT_THEME.fontFamily),
    fontUrl: sanitizeUrl(theme.fontUrl),
  };
}

function sanitizePlainText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return fallback;
  return trimmed.replace(/[<>]/g, "");
}

function sanitizeColor(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed)) return trimmed;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

function sanitizeCssLength(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^\d{1,3}(\.\d{1,2})?(px|rem|em|%)$/.test(trimmed) ? trimmed : fallback;
}

function sanitizeFontFamily(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9 _,-]{1,80}$/.test(trimmed) ? trimmed : fallback;
}

function sanitizeUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? trimmed : "";
  } catch {
    return "";
  }
}
