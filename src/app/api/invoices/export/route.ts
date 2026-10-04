import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { db } from "@/db/prisma/client";
import { InvoicePdfService, ExportFormat } from "@/features/billing/services/InvoicePdfService";
const archiver = require("archiver");
import { PassThrough } from "stream";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function POST(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { range, startDate, endDate, clientId, status, gstType, format = 'ORIGINAL' } = body;

        const where: any = { deletedAt: null };

        // Date Filters
        const now = new Date();
        if (range === "today") {
            where.date = { gte: startOfDay(now), lte: endOfDay(now) };
        } else if (range === "yesterday") {
            const yesterday = subDays(now, 1);
            where.date = { gte: startOfDay(yesterday), lte: endOfDay(yesterday) };
        } else if (range === "last7") {
            where.date = { gte: subDays(now, 7) };
        } else if (range === "last30") {
            where.date = { gte: subDays(now, 30) };
        } else if (range === "thisMonth") {
            where.date = { gte: startOfMonth(now), lte: endOfMonth(now) };
        } else if (range === "lastMonth") {
            const lastMonth = subMonths(now, 1);
            where.date = { gte: startOfMonth(lastMonth), lte: endOfMonth(lastMonth) };
        } else if (range === "custom" && startDate && endDate) {
            where.date = { gte: new Date(startDate), lte: new Date(endDate) };
        }

        if (clientId) where.clientId = clientId;
        if (status) where.status = status;
        if (gstType) where.gstType = gstType;

        const invoices = await db.invoice.findMany({
            where,
            select: { id: true, invoiceNo: true },
            orderBy: { date: 'asc' }
        });

        if (invoices.length === 0) {
            return NextResponse.json({ error: "No invoices found for the selected filters" }, { status: 404 });
        }

        // Audit & Log Export
        await db.exportLog.create({
            data: {
                userId: session.userId,
                exportType: "INVOICE_ZIP",
                format,
                invoiceCount: invoices.length,
                filters: where,
                status: "COMPLETED"
            }
        });

        const archive = archiver('zip', { zlib: { level: 9 } });
        const stream = new PassThrough();

        (async () => {
            for (const inv of invoices) {
                try {
                    const { buffer, fileName } = await InvoicePdfService.generateInvoicePdf(inv.id, format as ExportFormat);
                    archive.append(buffer, { name: fileName });
                } catch (err) {
                    console.error(`Failed to generate PDF for invoice ${inv.id}:`, err);
                }
            }
            await archive.finalize();
        })();

        archive.pipe(stream);

        const zipFileName = `Invoices_Export_${new Date().toISOString().split('T')[0]}.zip`;

        return new Response(stream as any, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${zipFileName}"`,
            },
        });

    } catch (err: any) {
        console.error("[BULK_EXPORT_ERROR]", err);
        return NextResponse.json({ error: err.message || "Failed to execute bulk invoice export" }, { status: 500 });
    }
}
