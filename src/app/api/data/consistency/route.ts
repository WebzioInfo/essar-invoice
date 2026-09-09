// /api/data/consistency/route.ts - Database integrity, orphan detection, and constraint consistency auditor
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { db } from "@/db/prisma/client";
import { StockService } from "@/features/inventory/services/StockService";
import { serializePrisma } from "@/utils/serialization";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionCookie();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
        }

        const [
            products,
            stocks,
            invoices,
            invoiceItems,
            quotations,
            clients,
            vendors,
            stockDiscrepancies
        ] = await Promise.all([
            (db as any).product.findMany({ select: { id: true, sku: true, description: true } }),
            (db as any).stock.findMany(),
            (db as any).invoice.findMany({ select: { id: true, invoiceNo: true, clientId: true } }),
            (db as any).invoiceLineItem.findMany({ select: { id: true, invoiceId: true, productId: true } }),
            (db as any).quotation.findMany({ select: { id: true, quotationNo: true, clientId: true } }),
            (db as any).client.findMany({ select: { id: true, name: true, gst: true } }),
            (db as any).vendor.findMany({ select: { id: true, name: true, gst: true } }),
            StockService.checkStockDiscrepancies()
        ]);

        const productIdSet = new Set(products.map((p: any) => p.id));
        const clientIdSet = new Set(clients.map((c: any) => c.id));
        const invoiceIdSet = new Set(invoices.map((i: any) => i.id));

        const orphanInvoiceItems = invoiceItems.filter((item: any) => !invoiceIdSet.has(item.invoiceId) || !productIdSet.has(item.productId));
        const orphanInvoices = invoices.filter((inv: any) => inv.clientId && !clientIdSet.has(inv.clientId));
        const orphanQuotations = quotations.filter((q: any) => q.clientId && !clientIdSet.has(q.clientId));
        const negativeStocks = stocks.filter((s: any) => Number(s.quantity) < 0);
        const stockMismatches = stockDiscrepancies.filter(d => d.hasMismatch);

        // Check for duplicate invoice numbers
        const invoiceNoMap = new Map<string, number>();
        invoices.forEach((i: any) => {
            invoiceNoMap.set(i.invoiceNo, (invoiceNoMap.get(i.invoiceNo) || 0) + 1);
        });
        const duplicateInvoiceNos = Array.from(invoiceNoMap.entries()).filter(([_, count]) => count > 1).map(([no]) => no);

        const isHealthy = 
            orphanInvoiceItems.length === 0 && 
            orphanInvoices.length === 0 && 
            orphanQuotations.length === 0 && 
            duplicateInvoiceNos.length === 0 && 
            stockMismatches.length === 0;

        return NextResponse.json(serializePrisma({
            isHealthy,
            auditTimestamp: new Date().toISOString(),
            metrics: {
                totalProducts: products.length,
                totalInvoices: invoices.length,
                totalClients: clients.length,
                totalVendors: vendors.length,
                totalStocks: stocks.length
            },
            issues: {
                orphanInvoiceItems: orphanInvoiceItems.length,
                orphanInvoices: orphanInvoices.length,
                orphanQuotations: orphanQuotations.length,
                duplicateInvoiceNos,
                negativeStockCount: negativeStocks.length,
                stockMismatchCount: stockMismatches.length,
                stockMismatches: stockMismatches.slice(0, 20)
            }
        }));
    } catch (e: any) {
        console.error("Consistency check failed:", e);
        return NextResponse.json({ error: `Consistency check failed: ${e.message}` }, { status: 500 });
    }
}
