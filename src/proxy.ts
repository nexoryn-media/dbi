import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./lib/auth";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return process.env.NODE_ENV !== "production";
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const tenantOverride =
    process.env.NODE_ENV === "production" ? null : url.searchParams.get("__tenant");
  const hostname = tenantOverride || request.headers.get("host") || "localhost";

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Middleware] Host: ${hostname} | Path: ${url.pathname}`);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-host", hostname);

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") &&
    UNSAFE_METHODS.has(request.method) &&
    !isSameOriginRequest(request)
  ) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
    );
  }

  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    const payload = verifyToken(token);
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete("auth-token");
      return applySecurityHeaders(res);
    }

    requestHeaders.set("x-user-id", payload.userId);
    requestHeaders.set("x-tenant-id", payload.tenantId);
    requestHeaders.set("x-user-role", payload.role);
  }

  return applySecurityHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
