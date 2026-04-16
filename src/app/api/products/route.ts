import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { ProductService } from "@/features/inventory/services/ProductService";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionCookie();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get("q") || undefined;

        const products = await ProductService.getAllActive(query);

        return NextResponse.json(products);
    } catch (error: any) {
        console.error("[API_PRODUCTS_GET]", error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}
