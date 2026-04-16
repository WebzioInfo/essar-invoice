import { Prisma } from "@prisma/client";

/**
 * Returns the Indian Financial Year string for a given date.
 * Indian FY runs April 1 → March 31.
 *
 * Examples:
 *   April 2026  → "26-27"
 *   January 2027 → "26-27"
 *   March 2027   → "26-27"
 *   April 2027   → "27-28"
 */
export function getIndianFY(date: Date): { fy: string; fyStart: Date; fyEnd: Date } {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed; March = 2, April = 3

  const fyStartYear = month >= 3 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;

  return {
    fy: `${String(fyStartYear).slice(-2)}-${String(fyEndYear).slice(-2)}`,
    fyStart: new Date(fyStartYear, 3, 1),   // 1 April
    fyEnd: new Date(fyEndYear, 2, 31, 23, 59, 59, 999), // 31 March end of day
  };
}

/**
 * Generates the next invoice number within the current financial year.
 * Format: PREFIX-YY-YY-NN  e.g. SRB2B-26-27-01
 *
 * The sequence resets to 1 at the start of each new Indian Financial Year.
 *
 * @param tx       Prisma transaction client
 * @param prefix   e.g. "SRB2B"
 * @param docDate  The document date (used to determine the FY)
 */
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  prefix: string,
  docDate: Date
): Promise<string> {
  const { fy, fyStart, fyEnd } = getIndianFY(docDate);

  // Count invoices created in this FY to derive the next sequence
  const countThisFY = await tx.invoice.count({
    where: {
      date: { gte: fyStart, lte: fyEnd },
    },
  });

  const seq = String(countThisFY + 1).padStart(2, "0");
  return `${prefix}-${fy}-${seq}`;
}

/**
 * Generates the next quotation number within the current financial year.
 * Format: PREFIX-YY-YY-NN  e.g. SRQUO-26-27-01
 */
export async function nextQuotationNumber(
  tx: Prisma.TransactionClient,
  prefix: string,
  docDate: Date
): Promise<string> {
  const { fy, fyStart, fyEnd } = getIndianFY(docDate);

  const countThisFY = await tx.quotation.count({
    where: {
      date: { gte: fyStart, lte: fyEnd },
    },
  });

  const seq = String(countThisFY + 1).padStart(2, "0");
  return `${prefix}-${fy}-${seq}`;
}
