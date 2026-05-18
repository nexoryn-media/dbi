import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, getEffectiveTenantId, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";
export const dynamic = "force-dynamic";

/**
 * GET /api/users — List users (Admin only, cross-tenant)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);
    
    if (!isAdmin(auth)) {
      return errorResponse("Admin access required", 403);
    }

    const effectiveTenantId = getEffectiveTenantId(auth, request);
    const where: any = {};
    if (effectiveTenantId) {
      where.tenantId = effectiveTenantId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        brand: true,
        merchant: true,
        createdAt: true,
        tenant: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { requests: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return successResponse({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return errorResponse("Internal server error", 500);
  }
}
