// CurrencyFormatter.ts

/**
 * Formats a numeric value to Indian Currency format (e.g. ₹ 17,11,000.00).
 */
export function formatCurrency(amount: number): string {
    const rawVal = amount || 0;
    const formattedNum = rawVal.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return `₹ ${formattedNum}`;
}
