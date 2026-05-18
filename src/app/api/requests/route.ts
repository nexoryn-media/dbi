import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, getEffectiveTenantId, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";
import { createRequestSchema } from "@/lib/validations";

/**
 * GET /api/requests — List requests
 * - Admin: all requests across tenants (filterable by ?tenantId=xxx)
 * - User: only their own requests
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (isAdmin(auth)) {
      // Admin: cross-tenant, optionally filtered
      const effectiveTenantId = getEffectiveTenantId(auth, request);
      if (effectiveTenantId) {
        where.tenantId = effectiveTenantId;
      }
    } else {
      // Regular users only see their own requests.
      where.tenantId = auth.tenantId;
      where.userId = auth.userId;
    }

    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          user: {
            select: { 
              id: true, 
              name: true, 
              email: true,
              brand: true,
              merchant: true,
            },
          },
          tenant: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.request.count({ where }),
    ]);

    // Strip admin notes from user responses
    const sanitizedRequests =
      auth.role === "USER"
        ? requests.map(({ adminNotes: _, ...r }: any) => r)
        : requests;

    return successResponse({
      requests: sanitizedRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List requests error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/requests — Create a new request (any authenticated user)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);

    const body = await request.json();

    const parsed = createRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const newRequest = await prisma.request.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        req_name: parsed.data.req_name,
        req_geo: parsed.data.req_geo,
        req_amo: parsed.data.req_amo,
        req_type: parsed.data.req_type,
        submittedAt: new Date(),
      },
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            email: true,
          },
        },
      },
    });

    return successResponse({ request: newRequest }, 201);
  } catch (error) {
    console.error("Create request error:", error);
    return errorResponse("Internal server error", 500);
  }
}
