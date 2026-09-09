import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { StockService } from "@/features/inventory/services/StockService";
import { serializePrisma } from "@/utils/serialization";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const resolvedParams = await params;
        const productId = resolvedParams.id;

        if (!productId) {
            return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
        }

        const logs = await StockService.getStockLogs(productId, 100);

        return NextResponse.json(serializePrisma({
            productId,
            logs
        }));
    } catch (error: any) {
        console.error("Failed to fetch product stock logs:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch logs" }, { status: 500 });
    }
}
