import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Prevent multiple Prisma Client instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const DEFAULT_DEV_DATABASE_URL = "file:./dev.db";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const isProductionBuild =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build";

  if (process.env.NODE_ENV === "production" && !isProductionBuild) {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL must be set in production");
    }

    if (databaseUrl === DEFAULT_DEV_DATABASE_URL || databaseUrl.includes("dev.db")) {
      throw new Error("Production DATABASE_URL must not point to the development database");
    }
  }

  return databaseUrl || DEFAULT_DEV_DATABASE_URL;
}

const adapter = new PrismaBetterSqlite3({
  url: getDatabaseUrl(),
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
