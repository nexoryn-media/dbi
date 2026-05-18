import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, errorResponse, successResponse } from "@/lib/api-helpers";

/**
 * GET /api/auth/me — Return current authenticated user info
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) {
      return errorResponse("Not authenticated", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        metadata: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    if (user.status !== "ACTIVE") {
      return errorResponse("Account is not active", 403);
    }

    // Check if tenant has FTD account
    const ftdCount = await prisma.account.count({
      where: {
        type: "ftd",
        tenants: { some: { id: user.tenant.id } }
      }
    });

    return successResponse({ 
      user: {
        ...user,
        hasFtdAccount: ftdCount > 0 || user.role === "ADMIN"
      }
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return errorResponse("Internal server error", 500);
  }
}
