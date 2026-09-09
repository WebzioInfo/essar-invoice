import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { StockService, StockLogType } from "@/features/inventory/services/StockService";
import { serializePrisma } from "@/utils/serialization";

// GET /api/inventory/reconcile - Returns stock discrepancy report across all products
export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const discrepancies = await StockService.checkStockDiscrepancies();
        const mismatches = discrepancies.filter(d => d.hasMismatch);

        return NextResponse.json(serializePrisma({
            totalChecked: discrepancies.length,
            mismatchCount: mismatches.length,
            mismatches,
            allDiscrepancies: discrepancies
        }));
    } catch (error: any) {
        console.error("Reconciliation check failed:", error);
        return NextResponse.json({ error: error.message || "Failed to check stock discrepancies" }, { status: 500 });
    }
}

// POST /api/inventory/reconcile - Reconciles stock for a specific product by creating an ADJUSTMENT stock log
export async function POST(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { productId, expectedStock, reason } = body;

        if (!productId || typeof expectedStock !== "number") {
            return NextResponse.json({ error: "productId and numeric expectedStock are required." }, { status: 400 });
        }

        const discrepancies = await StockService.checkStockDiscrepancies();
        const target = discrepancies.find(d => d.productId === productId);

        if (!target) {
            return NextResponse.json({ error: "Product not found in inventory ledger." }, { status: 404 });
        }

        const delta = expectedStock - target.storedStock;

        if (Math.abs(delta) < 0.0001) {
            return NextResponse.json({ message: "Stock is already at target level. No adjustment needed." });
        }

        const result = await StockService.recordChange({
            productId,
            type: StockLogType.ADJUSTMENT,
            quantityChange: delta,
            notes: reason ? `[RECONCILIATION] ${reason}` : `[RECONCILIATION] Adjusted from ${target.storedStock} to ${expectedStock}`
        });

        return NextResponse.json(serializePrisma({
            success: true,
            productId,
            previousStock: target.storedStock,
            newStock: result.quantityAfter,
            adjustmentDelta: delta,
            logId: result.logId
        }));
    } catch (error: any) {
        console.error("Reconciliation adjustment failed:", error);
        return NextResponse.json({ error: error.message || "Failed to apply reconciliation adjustment" }, { status: 500 });
    }
}
