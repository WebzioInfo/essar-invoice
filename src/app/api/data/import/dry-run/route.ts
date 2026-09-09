// /api/data/import/dry-run/route.ts - Performs dry-run analysis on uploaded CSV/JSON datasets
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { ImportService, ImportEntity } from "@/features/data-management/services/ImportService";

export async function POST(req: NextRequest) {
    try {
        const session = await verifySessionCookie();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const entity = formData.get("entity") as ImportEntity | null;

        if (!file || !entity) {
            return NextResponse.json({ error: "File and entity are required." }, { status: 400 });
        }

        const validEntities: ImportEntity[] = ["products", "clients", "vendors", "stock_adjustments"];
        if (!validEntities.includes(entity)) {
            return NextResponse.json({ error: `Invalid entity. Must be one of: ${validEntities.join(", ")}` }, { status: 400 });
        }

        const fileName = file.name.toLowerCase();
        const format: "csv" | "json" = fileName.endsWith(".json") ? "json" : "csv";

        const textContent = await file.text();
        const records = ImportService.parsePayload(textContent, format);

        if (records.length === 0) {
            return NextResponse.json({ error: "File contains no valid records or is empty." }, { status: 400 });
        }

        const report = await ImportService.runDryRun(entity, records);

        return NextResponse.json(report);
    } catch (e: any) {
        console.error("Dry run error:", e);
        return NextResponse.json({ error: `Dry run failed: ${e.message}` }, { status: 500 });
    }
}
