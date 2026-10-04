import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/prisma/client";
import { FinanceService } from "@/features/billing/services/FinanceService";
import { verifySessionVerified } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        
        await db.$transaction(async (tx) => {
            return await FinanceService.recordFounderDrawal(tx, {
                amount: body.amount,
                sourceAccountId: body.targetAccountId || body.sourceAccountId,
                founderAccountId: body.founderAccountId,
                description: body.description,
            });
        }, { timeout: 30000 });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to record founder drawal" }, { status: 500 });
    }
}
