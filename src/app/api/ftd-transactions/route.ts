import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createFtdTxSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().min(0, "Amount must be positive"),
  date: z.string().optional(),
  settled: z.boolean().optional(),
  accountId: z.string().min(1, "Account is required"),
  tenantId: z.string().min(1, "Tenant is required"),
});

/**
 * GET /api/ftd-transactions — List FTD transactions
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    
    const where: any = {};
    
    if (!isAdmin(auth)) {
      where.tenantId = auth.tenantId;
    } else if (tenantIdParam) {
      where.tenantId = tenantIdParam;
    }

    const transactions = await prisma.ftdTransaction.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true, number: true }
        },
        tenant: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse({ transactions });
  } catch (error) {
    console.error("Get FTD transactions error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/ftd-transactions — Create FTD transaction (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth || !isAdmin(auth)) {
      return errorResponse("Admin access required", 403);
    }

    const body = await request.json();
    const parsed = createFtdTxSchema.safeParse(body);
    
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const transaction = await prisma.ftdTransaction.create({
      data: {
        name: parsed.data.name,
        amount: parsed.data.amount,
        date: parsed.data.date ? new Date(parsed.data.date) : undefined,
        settled: parsed.data.settled || false,
        accountId: parsed.data.accountId,
        tenantId: parsed.data.tenantId,
      },
      include: {
        account: {
          select: { id: true, name: true, number: true }
        },
        tenant: {
          select: { id: true, name: true }
        }
      }
    });

    return successResponse({ transaction }, 201);
  } catch (error) {
    console.error("Create FTD transaction error:", error);
    return errorResponse("Internal server error", 500);
  }
}
