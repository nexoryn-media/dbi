import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";
import { z } from "zod";

const updateAccountSchema = z.object({
  name: z.string().optional(),
  number: z.string().optional(),
  address: z.string().optional(),
  type: z.enum(["low", "high", "ftd"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  tenantIds: z.array(z.string()).optional(),
});

/**
 * DELETE /api/accounts/[id] — Delete account (Admin only, cross-tenant)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);
    
    if (!isAdmin(auth)) {
      return errorResponse("Admin access required", 403);
    }

    await prisma.account.delete({
      where: { id },
    });

    return successResponse({ message: "Account deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/accounts/[id] — Update account (Admin only, cross-tenant)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);
    
    if (!isAdmin(auth)) {
      return errorResponse("Admin access required", 403);
    }

    const body = await request.json();
    const parsed = updateAccountSchema.safeParse(body);
    
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const updateData: any = { ...parsed.data };

    if (parsed.data.status === "INACTIVE") {
      updateData.inactiveAt = new Date();
    } else if (parsed.data.status === "ACTIVE") {
      updateData.inactiveAt = null;
    }

    // Remove tenantIds from direct data if present (handle via connect/disconnect)
    const { tenantIds, ...prismaData } = updateData;

    const account = await prisma.account.update({
      where: { id },
      data: {
        ...prismaData,
        tenants: tenantIds ? {
          set: tenantIds.map((id: string) => ({ id }))
        } : undefined
      },
      include: {
        tenants: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return successResponse({ account });
  } catch (error) {
    console.error("Update account error:", error);
    return errorResponse("Internal server error", 500);
  }
}
