import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { ClientService } from "@/features/clients/services/ClientService";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionCookie();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get("q") || undefined;

        const clients = await ClientService.getAllActive(query);

        return NextResponse.json(clients);
    } catch (error: any) {
        console.error("[API_CLIENTS_GET]", error);
        return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
    }
}
