import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAuthFromRequest, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);

    const adminUser = isAdmin(auth);

    // 1. Request Counts
    const whereBase: any = adminUser ? {} : { tenantId: auth.tenantId, userId: auth.userId };

    const statuses = ["SUBMITTED", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
    const counts: Record<string, number> = {};
    
    // Optimistic parallel queries
    await Promise.all(statuses.map(async (status) => {
      counts[status] = await prisma.request.count({
        where: { ...whereBase, status }
      });
    }));

    // 2. Action Required logic for "Glow"
    let actionRequiredStatus = "";

    if (adminUser) {
      // Admins need to act on SUBMITTED requests, or PENDING requests with uploaded POPs waiting approval
      if (counts["SUBMITTED"] > 0) {
        actionRequiredStatus = "SUBMITTED";
      } else {
        const pendingActionReqs = await prisma.request.count({
          where: {
            ...whereBase,
            status: "PENDING",
            fileUrl: { not: null },
            attachmentApprovedAt: null
          }
        });
        if (pendingActionReqs > 0) {
          actionRequiredStatus = "PENDING";
        }
      }
    } else {
      // Users need to act on PENDING requests that don't have a POP uploaded yet
      const pendingUserAction = await prisma.request.count({
        where: {
          ...whereBase,
          status: "PENDING",
          fileUrl: null
        }
      });
      if (pendingUserAction > 0) {
        actionRequiredStatus = "PENDING";
      }
    }

    // 3. Inactive Account Broadcasts
    const broadcasts = [];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find accounts recently marked inactive that belong to this tenant
    // (For admins, we might not show this, or show it globally, but usually it's for users)
    if (!adminUser) {
      const inactiveAccounts = await prisma.account.findMany({
        where: {
          status: "INACTIVE",
          inactiveAt: { gte: yesterday },
          tenants: { some: { id: auth.tenantId } }
        }
      });

      for (const acc of inactiveAccounts) {
        // Check if there are active requests using this account
        const activeReqs = await prisma.request.count({
          where: {
            tenantId: auth.tenantId,
            status: { in: ["SUBMITTED", "PENDING", "CONFIRMED"] },
            req_numb: acc.number // matching by number
          }
        });

        let msg = "The previously used account is no longer active. We will provide a new one for your next request.";
        let broadcastType = "INFO";

        if (acc.type === "ftd") {
          msg = "Your FTD account is no longer active. We will provide a new one shortly.";
          broadcastType = "WARNING";
        } else if (activeReqs > 0) {
          msg = "The account for your current request is no longer active and your request might be affected. Please contact your account manager.";
          broadcastType = "WARNING";
        }

        broadcasts.push({
          id: `inactive-acc-${acc.id}`,
          message: msg,
          type: broadcastType,
          accountType: acc.type
        });
      }
    }

    // 4. Recent Status Updates for Users (Event Stream)
    const recentUpdates = [];
    if (!adminUser) {
      const updatedReqs = await prisma.request.findMany({
        where: {
          ...whereBase,
        },
        orderBy: { updatedAt: "desc" },
        take: 10 // Fetch more to flatten
      });

      const events: any[] = [];

      for (const req of updatedReqs) {
        // Add events for each milestone
        if (req.pendingAt) {
          events.push({
            id: `ev-${req.id}-pending`,
            message: `Request for ${req.req_amo} € approved.`,
            subMessage: "We have assigned an account for your deposit.",
            timestamp: req.pendingAt
          });
        }
        if (req.attachmentApprovedAt) {
          events.push({
            id: `ev-${req.id}-att-appr`,
            message: "POP Approved",
            subMessage: "We are waiting for your deposit to arrive.",
            timestamp: req.attachmentApprovedAt
          });
        }
        if (req.moneyArrivedAt) {
          events.push({
            id: `ev-${req.id}-money`,
            message: "Deposit is showing up as pending.",
            subMessage: "Money has arrived, but is still pending. This normally resolves in 24h.",
            timestamp: req.moneyArrivedAt
          });
        }
        if (req.confirmedAt) {
          events.push({
            id: `ev-${req.id}-confirmed`,
            message: `Deposit of ${req.req_amo} € confirmed.`,
            subMessage: "Your transfer is confirmed and will be settled soon.",
            timestamp: req.confirmedAt
          });
        }
        if (req.completedAt) {
          events.push({
            id: `ev-${req.id}-completed`,
            message: `Request for ${req.req_amo} € completed.`,
            subMessage: "The transaction has been successfully processed.",
            timestamp: req.completedAt
          });
        }
      }

      // Sort all events by timestamp desc and take 5
      recentUpdates.push(...events
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5)
        .map(e => ({ ...e, type: "STATUS" }))
      );
    }

    return successResponse({ counts, actionRequiredStatus, broadcasts, recentUpdates });
  } catch (error) {
    console.error("Notifications error:", error);
    return errorResponse("Internal server error", 500);
  }
}
