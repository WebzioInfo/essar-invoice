import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { db } from "@/db/prisma/client";
import { serializePrisma } from "@/utils/serialization";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q") || "";

        const purchases = await db.purchase.findMany({
            where: {
                deletedAt: null,
                ...(q && {
                    OR: [
                        { purchaseNo: { contains: q } },
                        { vendor: { name: { contains: q } } },
                    ]
                })
            },
            include: { vendor: true },
            orderBy: { date: "desc" }
        });

        return NextResponse.json(serializePrisma(purchases));

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch purchases" }, { status: 500 });
    }
}
