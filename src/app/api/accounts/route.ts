import { db } from "@/db/prisma/client";
import { FinanceService } from "@/features/billing/services/FinanceService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const accountId = searchParams.get("accountId");

        if (accountId) {
            const account = await db.account.findUnique({
                where: { id: accountId }
            });
            const balance = await FinanceService.getAccountBalance(accountId);
            const history = await db.ledgerEntry.findMany({
                where: {
                    OR: [
                        { debitAccountId: accountId },
                        { creditAccountId: accountId }
                    ]
                },
                orderBy: { date: 'desc' },
                take: 50
            });

            return NextResponse.json({ account, balance, history });
        }

        const accounts = await db.account.findMany({
            orderBy: { name: 'asc' }
        });

        const accountsWithBalance = await Promise.all(accounts.map(async (acc: any) => ({
            ...acc,
            balance: await FinanceService.getAccountBalance(acc.id)
        })));

        return NextResponse.json({ accounts: accountsWithBalance });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to fetch accounts" }, { status: 500 });
    }
}
