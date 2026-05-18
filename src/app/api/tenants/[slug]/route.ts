import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";

/**
 * GET /api/tenants/:slug — Get tenant config + theme (for rendering)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        pageTitle: true,
        metaDescription: true,
        theme: true,
      },
    });

    if (!tenant) return errorResponse("Tenant not found", 404);

    return successResponse({ tenant });
  } catch (error) {
    console.error("Get tenant error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/tenants/:slug — Update tenant config (Super Admin only)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);
    
    const { slug } = await params;
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return errorResponse("Tenant not found", 404);

    // Authorization: Admins can edit any tenant
    if (!isAdmin(auth)) {
      return errorResponse("Admin access required", 403);
    }

    const body = await request.json();

    // Only allow updating certain fields
    const updateData: Record<string, unknown> = {};
    if (body.pageTitle !== undefined) updateData.pageTitle = body.pageTitle;
    if (body.metaDescription !== undefined) updateData.metaDescription = body.metaDescription;
    if (body.theme !== undefined) updateData.theme = body.theme;

    const updated = await prisma.tenant.update({
      where: { slug },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        pageTitle: true,
        metaDescription: true,
        theme: true,
      },
    });

    return successResponse({ tenant: updated });
  } catch (error) {
    console.error("Update tenant error:", error);
    return errorResponse("Internal server error", 500);
  }
}
