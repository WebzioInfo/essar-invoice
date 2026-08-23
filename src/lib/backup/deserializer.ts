// deserializer.ts - Lossless deserialization restoring Prisma Decimal and Date objects
import { Prisma } from "@prisma/client";

/**
 * Reconstructs rich types (Decimal, Date, BigInt) from backup JSON structures.
 */
export function deserializeValue(val: any): any {
    if (val === null || val === undefined) {
        return null;
    }

    if (typeof val === "object") {
        if ("$date" in val && typeof val.$date === "string") {
            return new Date(val.$date);
        }
        if ("$decimal" in val && typeof val.$decimal === "string") {
            return new Prisma.Decimal(val.$decimal);
        }
        if ("$bigint" in val && typeof val.$bigint === "string") {
            return BigInt(val.$bigint);
        }

        if (Array.isArray(val)) {
            return val.map(item => deserializeValue(item));
        }

        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
            out[k] = deserializeValue(v);
        }
        return out;
    }

    // Auto-detect ISO date strings if not wrapped
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(val)) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d;
        }
    }

    return val;
}

export function deserializeModelRecords(jsonStr: string): any[] {
    const raw = JSON.parse(jsonStr);
    if (!Array.isArray(raw)) {
        throw new Error("Expected JSON array of records.");
    }
    return raw.map(r => deserializeValue(r));
}
