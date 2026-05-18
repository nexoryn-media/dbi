import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";
import { z } from "zod";

const updateFtdTxSchema = z.object({
  name: z.string().optional(),
  amount: z.number().optional(),
  date: z.string().optional(),
  settled: z.boolean().optional(),
});

/**
 * PATCH /api/ftd-transactions/[id] — Update FTD transaction (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getActiveAuthFromRequest(request);
    if (!auth || !isAdmin(auth)) {
      return errorResponse("Admin access required", 403);
    }

    const body = await request.json();
    const parsed = updateFtdTxSchema.safeParse(body);
    
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const data: any = { ...parsed.data };
    if (data.date) data.date = new Date(data.date);

    const transaction = await prisma.ftdTransaction.update({
      where: { id },
      data,
      include: {
        account: {
          select: { id: true, name: true, number: true }
        },
        tenant: {
          select: { id: true, name: true }
        }
      }
    });

    return successResponse({ transaction });
  } catch (error) {
    console.error("Update FTD transaction error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * DELETE /api/ftd-transactions/[id] — Delete FTD transaction (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getActiveAuthFromRequest(request);
    if (!auth || !isAdmin(auth)) {
      return errorResponse("Admin access required", 403);
    }

    await prisma.ftdTransaction.delete({
      where: { id },
    });

    return successResponse({ message: "Transaction deleted" });
  } catch (error) {
    console.error("Delete FTD transaction error:", error);
    return errorResponse("Internal server error", 500);
  }
}
