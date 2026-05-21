import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { db } from "@/db/prisma/client";
import { StockService } from "@/features/inventory/services/StockService";
import { serializePrisma } from "@/utils/serialization";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q") || "";

        const [rawProducts, inventoryLevels] = await Promise.all([
            db.product.findMany({
                where: { 
                    deletedAt: null,
                    ...(q && {
                        OR: [
                            { sku: { contains: q } },
                            { description: { contains: q } },
                        ]
                    })
                },
                orderBy: { createdAt: "desc" },
            }),
            StockService.getInventoryLevels()
        ]);

        const products = serializePrisma(rawProducts).map((p: any) => ({
            ...p,
            currentStock: inventoryLevels[p.id] || 0
        }));

        return NextResponse.json(products);

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 });
    }
}
