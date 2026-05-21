import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { ClientService } from "@/features/clients/services/ClientService";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q") || undefined;

        const clients = await ClientService.getAllActive(q);

        return NextResponse.json(clients);

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch clients" }, { status: 500 });
    }
}
