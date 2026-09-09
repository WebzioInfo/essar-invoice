import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { StockService } from "@/features/inventory/services/StockService";
import { serializePrisma } from "@/utils/serialization";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [detailed, stockLogs] = await Promise.all([
            StockService.getDetailedInventory(),
            StockService.getStockLogs(undefined, 50)
        ]);

        const inventoryLevels: Record<string, number> = {};
        detailed.items.forEach(item => {
            inventoryLevels[item.id] = item.currentStock;
        });

        return NextResponse.json(serializePrisma({
            items: detailed.items,
            metrics: detailed.metrics,
            products: detailed.items,
            inventoryLevels,
            stockLogs
        }));

    } catch (error: any) {
        console.error("Failed to fetch inventory stats:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch inventory stats" }, { status: 500 });
    }
}
