import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { generateQuotationPDF } from "@/lib/pdf/generateQuotation";

export async function POST(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { quotationId } = body;

        if (!quotationId) {
            return NextResponse.json({ error: "quotationId is required" }, { status: 400 });
        }

        const { buffer, fileName } = await generateQuotationPDF(quotationId);

        return new NextResponse(buffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${fileName}"`,
                "Content-Length": String(buffer.length),
            },
        });
    } catch (err: unknown) {
        console.error("[QUOTATION_DOWNLOAD_API]", err);
        const message = err instanceof Error ? err.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
