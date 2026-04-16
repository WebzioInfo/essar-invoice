import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { deleteProductAction } from "@/features/inventory/actions/productActions";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySessionCookie();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const id = (await params).id;
        const res = await deleteProductAction(id);

        if (res && 'error' in res) {
            return NextResponse.json({ error: res.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API_PRODUCTS_DELETE]", error);
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
