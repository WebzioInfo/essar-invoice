import { NextRequest, NextResponse } from 'next/server';
import { verifySessionVerified } from '@/lib/auth-server';
import { InvoiceService } from '@/features/billing/services/InvoiceService';
import { handleActionError } from '@/lib/validation';

const invoiceService = new InvoiceService();

export async function POST(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const invoice = await invoiceService.createInvoice(session.userId, body);

        return NextResponse.json(invoice, { status: 201 });
    } catch (error: any) {
        const handledStatus = error.name === "ValidationError" ? 400 : 500;
        return NextResponse.json(handleActionError(error), { status: handledStatus });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || undefined;
        const q = searchParams.get("q") || undefined;
        const page = parseInt(searchParams.get("page") || "1");

        const data = await invoiceService.getInvoices({ status, q, page });

        return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
