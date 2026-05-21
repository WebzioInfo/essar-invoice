'use server';

import { db } from "@/db/prisma/client";
import { FinanceService } from "@/features/billing/services/FinanceService";
import { verifySessionCookie } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function recordInternalTransfer(params: {
    sourceAccountId: string;
    targetAccountId: string;
    amount: number;
    description?: string;
    date?: Date;
    confirmed?: boolean;
}) {
    const session = await verifySessionCookie();
    if (!session) throw new Error("Unauthorized");

    try {
        const result = await db.$transaction(async (tx) => {
            return await FinanceService.recordTransfer(tx, {
                ...params,
                amount: Number(params.amount)
            });
        });

        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        revalidatePath('/accounts');
        
        return { success: true, data: result };
    } catch (error: any) {
        console.error("[TRANSFER_ACTION_ERROR]", error);
        return { success: false, error: error.message };
    }
}

export async function recordExpenseAction(params: {
    amount: number;
    category: string;
    sourceAccountId: string;
    description?: string;
    date?: Date;
    confirmed?: boolean;
}): Promise<{ success: boolean; data?: any; error?: string; warning?: string }> {
    const session = await verifySessionCookie();
    if (!session) throw new Error("Unauthorized");

    try {
        // Check if balance would go negative (unless confirmed override)
        if (!params.confirmed && params.sourceAccountId) {
            const account = await db.account.findUnique({
                where: { id: params.sourceAccountId },
                select: { openingBalance: true, name: true }
            });
            if (account) {
                const balance = account.openingBalance.toNumber();
                if (balance < params.amount) {
                    return {
                        success: false,
                        warning: `Insufficient balance in account. Available: ₹${balance.toFixed(2)}, Required: ₹${params.amount.toFixed(2)}. Proceed anyway?`
                    };
                }
            }
        }

        const result = await db.$transaction(async (tx) => {
            return await FinanceService.recordExpense(tx, {
                ...params,
                date: params.date || new Date()
            });
        });

        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        revalidatePath('/expenses');
        revalidatePath('/accounts');
        
        return { success: true, data: result };
    } catch (error: any) {
        console.error("[EXPENSE_ACTION_ERROR]", error);
        return { success: false, error: error.message };
    }
}

export async function recordFounderContributionAction(params: {
    amount: number;
    targetAccountId: string;
    founderAccountId: string;
    description?: string;
}) {
    const session = await verifySessionCookie();
    if (!session) throw new Error("Unauthorized");

    try {
        const result = await db.$transaction(async (tx) => {
            return await FinanceService.recordFounderContribution(tx, {
                ...params,
                amount: Number(params.amount)
            });
        });

        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        revalidatePath('/accounts');
        
        return { success: true, data: result };
    } catch (error: any) {
        console.error("[FOUNDER_CONTRIBUTION_ERROR]", error);
        return { success: false, error: error.message };
    }
}

export async function recordFounderDrawalAction(params: {
    amount: number;
    sourceAccountId: string;
    founderAccountId: string;
    description?: string;
}) {
    const session = await verifySessionCookie();
    if (!session) throw new Error("Unauthorized");

    try {
        const result = await db.$transaction(async (tx) => {
            return await FinanceService.recordFounderDrawal(tx, {
                ...params,
                amount: Number(params.amount)
            });
        });

        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        revalidatePath('/accounts');
        
        return { success: true, data: result };
    } catch (error: any) {
        console.error("[FOUNDER_DRAWAL_ERROR]", error);
        return { success: false, error: error.message };
    }
}
