// /api/data/export/route.ts - Business data export route (CSV & JSON)
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { ExportService, ExportEntity, ExportFormat } from "@/features/data-management/services/ExportService";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionCookie();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const entity = (searchParams.get("entity") || "products") as ExportEntity;
        const format = (searchParams.get("format") || "csv") as ExportFormat;

        const validEntities = ["products", "invoices", "quotations", "clients", "vendors", "stock_logs"];
        if (!validEntities.includes(entity)) {
            return NextResponse.json({ error: `Invalid entity. Must be one of: ${validEntities.join(", ")}` }, { status: 400 });
        }

        const validFormats = ["csv", "json"];
        if (!validFormats.includes(format)) {
            return NextResponse.json({ error: "Invalid format. Must be 'csv' or 'json'" }, { status: 400 });
        }

        const exportResult = await ExportService.exportData(entity, format);

        return new Response(exportResult.content, {
            status: 200,
            headers: {
                "Content-Type": exportResult.mimeType,
                "Content-Disposition": `attachment; filename="${exportResult.fileName}"`,
                "X-Essar-Export-Count": exportResult.recordCount.toString(),
            },
        });
    } catch (e: any) {
        console.error("Export error:", e);
        return NextResponse.json({ error: `Failed to export data: ${e.message}` }, { status: 500 });
    }
}
