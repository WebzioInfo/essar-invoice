import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { InvoiceShareService } from "@/features/billing/services/InvoiceShareService";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const params = await props.params;
        const invoiceId = params.id;
        const body = await req.json();
        const { channel, overrideRecipient } = body;

        if (channel === "whatsapp") {
            const result = await InvoiceShareService.prepareWhatsAppShare(
                session.userId,
                invoiceId,
                "FOLLOWUP",
                overrideRecipient
            );
            return NextResponse.json(result);
        } else if (channel === "email") {
            const result = await InvoiceShareService.sendEmail(
                session.userId,
                invoiceId,
                "FOLLOWUP",
                overrideRecipient
            );
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ error: "Invalid followup channel specified." }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to process payment follow-up" }, { status: 400 });
    }
}
