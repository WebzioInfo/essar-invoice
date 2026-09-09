// ExportService.ts - Professional business data export engine with CSV & JSON formatting
import { db } from "@/db/prisma/client";
import { serializePrisma } from "@/utils/serialization";

export type ExportEntity = "products" | "invoices" | "quotations" | "clients" | "vendors" | "stock_logs";
export type ExportFormat = "csv" | "json";

function sanitizeCsvCell(value: any): string {
    if (value === null || value === undefined) return "";
    let str = typeof value === "object" ? JSON.stringify(value) : String(value);
    
    // Prevent CSV Formula Injection
    if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
    }
    
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function arrayToCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
    const headerLine = headers.map(sanitizeCsvCell).join(",");
    const bodyLines = rows.map(row => row.map(sanitizeCsvCell).join(","));
    return [headerLine, ...bodyLines].join("\r\n");
}

export class ExportService {
    /**
     * Exports datasets in CSV or JSON format with numeric precision and sanitized headers.
     */
    static async exportData(entity: ExportEntity, format: ExportFormat): Promise<{
        content: string;
        fileName: string;
        mimeType: string;
        recordCount: number;
    }> {
        const timestamp = new Date().toISOString().slice(0, 10);
        let records: any[] = [];
        let csvContent = "";
        let fileName = `ESSAR_${entity.toUpperCase()}_${timestamp}`;

        switch (entity) {
            case "products": {
                const [products, stocks] = await Promise.all([
                    (db as any).product.findMany({
                        where: { deletedAt: null },
                        orderBy: { description: "asc" }
                    }),
                    (db as any).stock.findMany()
                ]);

                const stockMap = new Map<string, number>();
                stocks.forEach((s: any) => stockMap.set(s.productId, Number(s.quantity)));

                records = products.map((p: any) => {
                    const stockQty = stockMap.get(p.id) || 0;
                    const qtyPerBox = Number(p.qtyPerBox) || 0;
                    const fullPkg = qtyPerBox > 0 ? Math.floor(Math.abs(stockQty) / qtyPerBox) * Math.sign(stockQty) : 0;
                    const loose = qtyPerBox > 0 ? (stockQty % qtyPerBox) : stockQty;

                    return {
                        id: p.id,
                        sku: p.sku || "",
                        description: p.description,
                        hsn: p.hsn || "",
                        unit: p.unit || "NOS",
                        pkgType: p.pkgType || "BOX",
                        qtyPerBox: qtyPerBox,
                        currentStock: stockQty,
                        totalPackages: fullPkg,
                        looseUnits: loose,
                        purchaseRate: Number(p.purchaseRate) || 0,
                        sellingRate: Number(p.sellingRate) || 0,
                        gstRate: Number(p.gstRate) || 0,
                        active: p.active ? "YES" : "NO",
                        notes: p.notes || ""
                    };
                });

                if (format === "csv") {
                    const headers = [
                        "SKU", "Description", "HSN/SAC", "Unit", "Package Type",
                        "Units Per Pkg", "Current Stock", "Full Packages", "Loose Units",
                        "Purchase Rate (INR)", "Selling Rate (INR)", "GST Rate (%)", "Active", "Notes"
                    ];
                    const rows = records.map(r => [
                        r.sku, r.description, r.hsn, r.unit, r.pkgType,
                        r.qtyPerBox, r.currentStock, r.totalPackages, r.looseUnits,
                        r.purchaseRate, r.sellingRate, r.gstRate, r.active, r.notes
                    ]);
                    csvContent = arrayToCsv(headers, rows);
                }
                break;
            }

            case "invoices": {
                const invoices = await (db as any).invoice.findMany({
                    where: { deletedAt: null },
                    include: {
                        client: { select: { name: true, gst: true } },
                        lineItems: { include: { product: { select: { description: true, sku: true } } } }
                    },
                    orderBy: { date: "desc" }
                });

                records = invoices.map((inv: any) => ({
                    id: inv.id,
                    invoiceNo: inv.invoiceNo,
                    invoiceDate: inv.date ? new Date(inv.date).toISOString().slice(0, 10) : "",
                    clientName: inv.client?.name || inv.billingName || "Direct",
                    clientGstin: inv.client?.gst || inv.billingGst || "",
                    status: inv.status,
                    subTotal: Number(inv.subTotal || 0),
                    taxTotal: Number(inv.taxTotal || 0),
                    grandTotal: Number(inv.grandTotal || 0),
                    itemCount: inv.lineItems ? inv.lineItems.length : 0
                }));

                if (format === "csv") {
                    const headers = [
                        "Invoice No", "Date", "Client Name", "Client GSTIN",
                        "Status", "Sub Total (INR)", "Tax Total (INR)", "Grand Total (INR)", "Line Items"
                    ];
                    const rows = records.map(r => [
                        r.invoiceNo, r.invoiceDate, r.clientName, r.clientGstin,
                        r.status, r.subTotal, r.taxTotal, r.grandTotal, r.itemCount
                    ]);
                    csvContent = arrayToCsv(headers, rows);
                }
                break;
            }

            case "quotations": {
                const quotes = await (db as any).quotation.findMany({
                    where: { deletedAt: null },
                    include: {
                        client: { select: { name: true, gst: true } },
                        lineItems: { include: { product: { select: { description: true, sku: true } } } }
                    },
                    orderBy: { date: "desc" }
                });

                records = quotes.map((q: any) => ({
                    id: q.id,
                    quotationNo: q.quotationNo,
                    quotationDate: q.date ? new Date(q.date).toISOString().slice(0, 10) : "",
                    clientName: q.client?.name || q.billingName || "Direct",
                    clientGstin: q.client?.gst || q.billingGst || "",
                    status: q.status,
                    subTotal: Number(q.subTotal || 0),
                    taxTotal: Number(q.taxTotal || 0),
                    grandTotal: Number(q.grandTotal || 0),
                    itemCount: q.lineItems ? q.lineItems.length : 0
                }));

                if (format === "csv") {
                    const headers = [
                        "Quotation No", "Date", "Client Name", "Client GSTIN",
                        "Status", "Sub Total (INR)", "Tax Total (INR)", "Grand Total (INR)", "Line Items"
                    ];
                    const rows = records.map(r => [
                        r.quotationNo, r.quotationDate, r.clientName, r.clientGstin,
                        r.status, r.subTotal, r.taxTotal, r.grandTotal, r.itemCount
                    ]);
                    csvContent = arrayToCsv(headers, rows);
                }
                break;
            }

            case "clients": {
                const clients = await (db as any).client.findMany({
                    where: { deletedAt: null },
                    orderBy: { name: "asc" }
                });

                records = clients.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    gstin: c.gst || "",
                    phone: c.phone || "",
                    email: c.email || "",
                    state: c.state || "",
                    address: [c.address1, c.address2].filter(Boolean).join(", "),
                    pinCode: c.pinCode || "",
                    active: c.active ? "YES" : "NO"
                }));

                if (format === "csv") {
                    const headers = ["Client Name", "GSTIN", "Phone", "Email", "State", "Pin Code", "Address", "Active"];
                    const rows = records.map(r => [
                        r.name, r.gstin, r.phone, r.email, r.state, r.pinCode, r.address, r.active
                    ]);
                    csvContent = arrayToCsv(headers, rows);
                }
                break;
            }

            case "vendors": {
                const vendors = await (db as any).vendor.findMany({
                    where: { deletedAt: null },
                    orderBy: { name: "asc" }
                });

                records = vendors.map((v: any) => ({
                    id: v.id,
                    name: v.name,
                    gstin: v.gst || "",
                    phone: v.phone || "",
                    email: v.email || "",
                    state: v.state || "",
                    address: [v.address1, v.address2].filter(Boolean).join(", "),
                    pinCode: v.pinCode || "",
                    active: v.active ? "YES" : "NO"
                }));

                if (format === "csv") {
                    const headers = ["Vendor Name", "GSTIN", "Phone", "Email", "State", "Pin Code", "Address", "Active"];
                    const rows = records.map(r => [
                        r.name, r.gstin, r.phone, r.email, r.state, r.pinCode, r.address, r.active
                    ]);
                    csvContent = arrayToCsv(headers, rows);
                }
                break;
            }

            case "stock_logs": {
                const logs = await (db as any).stockLog.findMany({
                    include: { product: { select: { description: true, sku: true, unit: true } } },
                    orderBy: { createdAt: "desc" },
                    take: 1000
                });

                records = logs.map((l: any) => ({
                    id: l.id,
                    timestamp: l.createdAt.toISOString(),
                    product: l.product?.description || "Unknown",
                    sku: l.product?.sku || "",
                    unit: l.product?.unit || "",
                    type: l.type,
                    delta: Number(l.quantityChange),
                    previousBalance: Number(l.quantityBefore),
                    newBalance: Number(l.quantityAfter),
                    referenceId: l.referenceId || "",
                    notes: l.notes || ""
                }));

                if (format === "csv") {
                    const headers = [
                        "Timestamp", "Product", "SKU", "Unit", "Movement Type",
                        "Delta Quantity", "Previous Balance", "New Balance", "Reference", "Notes"
                    ];
                    const rows = records.map(r => [
                        r.timestamp, r.product, r.sku, r.unit, r.type,
                        r.delta, r.previousBalance, r.newBalance, r.referenceId, r.notes
                    ]);
                    csvContent = arrayToCsv(headers, rows);
                }
                break;
            }
        }

        if (format === "json") {
            return {
                content: JSON.stringify(serializePrisma(records), null, 2),
                fileName: `${fileName}.json`,
                mimeType: "application/json",
                recordCount: records.length
            };
        }

        return {
            content: csvContent,
            fileName: `${fileName}.csv`,
            mimeType: "text/csv; charset=utf-8",
            recordCount: records.length
        };
    }
}
