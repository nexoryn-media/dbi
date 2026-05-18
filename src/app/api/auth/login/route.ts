import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signToken, getAuthCookieOptions } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { getTenantFromRequest, errorResponse, successResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Resolve tenant
    const tenant = await getTenantFromRequest(request);
    
    if (!tenant) {
      return errorResponse("Service not configured", 404);
    }

    // Find user in this tenant
    let user = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: normalizedEmail,
        },
      },
    });

    // Fallback: If not found in this specific tenant, check if user is an ADMIN elsewhere
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          role: "ADMIN",
          status: "ACTIVE",
        },
      });
    }

    if (!user) {
      return errorResponse("Invalid email or password", 401);
    }

    // Verify password
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return errorResponse("Invalid email or password", 401);
    }
    
    // Check if user is active
    if (user.status === "PENDING" || user.status === "SUSPENDED" || user.status === "REJECTED") {
      const msg = user.status === "PENDING" 
        ? "Your account is pending approval." 
        : "Your account has been deactivated.";
      return errorResponse(msg, 403);
    }

    // Sign JWT
    const token = signToken({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
    });

    // Set cookie and return
    const response = successResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    response.cookies.set("auth-token", token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Internal server error", 500);
  }
}
