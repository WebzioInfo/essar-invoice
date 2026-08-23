import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { db } from "@/db/prisma/client";
import { serializePrisma } from "@/utils/serialization";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const q = (searchParams.get("q") || "").trim();

        // Optimized single query joining stock relation directly
        const rawProducts = await db.product.findMany({
            where: { 
                deletedAt: null,
                ...(q && {
                    OR: [
                        { sku: { contains: q } },
                        { description: { contains: q } },
                        { hsn: { contains: q } },
                    ]
                })
            },
            include: {
                stock: {
                    select: {
                        quantity: true
                    }
                }
            },
            take: 50,
            orderBy: { description: "asc" },
        });

        const products = serializePrisma(rawProducts).map((p: any) => ({
            ...p,
            currentStock: p.stock ? Number(p.stock.quantity) : 0
        }));

        return NextResponse.json(products);

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 });
    }
}
