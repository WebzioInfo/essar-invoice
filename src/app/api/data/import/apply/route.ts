// /api/data/import/apply/route.ts - Applies validated import payload to production database safely
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { ImportService, ImportEntity } from "@/features/data-management/services/ImportService";

export async function POST(req: NextRequest) {
    try {
        const session = await verifySessionCookie();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
        }

        const body = await req.json();
        const { entity, records } = body as { entity: ImportEntity; records: any[] };

        if (!entity || !Array.isArray(records) || records.length === 0) {
            return NextResponse.json({ error: "Entity and non-empty records array are required." }, { status: 400 });
        }

        // Re-verify Dry Run validity before applying
        const dryRun = await ImportService.runDryRun(entity, records);
        if (dryRun.errorCount > 0 || dryRun.ambiguousCount > 0) {
            return NextResponse.json({
                error: `Cannot apply import with ${dryRun.errorCount} errors and ${dryRun.ambiguousCount} ambiguous conflicts. Please fix the source data first.`,
                dryRun
            }, { status: 422 });
        }

        const result = await ImportService.applyImport(entity, records);

        return NextResponse.json(result);
    } catch (e: any) {
        console.error("Apply import error:", e);
        return NextResponse.json({ error: `Failed to apply import: ${e.message}` }, { status: 500 });
    }
}
