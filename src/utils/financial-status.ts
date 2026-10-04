/**
 * Dynamic Status Calculation Engine
 * 
 * In a Ledger-First architecture, the status of a document is a derived property
 * based on its lifecycle state (Finalized vs Draft) and its settlement standing (Allocations).
 */

export type FinancialStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface SettlementData {
    grandTotal: number | { toNumber: () => number };
    isFinalized?: boolean;
    allocations?: { amount: number | { toNumber: () => number } }[];
    dueDate?: Date | string;
}

export function calculateInvoiceStatus(data: SettlementData): FinancialStatus {
    if (data.isFinalized === false) return 'DRAFT';

    const grandTotalNum = typeof data.grandTotal === 'object' && 'toNumber' in data.grandTotal
        ? data.grandTotal.toNumber()
        : Number(data.grandTotal || 0);

    const allocations = data.allocations || [];
    const totalAllocated = allocations.reduce((sum, a) => {
        const amt = typeof a.amount === 'object' && 'toNumber' in a.amount ? a.amount.toNumber() : Number(a.amount || 0);
        return sum + amt;
    }, 0);

    const balanceDue = grandTotalNum - totalAllocated;

    if (balanceDue <= 0.01) return 'PAID';
    if (totalAllocated > 0) return 'PARTIAL';
    
    if (data.dueDate && new Date() > new Date(data.dueDate)) {
        return 'OVERDUE';
    }

    return 'SENT';
}

export function calculatePurchaseStatus(data: SettlementData): FinancialStatus {
    if (data.isFinalized === false) return 'DRAFT';

    const grandTotalNum = typeof data.grandTotal === 'object' && 'toNumber' in data.grandTotal
        ? data.grandTotal.toNumber()
        : Number(data.grandTotal || 0);

    const allocations = data.allocations || [];
    const totalAllocated = allocations.reduce((sum, a) => {
        const amt = typeof a.amount === 'object' && 'toNumber' in a.amount ? a.amount.toNumber() : Number(a.amount || 0);
        return sum + amt;
    }, 0);

    const balanceDue = grandTotalNum - totalAllocated;

    if (balanceDue <= 0.01) return 'PAID';
    if (totalAllocated > 0) return 'PARTIAL';

    return 'SENT';
}
