import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { PurchaseService } from "@/features/procurement/services/PurchaseService";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionCookie();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get("q") || undefined;

        const purchaseService = new PurchaseService();
        const { data: purchases } = await purchaseService.getAllPurchases();

        // Filter on server if query is present
        let filtered = purchases;
        if (query) {
            const q = query.toLowerCase();
            filtered = purchases.filter((p: any) => 
                p.purchaseNo.toLowerCase().includes(q) ||
                p.vendor?.name.toLowerCase().includes(q)
            );
        }

        return NextResponse.json(filtered);
    } catch (error: any) {
        console.error("[API_PURCHASES_GET]", error);
        return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
    }
}
