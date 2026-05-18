import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";
import { z } from "zod";
import { DEFAULT_THEME } from "@/lib/theme-constants";

export const dynamic = "force-dynamic";

const createTenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and dashes"),
  domain: z.string().optional(),
});

/**
 * GET /api/tenants — List all tenants (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth || !isAdmin(auth)) {
      return errorResponse("Unauthorized", 401);
    }

    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true, requests: true, accounts: true }
        }
      },
      orderBy: { name: "asc" },
    });

    return successResponse({ tenants });
  } catch (error) {
    console.error("List tenants error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/tenants — Create a new brand (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth || !isAdmin(auth)) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const parsed = createTenantSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    // Check if slug exists
    const existing = await prisma.tenant.findUnique({
      where: { slug: parsed.data.slug }
    });

    if (existing) {
      return errorResponse("A brand with this slug already exists", 400);
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        domain: parsed.data.domain || parsed.data.slug + ".localhost",
        pageTitle: parsed.data.name + " Portal",
        theme: {
          ...DEFAULT_THEME,
          brandName: parsed.data.name,
        }
      }
    });

    return successResponse({ tenant });
  } catch (error) {
    console.error("Create tenant error:", error);
    return errorResponse("Internal server error", 500);
  }
}
