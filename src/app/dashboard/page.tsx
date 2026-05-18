import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestStatus } from "@prisma/client";
import { getCurrentTenant } from "@/lib/tenant";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RequestListCard } from "@/components/dashboard/RequestListCard";
import styles from "./overview.module.css";

export default async function DashboardOverview() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  const payload = verifyToken(token || "");

  if (!payload) return null;

  const isAdmin = payload.role === "ADMIN";

  // Always scope overview to the current tenant (resolved from hostname)
  const currentTenant = await getCurrentTenant();
  if (!currentTenant) return null;

  const tenantWhere = { tenantId: currentTenant.id };

  // Fetch stats + lists scoped to current tenant
  const [
    totalUsers,
    pendingUsers,
    submittedRequests,
    pendingRequests,
    confirmedRequests,
    completedRequests,
    submittedAmount,
    pendingAmount,
    confirmedAmount,
    completedAmount,
    allTenants,
  ] = await Promise.all([
    isAdmin ? prisma.user.count({ where: tenantWhere }) : 0,
    isAdmin ? prisma.user.count({ where: { ...tenantWhere, status: "PENDING" } }) : 0,
    prisma.request.findMany({
      where: { ...tenantWhere, status: RequestStatus.SUBMITTED },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.request.findMany({
      where: { ...tenantWhere, status: RequestStatus.PENDING },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.request.findMany({
      where: { ...tenantWhere, status: RequestStatus.CONFIRMED },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.request.findMany({
      where: { ...tenantWhere, status: RequestStatus.COMPLETED },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.request.findMany({ where: { ...tenantWhere, status: RequestStatus.SUBMITTED }, select: { req_amo: true } }),
    prisma.request.findMany({ where: { ...tenantWhere, status: RequestStatus.PENDING }, select: { req_amo: true } }),
    prisma.request.findMany({ where: { ...tenantWhere, status: RequestStatus.CONFIRMED }, select: { req_amo: true } }),
    prisma.request.findMany({ where: { ...tenantWhere, status: RequestStatus.COMPLETED }, select: { req_amo: true } }),
    // Fetch all tenants for admin quicklinks
    isAdmin ? prisma.tenant.findMany({ select: { id: true, name: true, slug: true, domain: true } }) : [],
  ]);

  const sumAmounts = (items: { req_amo: string }[]) =>
    items.reduce((sum, r) => sum + (parseFloat(r.req_amo.replace(/[^0-9.-]/g, "")) || 0), 0);

  const formatAmount = (n: number) =>
    "€ " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const submittedAmo = sumAmounts(submittedAmount);
  const pendingAmo = sumAmounts(pendingAmount);
  const confirmedAmo = sumAmounts(confirmedAmount);
  const completedAmo = sumAmounts(completedAmount);

  const amountMetrics = [
    { label: "Requested", value: formatAmount(submittedAmo), color: "accent" as const },
    { label: "Pending", value: formatAmount(pendingAmo), color: "warning" as const },
    { label: "Confirmed", value: formatAmount(confirmedAmo), color: "success" as const },
    { label: "Completed", value: formatAmount(completedAmo), color: "success" as const },
  ];

  const countMetrics = isAdmin
    ? [
        { label: "Total Users", value: String(totalUsers), color: "primary" as const },
        { label: "Pending Users", value: String(pendingUsers), color: "warning" as const },
        { label: "Requested", value: String(submittedRequests.length), color: "accent" as const },
        { label: "Completed", value: String(completedRequests.length), color: "success" as const },
      ]
    : [
        { label: "Requested", value: String(submittedRequests.length), color: "accent" as const },
        { label: "Pending", value: String(pendingRequests.length), color: "warning" as const },
        { label: "Confirmed", value: String(confirmedRequests.length), color: "success" as const },
        { label: "Completed", value: String(completedRequests.length), color: "success" as const },
      ];

  const otherTenants = allTenants.filter((t: any) => t.id !== currentTenant.id);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 4 }}>
          Workflow Overview
          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--dash-accent)", marginLeft: 12 }}>
            {currentTenant.name}
          </span>
        </h1>
        <p style={{ color: "var(--dash-text-secondary)", fontSize: "0.875rem" }}>
          {isAdmin ? "Manage requests through approval and confirmation" : "Track your request status and upload documents"}
        </p>
      </div>

      {/* Admin: Quicklinks to other tenants */}
      {isAdmin && otherTenants.length > 0 && (
        <div className={styles.tenantLinks}>
          <span className={styles.tenantLinksLabel}>Switch Tenant:</span>
          {otherTenants.map((t: any) => (
            <a
              key={t.id}
              href={`//${t.domain}/dashboard`}
              className={styles.tenantLink}
            >
              {t.name}
            </a>
          ))}
        </div>
      )}

      {/* Row 1: Amount Totals */}
      <div style={{ marginBottom: 16 }}>
        <StatsCards stats={amountMetrics} />
      </div>

      {/* Row 2: Count Metrics */}
      <div style={{ marginBottom: 32 }}>
        <StatsCards stats={countMetrics} />
      </div>

      {/* Row 3: Request Breakdowns */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
        gap: "24px" 
      }}>
        <RequestListCard 
          title="Requested" 
          requests={submittedRequests} 
          emptyMessage="No requests currently"
        />
        <RequestListCard 
          title="Pending" 
          requests={pendingRequests} 
          emptyMessage="No requests currently"
        />
        <RequestListCard 
          title="Confirmed" 
          requests={confirmedRequests} 
          emptyMessage="No requests currently"
        />
        <RequestListCard 
          title="Completed" 
          requests={completedRequests} 
          emptyMessage="No requests currently"
        />
      </div>
    </div>
  );
}
