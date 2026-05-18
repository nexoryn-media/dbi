import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken, getAuthCookieOptions } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { getTenantFromRequest, getActiveAuthFromRequest, isAdmin, errorResponse, successResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { email, password, name } = parsed.data;

    // Resolve tenant
    const tenant = await getTenantFromRequest(request);
    if (!tenant) {
      return errorResponse("Service not configured", 404);
    }

    // Check if registration requires admin
    const auth = await getActiveAuthFromRequest(request);
    if (auth) {
      // If authenticated, must be admin
      if (!isAdmin(auth)) {
        return errorResponse("Only admins can register new users", 403);
      }
    }
    // If not authenticated, allow self-registration (user will be PENDING)

    // Check if email already exists in this tenant
    const existing = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: email.toLowerCase(),
        },
      },
    });

    if (existing) {
      return errorResponse("An account with this email already exists", 409);
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: "USER",
        status: auth ? "ACTIVE" : "PENDING", // Admin-created users are active immediately
        brand: tenant.brand,
        merchant: tenant.merchant,
      },
    });

    // If self-registration, they are PENDING. Don't sign them in yet.
    if (!auth) {
      return successResponse(
        {
          message: "Registration successful. Your account is pending approval by an administrator.",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
          },
        },
        201
      );
    }

    // Admin-created user — don't sign them in, just return the data
    return successResponse(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      },
      201
    );
  } catch (error) {
    console.error("Register error:", error);
    return errorResponse("Internal server error", 500);
  }
}
