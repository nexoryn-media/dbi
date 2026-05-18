import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTenantByDomain, resolveTheme, generateThemeCSS } from "@/lib/tenant";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = headerList.get("x-tenant-host") || headerList.get("host") || "localhost";
  const tenant = await getTenantByDomain(host);

  if (!tenant) {
    return { title: "Dashboard" };
  }

  const theme = resolveTheme(tenant.theme as Record<string, unknown>);
  const faviconUrl = theme.faviconUrl || theme.logoUrl;

  return {
    title: tenant.pageTitle || "Dashboard",
    description: tenant.metaDescription || "",
    icons: faviconUrl ? { icon: faviconUrl, shortcut: faviconUrl, apple: faviconUrl } : undefined,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const host = headerList.get("x-tenant-host") || headerList.get("host") || "localhost";
  const tenant = await getTenantByDomain(host);

  const theme = tenant
    ? resolveTheme(tenant.theme as Record<string, unknown>)
    : null;

  return (
    <html lang="en">
      <head>
        {theme?.fontUrl && (
          <link rel="stylesheet" href={theme.fontUrl} />
        )}
        {theme && (
          <style id="tenant-theme" dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme) }} />
        )}
      </head>
      <body>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
