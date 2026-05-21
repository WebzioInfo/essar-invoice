import { db } from "@/db/prisma/client";
import { Prisma } from "@prisma/client";
export type LedgerTransactionType = 'PAYMENT_RECEIVED' | 'PAYMENT_MADE' | 'EXPENSE' | 'INVOICE' | 'PURCHASE' | 'FOUNDER_CONTRIBUTION' | 'FOUNDER_WITHDRAWAL' | 'TRANSFER';
export type AccountType = 'CASH' | 'BANK' | 'CLIENT' | 'SUPPLIER' | 'EXPENSE' | 'PURCHASE' | 'REVENUE' | 'LOAN' | 'ADVANCE' | 'EQUITY';
export const AccountType = {
  CASH: 'CASH' as AccountType,
  BANK: 'BANK' as AccountType,
  CLIENT: 'CLIENT' as AccountType,
  SUPPLIER: 'SUPPLIER' as AccountType,
  EXPENSE: 'EXPENSE' as AccountType,
  PURCHASE: 'PURCHASE' as AccountType,
  REVENUE: 'REVENUE' as AccountType,
  LOAN: 'LOAN' as AccountType,
  ADVANCE: 'ADVANCE' as AccountType,
  EQUITY: 'EQUITY' as AccountType,
};

export class FinanceService {
    /**
     * Records a double-entry transaction in the ledger.
     * Ensure this is called within a transaction (tx).
     */
    static async recordTransaction(tx: any, params: {
        debitAccountId: string;
        creditAccountId: string;
        amount: number | Prisma.Decimal;
        transactionType?: string;
        referenceType?: string;
        referenceId?: string;
        description?: string;
        date?: Date;
    }) {
        // 1. Enforce Global Rounding (2 decimal places)
        const amount = Number(parseFloat(params.amount.toString()).toFixed(2));

        if (amount <= 0) return null;

        // 2. Create the Ledger Entry - EXPLICITLY omitting transactionType for DB compatibility
        const { transactionType, ...rest } = params;
        
        return await tx.ledgerEntry.create({
            data: {
                debitAccountId: rest.debitAccountId,
                creditAccountId: rest.creditAccountId,
                amount,
                date: rest.date || new Date(),
                referenceType: rest.referenceType,
                referenceId: rest.referenceId,
                description: rest.description
            },
            select: {
                id: true,
                debitAccountId: true,
                creditAccountId: true,
                amount: true,
                date: true,
                referenceType: true,
                referenceId: true,
                description: true,
                createdAt: true,
            }
        });
    }

    /**
     * Reverses a previously recorded transaction by creating an exact opposite entry.
     * This is the strict accounting way to "delete" or "edit" a ledger entry.
     */
    static async reverseTransaction(tx: any, originalEntryId: string, reason: string) {
        const original = await tx.ledgerEntry.findUnique({ where: { id: originalEntryId } });
        if (!original) throw new Error("Original transaction not found for reversal");

        // Create the reversing entry: Debit becomes Credit, Credit becomes Debit
        // Explicitly omit transactionType
        const { transactionType, ...data } = original;

        const reversal = await tx.ledgerEntry.create({
            data: {
                debitAccountId: data.creditAccountId, // Flipped
                creditAccountId: data.debitAccountId, // Flipped
                amount: data.amount,
                referenceType: data.referenceType,
                referenceId: data.referenceId,
                description: `REVERSAL: ${data.description} (${reason})`,
                date: new Date(),
            },
            select: {
                id: true,
                debitAccountId: true,
                creditAccountId: true,
                amount: true,
                date: true,
                referenceType: true,
                referenceId: true,
                description: true,
                createdAt: true
            }
        });

        return reversal;
    }

    /**
     * Calculates the current balance of an account.
     * Formula: SUM(Debits) - SUM(Credits)
     */
    static async getAccountBalance(accountId: string, tx?: any, startDate?: Date, endDate?: Date): Promise<number> {
        const client = tx || db;
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = startDate;
        if (endDate) dateFilter.lte = endDate;

        const dateQuery = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

        const [debits, credits] = await Promise.all([
            client.ledgerEntry.aggregate({
                where: { debitAccountId: accountId, ...dateQuery },
                _sum: { amount: true }
            }),
            client.ledgerEntry.aggregate({
                where: { creditAccountId: accountId, ...dateQuery },
                _sum: { amount: true }
            })
        ]);

        const debitTotal = debits._sum.amount?.toNumber() || 0;
        const creditTotal = credits._sum.amount?.toNumber() || 0;

        return Number((debitTotal - creditTotal).toFixed(2));
    }

    /**
     * Helper to find or create a system account (Cash, Bank, Revenue etc)
     */
    static async getSystemAccount(type: AccountType, tx?: any) {
        const client = tx || db;
        let account = await client.account.findFirst({
            where: { type }
        });

        if (!account) {
            account = await client.account.create({
                data: {
                    name: `System ${type} Account`,
                    type,
                    active: true
                }
            });
        }
        return account;
    }

    /**
     * Records a business expense.
     * Debit: Expense Account
     * Credit: Source Account (Cash/Bank/Founder)
     */
    static async recordExpense(tx: any, params: {
        amount: number;
        category: string;
        sourceAccountId: string;
        description?: string;
        date?: Date;
    }) {
        const expenseAccount = await this.getSystemAccount(AccountType.EXPENSE, tx);
        if (!expenseAccount) throw new Error("Expense account not found in chart of accounts.");

        // 1. Record the Ledger Entry
        await this.recordTransaction(tx, {
            debitAccountId: expenseAccount.id,
            creditAccountId: params.sourceAccountId,
            amount: params.amount,
            referenceType: 'EXPENSE',
            description: `Expense: ${params.category} - ${params.description || ''}`,
            date: params.date || new Date(),
        });

        // 2. Create the Expense Record for detailed tracking
        return await tx.expense.create({
            data: {
                amount: params.amount,
                category: params.category,
                description: params.description,
                date: params.date || new Date(),
            }
        });
    }

    /**
     * Records a Founder Contribution (Equity Infusion).
     * Debit: Cash/Bank
     * Credit: Founder Account
     */
    static async recordFounderContribution(tx: any, params: {
        amount: number;
        targetAccountId: string; // Bank or Cash
        founderAccountId: string;
        description?: string;
    }) {
        return await this.recordTransaction(tx, {
            debitAccountId: params.targetAccountId,
            creditAccountId: params.founderAccountId,
            amount: params.amount,
            referenceType: 'ADJUSTMENT',
            description: params.description || 'Founder Capital Infusion',
            date: new Date(),
        });
    }

    /**
     * Records a Founder Drawal (Personal withdrawal).
     * Debit: Founder Account
     * Credit: Cash/Bank
     */
    static async recordFounderDrawal(tx: any, params: {
        amount: number;
        sourceAccountId: string; // Bank or Cash
        founderAccountId: string;
        description?: string;
    }) {
        return await this.recordTransaction(tx, {
            debitAccountId: params.founderAccountId,
            creditAccountId: params.sourceAccountId,
            amount: params.amount,
            referenceType: 'ADJUSTMENT',
            description: params.description || 'Founder Personal Drawal',
            date: new Date(),
        });
    }

    /**
     * Helper to get a Client or Vendor account
     */
    static async getPartyAccount(partyId: string, partyType: 'CLIENT' | 'SUPPLIER' | 'EQUITY', tx?: any) {
        const client = tx || db;
        
        if (partyType === 'CLIENT') {
            let account = await (client as any).account.findUnique({ where: { clientId: partyId } });
            if (!account) {
                const clientData = await (client as any).client.findUnique({ where: { id: partyId } });
                if (!clientData) return null;
                account = await (client as any).account.create({
                    data: {
                        name: `Receivable: ${clientData.name}`,
                        type: 'CLIENT',
                        clientId: partyId,
                        active: true
                    }
                });
            }
            return account;
        } else if (partyType === 'SUPPLIER') {
            let account = await (client as any).account.findUnique({ where: { vendorId: partyId } });
            if (!account) {
                const vendorData = await (client as any).vendor.findUnique({ where: { id: partyId } });
                if (!vendorData) return null;
                account = await (client as any).account.create({
                    data: {
                        name: `Payable: ${vendorData.name}`,
                        type: 'SUPPLIER',
                        vendorId: partyId,
                        active: true
                    }
                });
            }
            return account;
        } else {
            return await client.account.findFirst({ where: { type: 'EQUITY' } });
        }
    }

    /**
     * Records an internal money transfer between two system accounts.
     * Debit: Target Account (Receiver)
     * Credit: Source Account (Sender)
     */
    static async recordTransfer(tx: any, params: {
        sourceAccountId: string;
        targetAccountId: string;
        amount: number;
        description?: string;
        date?: Date;
    }) {
        return await this.recordTransaction(tx, {
            debitAccountId: params.targetAccountId,
            creditAccountId: params.sourceAccountId,
            amount: params.amount,
            referenceType: 'ADJUSTMENT',
            description: params.description || 'Internal Money Transfer',
            date: params.date || new Date(),
        });
    }

    /**
     * Standardized fetch for recent ledger entries.
     */
    static async getRecentTransactions(limit: number = 10) {
        return await db.ledgerEntry.findMany({
            take: limit,
            orderBy: { date: 'desc' },
            select: {
                id: true,
                amount: true,
                date: true,
                description: true,
                referenceType: true,
                referenceId: true,
                debitAccountId: true,
                creditAccountId: true,
                createdAt: true,
                debitAccount: { select: { id: true, name: true, type: true } },
                creditAccount: { select: { id: true, name: true, type: true } },
            }
        });
    }

}
