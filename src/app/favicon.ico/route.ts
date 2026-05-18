import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/api-helpers";
import { resolveTheme } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const tenant = await getTenantFromRequest(request);

  if (!tenant) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const theme = resolveTheme(tenant.theme as Record<string, unknown>);
  const faviconUrl = theme.faviconUrl || theme.logoUrl;

  if (!faviconUrl) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const response = NextResponse.redirect(new URL(faviconUrl, request.url), 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
