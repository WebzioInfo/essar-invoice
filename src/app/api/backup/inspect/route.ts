// inspect/route.ts - Upload and deeply validate backup archive before restoration
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { BackupService } from "@/features/data-management/services/BackupService";

export async function POST(req: NextRequest) {
    try {
        const session = await verifySessionCookie();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No backup file uploaded." }, { status: 400 });
        }

        // Limit upload size to 100MB
        if (file.size > 100 * 1024 * 1024) {
            return NextResponse.json({ error: "Backup file exceeds maximum permitted size (100MB)." }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const validation = await BackupService.inspectAndValidateArchive(buffer);
        return NextResponse.json(validation);
    } catch (e: any) {
        console.error("Backup inspect error:", e);
        return NextResponse.json({ error: `Failed to inspect backup: ${e.message}` }, { status: 500 });
    }
}
