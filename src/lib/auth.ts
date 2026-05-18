import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN = "7d";
const SALT_ROUNDS = 12;
const JWT_ISSUER = "dbi";
const JWT_AUDIENCE = "dbi-users";
const INSECURE_SECRET_MARKERS = [
  "change-me",
  "change-this",
  "secret",
  "password",
];

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();

  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters in production");
    }

    const normalized = secret.toLowerCase();
    if (INSECURE_SECRET_MARKERS.some((marker) => normalized.includes(marker))) {
      throw new Error("JWT_SECRET must be a high-entropy production secret");
    }
  }

  return secret || "development-only-jwt-secret-do-not-use-in-production";
}

// ─── Password Hashing ────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT Token Management ────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Cookie Helpers ──────────────────────────────────────────────

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}
