import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import BetterSqlite3 from "better-sqlite3";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:dev.db",
});
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Create Demo Tenants ─────────────────────────────────────
  const tenantA = await prisma.tenant.upsert({
    where: { slug: "demo-alpha" },
    update: {},
    create: {
      name: "Alpha Corp",
      slug: "demo-alpha",
      domain: "localhost",
      pageTitle: "Alpha Corp Portal",
      metaDescription: "Alpha Corp client dashboard",
      theme: {
        brandName: "Alpha Corp",
        logoUrl: "",
        faviconUrl: "",
        colors: {
          primary: "#3b82f6",
          primaryHover: "#2563eb",
          accent: "#8b5cf6",
          background: "#09090b",
          surface: "#18181b",
          surfaceHover: "#27272a",
          text: "#fafafa",
          textSecondary: "#a1a1aa",
          border: "#27272a",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
        },
        borderRadius: "8px",
        fontFamily: "Inter",
        fontUrl:
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    },
  });

  const tenantB = await prisma.tenant.upsert({
    where: { slug: "demo-beta" },
    update: {},
    create: {
      name: "Beta Industries",
      slug: "demo-beta",
      domain: "beta.localhost",
      pageTitle: "Beta Industries Dashboard",
      metaDescription: "Beta Industries management portal",
      theme: {
        brandName: "Beta Industries",
        logoUrl: "",
        faviconUrl: "",
        colors: {
          primary: "#10b981",
          primaryHover: "#059669",
          accent: "#f59e0b",
          background: "#0a0f0d",
          surface: "#141f1a",
          surfaceHover: "#1a2d24",
          text: "#f0fdf4",
          textSecondary: "#86efac",
          border: "#1a2d24",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
        },
        borderRadius: "12px",
        fontFamily: "Outfit",
        fontUrl:
          "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap",
      },
    },
  });

  console.log("✅ Tenants created:", tenantA.name, "&", tenantB.name);

  // ── Create Demo Users ───────────────────────────────────────
  const hashedPassword = await bcrypt.hash("password123", 12);

  // Tenant A users
  const adminA = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenantA.id, email: "admin@alpha.com" } },
    update: {},
    create: {
      tenantId: tenantA.id,
      email: "admin@alpha.com",
      password: hashedPassword,
      name: "Alice Admin",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const userA1 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenantA.id, email: "user1@alpha.com" } },
    update: {},
    create: {
      tenantId: tenantA.id,
      email: "user1@alpha.com",
      password: hashedPassword,
      name: "Bob User",
      role: "USER",
      status: "ACTIVE",
    },
  });

  const userA2 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenantA.id, email: "user2@alpha.com" } },
    update: {},
    create: {
      tenantId: tenantA.id,
      email: "user2@alpha.com",
      password: hashedPassword,
      name: "Carol Pending",
      role: "USER",
      status: "PENDING",
    },
  });

  // Tenant B users
  const adminB = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenantB.id, email: "admin@beta.com" } },
    update: {},
    create: {
      tenantId: tenantB.id,
      email: "admin@beta.com",
      password: hashedPassword,
      name: "Dan Manager",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const userB1 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenantB.id, email: "user1@beta.com" } },
    update: {},
    create: {
      tenantId: tenantB.id,
      email: "user1@beta.com",
      password: hashedPassword,
      name: "Eve Client",
      role: "USER",
      status: "ACTIVE",
    },
  });

  console.log("✅ Users created");

  // ── Create Demo Requests ────────────────────────────────────
  await prisma.request.createMany({
    data: [
      {
        tenantId: tenantA.id,
        userId: userA1.id,
        req_name: "Hardware Upgrade",
        req_geo: "London, UK",
        req_amo: "£1,200",
        req_type: "Hardware",
        status: "SUBMITTED",
        submittedAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
      {
        tenantId: tenantA.id,
        userId: userA1.id,
        req_name: "Software License",
        req_geo: "Remote",
        req_amo: "$300",
        req_type: "Digital",
        req_numb: "SL-9921",
        req_acc: "ACC-001",
        status: "PENDING",
        submittedAt: new Date(Date.now() - 86400000), // 1 day ago
        pendingAt: new Date(Date.now() - 43200000), // 12 hours ago
      },
      {
        tenantId: tenantB.id,
        userId: userB1.id,
        req_name: "Cloud Hosting",
        req_geo: "US-East",
        req_amo: "$5,000",
        req_type: "Infrastructure",
        req_numb: "CH-552",
        req_acc: "ACC-BETA-01",
        status: "CONFIRMED",
        submittedAt: new Date(Date.now() - 172800000), // 2 days ago
        pendingAt: new Date(Date.now() - 129600000), // 1.5 days ago
        confirmedAt: new Date(Date.now() - 86400000), // 1 day ago
      },
      {
        tenantId: tenantB.id,
        userId: userB1.id,
        req_name: "Consulting Fee",
        req_geo: "Berlin, DE",
        req_amo: "€2,500",
        req_type: "Services",
        req_numb: "CF-221",
        req_acc: "ACC-BETA-02",
        status: "COMPLETED",
        submittedAt: new Date(Date.now() - 259200000), // 3 days ago
        pendingAt: new Date(Date.now() - 216000000), // 2.5 days ago
        confirmedAt: new Date(Date.now() - 172800000), // 2 days ago
        completedAt: new Date(Date.now() - 43200000), // 12 hours ago
      },
    ],
  });

  console.log("✅ Requests created");
  console.log("\n🎉 Seed complete!\n");
  console.log("Demo credentials (all passwords: password123):");
  console.log("─────────────────────────────────────────────");
  console.log("Tenant A (localhost):");
  console.log("  Admin: admin@alpha.com");
  console.log("  User:  user1@alpha.com");
  console.log("  User:  user2@alpha.com (PENDING)");
  console.log("Tenant B (beta.localhost):");
  console.log("  Admin: admin@beta.com");
  console.log("  User:  user1@beta.com");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
