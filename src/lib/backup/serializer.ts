// serializer.ts - Lossless serialization for Prisma ERP entities
import { Prisma } from "@prisma/client";

/**
 * Transforms database record values into deterministic, JSON-safe structures.
 * Retains Decimal precision, exact ISO dates, and clean nulls.
 */
export function serializeRecord(record: any): any {
    if (record === null || record === undefined) {
        return null;
    }

    if (record instanceof Date) {
        return { $date: record.toISOString() };
    }

    if (record instanceof Prisma.Decimal) {
        return { $decimal: record.toString() };
    }

    if (typeof record === "bigint") {
        return { $bigint: record.toString() };
    }

    if (Array.isArray(record)) {
        return record.map(item => serializeRecord(item));
    }

    if (typeof record === "object") {
        // Special check if object has toString() like Decimal or custom type
        if (record && typeof record.isDecimal === "function" && record.isDecimal()) {
            return { $decimal: record.toString() };
        }

        const out: Record<string, any> = {};
        for (const [key, value] of Object.entries(record)) {
            // Ignore nested relations (we store each model flatly in its own JSON file)
            if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Prisma.Decimal) && !(value && typeof (value as any).isDecimal === "function")) {
                // If it's a plain object (like JSON column or audit log oldValue/newValue), serialize deeply
                if (key === "oldValue" || key === "newValue" || key === "changes" || key === "details") {
                    out[key] = value;
                    continue;
                }
            }
            out[key] = serializeRecord(value);
        }
        return out;
    }

    return record;
}

export function serializeModelData(records: any[]): string {
    const serialized = records.map(r => serializeRecord(r));
    return JSON.stringify(serialized, null, 2);
}
