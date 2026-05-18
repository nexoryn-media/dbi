import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";

/**
 * PATCH /api/users/:id — Update user details (Admin only, cross-tenant)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);

    if (!isAdmin(auth)) {
      return errorResponse("Admin access required", 403);
    }

    const { id } = await params;
    const body = await request.json();

    // Only allow updating certain fields
    const updateData: Record<string, any> = {};
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.merchant !== undefined) updateData.merchant = body.merchant;
    if (body.status !== undefined) updateData.status = body.status;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return successResponse({ user });
  } catch (error) {
    console.error("Update user error:", error);
    return errorResponse("Internal server error", 500);
  }
}
