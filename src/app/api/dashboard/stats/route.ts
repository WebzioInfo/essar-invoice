import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { db } from "@/db/prisma/client";
import { InvoiceStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [
            clientCount,
            productCount,
            revenueAgg,
            overdueAgg,
            monthlyRevenue,
            recentInvoices,
            invoiceCount,
            pendingInvoices,
            statusCounts
        ] = await Promise.all([
            db.client.count({ where: { deletedAt: null } }),
            db.product.count({ where: { deletedAt: null } }),
            db.invoice.aggregate({
                where: { deletedAt: null, status: { in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL] } },
                _sum: { grandTotal: true },
            }),
            db.invoice.aggregate({
                where: { deletedAt: null, status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE, InvoiceStatus.DRAFT] } },
                _sum: { grandTotal: true },
            }),
            db.invoice.aggregate({
                where: {
                    deletedAt: null,
                    status: { in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL] },
                    date: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
                _sum: { grandTotal: true },
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
            db.invoice.count({ where: { deletedAt: null } }),
            db.invoice.findMany({
                where: { deletedAt: null, status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIAL] } },
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
            db.invoice.groupBy({
                by: ["status"],
                where: { deletedAt: null },
                _count: { status: true },
            }),
        ]);

        return NextResponse.json({
            kpis: {
                clientCount,
                productCount,
                totalRevenue: revenueAgg._sum.grandTotal || 0,
                totalOutstanding: overdueAgg._sum.grandTotal || 0,
                thisMonthRevenue: monthlyRevenue._sum.grandTotal || 0,
            },
            recentInvoices,
            operational: {
                invoiceCount,
                pendingInvoices,
                statusCounts: statusCounts.reduce((acc: any, s) => {
                    acc[s.status] = s._count.status;
                    return acc;
                }, {}),
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch dashboard stats" }, { status: 500 });
    }
}
