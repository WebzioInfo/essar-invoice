import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { db } from "@/db/prisma/client";
import { StockService } from "@/features/inventory/services/StockService";
import { serializePrisma } from "@/utils/serialization";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [products, stockLogs, inventoryLevels] = await Promise.all([
            db.product.findMany({
                where: { deletedAt: null },
                select: { id: true, description: true, sku: true, sellingRate: true, purchaseRate: true },
                orderBy: { description: "asc" }
            }),
            StockService.getStockLogs(undefined, 20),
            StockService.getInventoryLevels()
        ]);

        return NextResponse.json(serializePrisma({
            products,
            stockLogs,
            inventoryLevels
        }));

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch inventory stats" }, { status: 500 });
    }
}
