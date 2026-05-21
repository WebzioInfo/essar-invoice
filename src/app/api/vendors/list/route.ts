import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { VendorService } from "@/features/procurement/services/VendorService";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const vendorService = new VendorService();
        const vendors = await vendorService.getAllVendors();

        return NextResponse.json(vendors);

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch vendors" }, { status: 500 });
    }
}
