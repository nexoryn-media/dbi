import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken, JwtPayload } from "@/lib/auth";

/**
 * Helper to extract and verify auth from API requests.
 * Returns the JWT payload or null.
 */
export function getAuthFromRequest(request: NextRequest): JwtPayload | null {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Extract auth and verify the backing user is still active.
 * This prevents suspended/deleted users from using an unexpired JWT.
 */
export async function getActiveAuthFromRequest(
  request: NextRequest
): Promise<JwtPayload | null> {
  const auth = getAuthFromRequest(request);
  if (!auth) return null;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      role: true,
      status: true,
      tenantId: true,
    },
  });

  if (!user || user.status !== "ACTIVE") return null;

  if (!isAdmin({ ...auth, role: user.role }) && user.tenantId !== auth.tenantId) {
    return null;
  }

  return {
    ...auth,
    role: user.role,
  };
}

/**
 * Check if the authenticated user is an admin.
 */
export function isAdmin(auth: JwtPayload): boolean {
  return auth.role === "ADMIN" || auth.role === "SUPER_ADMIN";
}

/**
 * Resolve the effective tenantId for a request.
 * - Admins can pass ?tenantId=xxx to scope to a specific tenant.
 * - If no filter is passed, admins see ALL tenants (returns undefined).
 * - Regular users always return their own tenantId.
 */
export function getEffectiveTenantId(
  auth: JwtPayload,
  request: NextRequest
): string | undefined {
  if (isAdmin(auth)) {
    const { searchParams } = new URL(request.url);
    const filterTenantId = searchParams.get("tenantId");
    return filterTenantId || undefined; // undefined = all tenants
  }
  return auth.tenantId;
}

/**
 * Helper to resolve tenant from the hostname.
 */
export async function getTenantFromRequest(request: NextRequest) {
  const host = request.headers.get("x-tenant-host") || request.headers.get("host") || "localhost";
  const cleanHost = host.split(":")[0];
  const subdomain = cleanHost.split(".")[0];

  return prisma.tenant.findFirst({
    where: {
      OR: [
        { domain: cleanHost },
        { domain: host },
        { slug: cleanHost },
        { slug: subdomain },
        { slug: `demo-${subdomain}` },
      ],
    },
  });
}

/**
 * Standardized JSON error response.
 */
export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standardized JSON success response.
 */
export function successResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
