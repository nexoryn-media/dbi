import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";
import { z } from "zod";
export const dynamic = "force-dynamic";

const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  number: z.string().min(1, "Account number is required"),
  address: z.string().optional(),
  type: z.enum(["low", "high", "ftd", "inactive"]).optional(),
  tenantIds: z.array(z.string()).optional(), // Admin assigns to multiple tenants
});

/**
 * GET /api/accounts — List accounts (cross-tenant for admins)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");

    const where: any = {};
    
    if (!isAdmin(auth)) {
      // Non-admins only see accounts assigned to their tenant
      where.tenants = {
        some: { id: auth.tenantId }
      };
    } else if (tenantIdParam) {
      // Admins can filter by specific tenant
      where.tenants = {
        some: { id: tenantIdParam }
      };
    }

    const accounts = await prisma.account.findMany({
      where,
      include: {
        tenants: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse({ accounts });
  } catch (error) {
    console.error("Get accounts error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/accounts — Create account (Admin only, cross-tenant)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);
    
    if (!isAdmin(auth)) {
      return errorResponse("Admin access required", 403);
    }

    const body = await request.json();
    const parsed = createAccountSchema.safeParse(body);
    
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const account = await prisma.account.create({
      data: {
        name: parsed.data.name,
        number: parsed.data.number,
        address: parsed.data.address,
        type: parsed.data.type || "low",
        inactiveAt: parsed.data.type === "inactive" ? new Date() : null,
        tenants: parsed.data.tenantIds ? {
          connect: parsed.data.tenantIds.map(id => ({ id }))
        } : undefined
      },
      include: {
        tenants: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return successResponse({ account }, 201);
  } catch (error) {
    console.error("Create account error:", error);
    return errorResponse("Internal server error", 500);
  }
}
