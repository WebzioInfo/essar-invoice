import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { db } from "@/db/prisma/client";
import { serializePrisma } from "@/utils/serialization";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [invoices, quotations, purchases] = await Promise.all([
            db.invoice.findMany({
                where: { deletedAt: { not: null } },
                orderBy: { deletedAt: "desc" },
                include: { client: { select: { name: true } } },
            }),
            db.quotation.findMany({
                where: { deletedAt: { not: null } },
                orderBy: { deletedAt: "desc" },
                include: { client: { select: { name: true } } },
            }),
            db.purchase.findMany({
                where: { deletedAt: { not: null } },
                orderBy: { deletedAt: "desc" },
            }),
        ]);

        return NextResponse.json(serializePrisma({
            invoices,
            quotations,
            purchases
        }));

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch trash" }, { status: 500 });
    }
}
