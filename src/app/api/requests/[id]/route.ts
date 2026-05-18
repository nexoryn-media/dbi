import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";
import { updateRequestSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/requests/:id — Get request detail (cross-tenant for admins)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);

    const { id } = await params;

    const where: Record<string, unknown> = { id };
    if (!isAdmin(auth)) {
      where.tenantId = auth.tenantId;
      where.userId = auth.userId;
    }

    const req = await prisma.request.findFirst({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!req) return errorResponse("Request not found", 404);

    // Strip admin notes for regular users
    if (auth.role === "USER") {
      const { adminNotes, ...sanitized } = req;
      return successResponse({ request: sanitized });
    }

    return successResponse({ request: req });
  } catch (error) {
    console.error("Get request error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/requests/:id — Update request (cross-tenant for admins)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await request.json();

    const parsed = updateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    // Find request (no tenant scoping for admins)
    const where: Record<string, unknown> = { id };
    if (!isAdmin(auth)) {
      where.tenantId = auth.tenantId;
      where.userId = auth.userId;
    }

    const existingRequest = await prisma.request.findFirst({ where });
    if (!existingRequest) return errorResponse("Request not found", 404);

    // Permission check
    const adminUser = isAdmin(auth);
    const isSameTenant = existingRequest.tenantId === auth.tenantId;

    if (!adminUser && !isSameTenant) {
      return errorResponse("Access denied", 403);
    }

    // Prepare update data
    const updateData: any = {};
    
    if (adminUser) {
      if (parsed.data.status) {
        updateData.status = parsed.data.status;
        // Handle timestamps
        if (parsed.data.status === "PENDING") updateData.pendingAt = new Date();
        if (parsed.data.status === "CONFIRMED") updateData.confirmedAt = new Date();
        if (parsed.data.status === "COMPLETED") updateData.completedAt = new Date();
        if (parsed.data.status === "CANCELLED") updateData.cancelledAt = new Date();
      }
      if (parsed.data.adminNotes) updateData.adminNotes = parsed.data.adminNotes;
      if (parsed.data.fileUrl) updateData.fileUrl = parsed.data.fileUrl;
      if (parsed.data.req_numb) updateData.req_numb = parsed.data.req_numb;
      if (parsed.data.req_acc) updateData.req_acc = parsed.data.req_acc;
      if (parsed.data.approveAttachment) updateData.attachmentApprovedAt = new Date();
      if (parsed.data.markMoneyArrived) updateData.moneyArrivedAt = new Date();
    } else {
      // Users can update fileUrl if status is PENDING
      if (parsed.data.fileUrl !== undefined) {
        if (existingRequest.status !== "PENDING") {
          return errorResponse("Can only upload or delete file for pending requests", 400);
        }
        updateData.fileUrl = parsed.data.fileUrl;
      } 
      // Users can CANCEL if status is SUBMITTED
      else if (parsed.data.status === "CANCELLED") {
        if (existingRequest.status !== "SUBMITTED") {
          return errorResponse("Cannot cancel a request that has already been approved", 400);
        }
        updateData.status = "CANCELLED";
        updateData.cancelledAt = new Date();
      }
      else {
        return errorResponse("Users are only allowed to upload files or cancel their requests", 403);
      }
    }

    const updatedRequest = await prisma.request.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return successResponse({ request: updatedRequest });
  } catch (error) {
    console.error("Update request error details:", error);
    return errorResponse("Internal server error", 500);
  }
}
