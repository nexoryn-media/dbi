import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";
import { z } from "zod";

const updateTenantSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  domain: z.string().optional(),
  pageTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  theme: z.record(z.string(), z.unknown()).optional(),
});

/**
 * PATCH /api/tenants/mgmt/[id] — Update a brand (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth || !isAdmin(auth)) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const parsed = updateTenantSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { id } = await params;

    const updateData: Prisma.TenantUpdateInput = {
      ...parsed.data,
      theme: parsed.data.theme as Prisma.InputJsonValue | undefined,
    };

    const tenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    return successResponse({ tenant });
  } catch (error) {
    console.error("Update tenant error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * DELETE /api/tenants/mgmt/[id] — Delete a brand (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth || !isAdmin(auth)) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;
    
    await prisma.tenant.delete({
      where: { id },
    });

    return successResponse({ message: "Brand deleted successfully" });
  } catch (error) {
    console.error("Delete tenant error:", error);
    return errorResponse("Failed to delete brand. Ensure it has no active users/data first.", 500);
  }
}
