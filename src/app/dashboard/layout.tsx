import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentTenant, resolveTheme } from "@/lib/tenant";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) redirect("/login");

  const payload = verifyToken(token);
  if (!payload) redirect("/login");

  // Fetch user and tenant data
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      tenantId: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!user) redirect("/login");

  // Security check: Block users who are not ACTIVE
  if (user.status !== "ACTIVE") {
    // We could redirect to a specific "Pending" page, but for now redirecting to login 
    // is safer as it clears the confusion.
    redirect("/login?error=account_not_active");
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.tenantId !== payload.tenantId) {
    redirect("/login");
  }

  const tenant = await getCurrentTenant();
  const theme = tenant
    ? resolveTheme(tenant.theme as Record<string, unknown>)
    : null;

  // Check if tenant has FTD account
  let hasFtdAccount = false;
  if (user.role === "ADMIN") {
    hasFtdAccount = true;
  } else if (tenant) {
    const ftdCount = await prisma.account.count({
      where: {
        type: "ftd",
        tenants: { some: { id: tenant.id } }
      }
    });
    hasFtdAccount = ftdCount > 0;
  }

  return (
    <DashboardShell
      user={{ ...user, hasFtdAccount }}
      brandName={theme?.brandName || "Dashboard"}
      logoUrl={theme?.logoUrl || ""}
    >
      {children}
    </DashboardShell>
  );
}
