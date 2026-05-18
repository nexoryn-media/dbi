import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";
import { updateUserStatusSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/users/:id/status — Quick status update (Admin only, cross-tenant)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);
    if (!isAdmin(auth)) {
      return errorResponse("Admin access required", 403);
    }

    const { id } = await params;
    const body = await request.json();

    const parsed = updateUserStatusSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    // Verify user exists (no tenant scoping for admins)
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) return errorResponse("User not found", 404);

    // Prevent suspending yourself
    if (id === auth.userId) {
      return errorResponse("Cannot change your own status", 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status: parsed.data.status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return successResponse({ user });
  } catch (error) {
    console.error("Update status error:", error);
    return errorResponse("Internal server error", 500);
  }
}
