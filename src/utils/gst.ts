/**
 * Centralized Indian GST and State Normalization Utility
 * Authoritative source of truth for GST Type selection across Invoices & Quotations.
 *
 * Rules:
 * - Origin State = Company Registered State (Karnataka, Code 29)
 * - Place of Supply (Destination) = Karnataka -> CGST_SGST
 * - Place of Supply (Destination) != Karnataka (any other State / UT) -> IGST
 */

import { roundTo2 } from "./financials";

export type GstType = "CGST_SGST" | "IGST" | "NONE";

/**
 * Standard Indian State and Union Territory mapping (Name -> GST Code, 2-letter Code, Synonyms).
 */
export interface StateMeta {
    canonicalName: string;
    code: string;
    shortCode: string;
    synonyms: string[];
}

export const INDIAN_STATES: StateMeta[] = [
    { canonicalName: "Jammu and Kashmir", code: "01", shortCode: "JK", synonyms: ["j&k", "jammu & kashmir", "jammu"] },
    { canonicalName: "Himachal Pradesh", code: "02", shortCode: "HP", synonyms: ["himachal"] },
    { canonicalName: "Punjab", code: "03", shortCode: "PB", synonyms: [] },
    { canonicalName: "Chandigarh", code: "04", shortCode: "CH", synonyms: [] },
    { canonicalName: "Uttarakhand", code: "05", shortCode: "UK", synonyms: ["uttaranchal"] },
    { canonicalName: "Haryana", code: "06", shortCode: "HR", synonyms: [] },
    { canonicalName: "Delhi", code: "07", shortCode: "DL", synonyms: ["new delhi", "nct of delhi"] },
    { canonicalName: "Rajasthan", code: "08", shortCode: "RJ", synonyms: [] },
    { canonicalName: "Uttar Pradesh", code: "09", shortCode: "UP", synonyms: ["u.p.", "uttar pradesh"] },
    { canonicalName: "Bihar", code: "10", shortCode: "BR", synonyms: [] },
    { canonicalName: "Sikkim", code: "11", shortCode: "SK", synonyms: [] },
    { canonicalName: "Arunachal Pradesh", code: "12", shortCode: "AR", synonyms: [] },
    { canonicalName: "Nagaland", code: "13", shortCode: "NL", synonyms: [] },
    { canonicalName: "Manipur", code: "14", shortCode: "MN", synonyms: [] },
    { canonicalName: "Mizoram", code: "15", shortCode: "MZ", synonyms: [] },
    { canonicalName: "Tripura", code: "16", shortCode: "TR", synonyms: [] },
    { canonicalName: "Meghalaya", code: "17", shortCode: "ML", synonyms: [] },
    { canonicalName: "Assam", code: "18", shortCode: "AS", synonyms: [] },
    { canonicalName: "West Bengal", code: "19", shortCode: "WB", synonyms: ["bengal", "w.b."] },
    { canonicalName: "Jharkhand", code: "20", shortCode: "JH", synonyms: [] },
    { canonicalName: "Odisha", code: "21", shortCode: "OD", synonyms: ["orissa"] },
    { canonicalName: "Chhattisgarh", code: "22", shortCode: "CG", synonyms: ["chhatisgarh"] },
    { canonicalName: "Madhya Pradesh", code: "23", shortCode: "MP", synonyms: ["m.p."] },
    { canonicalName: "Gujarat", code: "24", shortCode: "GJ", synonyms: [] },
    { canonicalName: "Dadra and Nagar Haveli and Daman and Diu", code: "26", shortCode: "DN", synonyms: ["daman", "diu", "dadra"] },
    { canonicalName: "Maharashtra", code: "27", shortCode: "MH", synonyms: [] },
    { canonicalName: "Andhra Pradesh", code: "28", shortCode: "AP", synonyms: ["andhra", "a.p."] },
    { canonicalName: "Karnataka", code: "29", shortCode: "KA", synonyms: ["kar", "karnataka state", "bangalore"] },
    { canonicalName: "Goa", code: "30", shortCode: "GA", synonyms: [] },
    { canonicalName: "Lakshadweep", code: "31", shortCode: "LD", synonyms: [] },
    { canonicalName: "Kerala", code: "32", shortCode: "KL", synonyms: ["keralam", "cochin", "calicut", "trivandrum"] },
    { canonicalName: "Tamil Nadu", code: "33", shortCode: "TN", synonyms: ["tamilnadu", "t.n.", "madras", "chennai"] },
    { canonicalName: "Puducherry", code: "34", shortCode: "PY", synonyms: ["pondicherry"] },
    { canonicalName: "Andaman and Nicobar Islands", code: "35", shortCode: "AN", synonyms: ["andaman"] },
    { canonicalName: "Telangana", code: "36", shortCode: "TS", synonyms: ["tg", "hyderabad"] },
    { canonicalName: "Andhra Pradesh (New)", code: "37", shortCode: "AD", synonyms: [] },
    { canonicalName: "Ladakh", code: "38", shortCode: "LA", synonyms: [] }
];

/**
 * Normalizes an Indian state string into its canonical name.
 * Handles case insensitivity, whitespace, commas, country suffixes (e.g. "Karnataka, India"),
 * state codes ("29", "29 - KARNATAKA"), and short abbreviations ("KA").
 */
export function normalizeIndianState(rawState: string | null | undefined): string {
    if (!rawState) return "Karnataka";

    // 1. Clean string
    let clean = rawState
        .trim()
        .toLowerCase()
        .replace(/[,.-]/g, " ")
        .replace(/\b(india|state|province|district|ut|union territory)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (!clean) return "Karnataka";

    // 2. Direct match against canonical names
    for (const state of INDIAN_STATES) {
        const canonicalLower = state.canonicalName.toLowerCase();
        if (clean === canonicalLower || clean === state.code || clean === state.shortCode.toLowerCase()) {
            return state.canonicalName;
        }
        for (const syn of state.synonyms) {
            if (clean === syn || clean.includes(syn)) {
                return state.canonicalName;
            }
        }
    }

    // 3. Substring / inclusion match
    for (const state of INDIAN_STATES) {
        const canonicalLower = state.canonicalName.toLowerCase();
        if (clean.includes(canonicalLower) || canonicalLower.includes(clean)) {
            return state.canonicalName;
        }
    }

    // Fallback: capitalized original
    return rawState.trim();
}

/**
 * Checks whether a given state matches Karnataka.
 */
export function isKarnatakaState(stateStr: string | null | undefined): boolean {
    if (!stateStr) return true; // Default assumption for empty local entity
    const normalized = normalizeIndianState(stateStr);
    return normalized.toLowerCase() === "karnataka";
}

export interface DocumentAddressSource {
    billingAddress?: { state?: string | null; name?: string | null } | null;
    shippingAddress?: { state?: string | null; name?: string | null } | null;
    shippingSameAsBilling?: boolean;
    client?: { state?: string | null; name?: string | null } | null;
    billingState?: string | null;
    shippingState?: string | null;
    state?: string | null;
}

/**
 * Determines the authoritative Place of Supply state for an Invoice or Quotation.
 *
 * Precedence:
 * 1. If shipping address is separate (`shippingSameAsBilling = false`) and `shippingAddress.state` is present -> shippingState
 * 2. If `shippingSameAsBilling = true` or shipping state is empty -> billingAddress.state
 * 3. Fallback to `client.state`
 * 4. Fallback to `"Karnataka"`
 */
export function determinePlaceOfSupplyState(doc: DocumentAddressSource): string {
    // 1. Separate Shipping Address
    if (doc.shippingSameAsBilling === false) {
        const shipState = doc.shippingAddress?.state || doc.shippingState;
        if (shipState && shipState.trim()) {
            return shipState.trim();
        }
    }

    // 2. Billing Address
    const billState = doc.billingAddress?.state || doc.billingState;
    if (billState && billState.trim()) {
        return billState.trim();
    }

    // 3. Client master state
    if (doc.client?.state && doc.client.state.trim()) {
        return doc.client.state.trim();
    }

    // 4. Direct state field
    if (doc.state && doc.state.trim()) {
        return doc.state.trim();
    }

    return "Karnataka";
}

/**
 * Automatically determines the appropriate GST Type based on the Place of Supply and Origin state.
 *
 * @param placeOfSupplyState The destination / delivery state
 * @param originState The company registered state (defaults to "Karnataka")
 * @returns "CGST_SGST" (Intra-state) if in Karnataka, or "IGST" (Inter-state) if outside Karnataka.
 */
export function determineGstType(
    placeOfSupplyState: string | null | undefined,
    originState: string = "Karnataka"
): "CGST_SGST" | "IGST" {
    if (!placeOfSupplyState || !placeOfSupplyState.trim()) {
        return "CGST_SGST";
    }

    const normDestination = normalizeIndianState(placeOfSupplyState);
    const normOrigin = normalizeIndianState(originState);

    if (normDestination.toLowerCase() === normOrigin.toLowerCase()) {
        return "CGST_SGST";
    }

    return "IGST";
}

/**
 * Computes the exact GST breakdown (CGST, SGST, IGST) from a total tax amount and GST type.
 */
export function calculateGstBreakdown(taxTotal: number, gstType: GstType | string) {
    const tax = roundTo2(taxTotal);
    if (gstType === "CGST_SGST") {
        const half = roundTo2(tax / 2);
        return {
            cgst: half,
            sgst: roundTo2(tax - half), // Guarantees exact match to taxTotal
            igst: 0,
            taxTotal: tax
        };
    }
    if (gstType === "IGST") {
        return {
            cgst: 0,
            sgst: 0,
            igst: tax,
            taxTotal: tax
        };
    }
    return {
        cgst: 0,
        sgst: 0,
        igst: 0,
        taxTotal: 0
    };
}
