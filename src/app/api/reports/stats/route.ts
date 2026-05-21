import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { ReportService } from "@/features/reports/services/ReportService";
import { serializePrisma } from "@/utils/serialization";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const currentYear = new Date().getFullYear();

        const [
            monthlyRevenue,
            clientRevenue,
            quarterlySummary,
            lastMonthSummary,
            reconciliation
        ] = await Promise.all([
            ReportService.getMonthlyRevenue(currentYear),
            ReportService.getClientRevenue(5),
            ReportService.getRevenueSummary(new Date(currentYear, 0, 1), new Date(currentYear, 2, 31)),
            ReportService.getRevenueSummary(new Date(currentYear, 1, 1), new Date(currentYear, 1, 28)),
            ReportService.getGstReconciliation(new Date(currentYear, 0, 1), new Date(currentYear, 2, 31))
        ]);

        return NextResponse.json(serializePrisma({
            monthlyRevenue,
            clientRevenue,
            quarterlySummary,
            lastMonthSummary,
            reconciliation
        }));

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch reports stats" }, { status: 500 });
    }
}
