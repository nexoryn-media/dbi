import { z } from "zod";

// ─── Auth Schemas ────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(12, "Password must be at least 12 characters"),
  name: z.string().min(1, "Name is required").max(100),
});

// ─── User Schemas ────────────────────────────────────────────────

export const updateUserStatusSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ─── Request Schemas ─────────────────────────────────────────────

export const createRequestSchema = z.object({
  req_name: z.string().min(1, "Name is required").max(100),
  req_geo: z.string().min(1, "Geography is required").max(100),
  req_amo: z.string().min(1, "Amount is required").max(50),
  req_type: z.string().min(1, "Type is required").max(50),
});

export const updateRequestSchema = z.object({
  status: z.enum(["SUBMITTED", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  adminNotes: z.string().max(5000).optional(),
  fileUrl: z.union([
    z.literal(""),
    z.string().regex(
      /^\/uploads\/[0-9a-f-]+\.(jpg|png|webp|gif)$/i,
      "Invalid upload URL"
    ),
  ]).optional(),
  req_numb: z.string().max(100).optional(),
  req_acc: z.string().max(100).optional(),
  approveAttachment: z.boolean().optional(),
  markMoneyArrived: z.boolean().optional(),
});

// ─── Tenant Schemas ──────────────────────────────────────────────

export const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  domain: z.string().min(1),
  pageTitle: z.string().max(100).optional(),
  metaDescription: z.string().max(200).optional(),
  theme: z.record(z.string(), z.unknown()).optional(),
});
