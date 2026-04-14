import { db } from "@/db/prisma/client";
import { verifySessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/features/dashboard/components/DashboardClient";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default async function DashboardPage() {
  const session = await verifySessionCookie();
  if (!session) redirect("/login");

  // ── Parallel data fetching ──
  const [
    invoiceCount,
    clientCount,
    productCount,
    revenueAgg,
    overdueAgg,
    pendingInvoices,
    recentInvoices,
    monthlyRevenue,
    statusCounts,
  ] = await Promise.all([
    db.invoice.count({ where: { deletedAt: null } }),
    db.client.count({ where: { deletedAt: null } }),
    db.product.count({ where: { deletedAt: null } }),
    db.invoice.aggregate({
      where: { deletedAt: null, status: { in: ["PAID", "PARTIAL"] } },
      _sum: { grandTotal: true },
    }),
    db.invoice.aggregate({
      where: { deletedAt: null, status: { in: ["SENT", "OVERDUE", "DRAFT"] } },
      _sum: { grandTotal: true },
    }),
    db.invoice.findMany({
      where: { deletedAt: null, status: { in: ["SENT", "OVERDUE", "PARTIAL"] } },
      orderBy: { grandTotal: "desc" },
      take: 5,
      select: {
          id: true,
          invoiceNo: true,
          grandTotal: true,
          status: true,
          client: { select: { name: true } }
      },
    }),
    db.invoice.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
          id: true,
          invoiceNo: true,
          date: true,
          grandTotal: true,
          status: true,
          client: { select: { name: true } }
      },
    }),
    db.invoice.aggregate({
      where: {
        deletedAt: null,
        status: { in: ["PAID", "PARTIAL"] },
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { grandTotal: true },
    }),
    db.invoice.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { status: true },
    }),
  ]);

  const totalRevenue = revenueAgg._sum.grandTotal?.toNumber() || 0;
  const totalOutstanding = overdueAgg._sum.grandTotal?.toNumber() || 0;
  const thisMonthRevenue = monthlyRevenue._sum.grandTotal?.toNumber() || 0;

  const statusMap: Record<string, number> = {};
  statusCounts.forEach((s) => { statusMap[s.status] = s._count.status; });

  return (
    <ErrorBoundary name="Dashboard">
      <DashboardClient 
        data={{
          invoiceCount,
          clientCount,
          productCount,
          totalRevenue,
          totalOutstanding,
          thisMonthRevenue,
          statusMap,
          pendingInvoices,
          recentInvoices
        }}
      />
    </ErrorBoundary>
  );
}
