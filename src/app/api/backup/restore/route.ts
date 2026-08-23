// restore/route.ts - Authenticated restore execution API route
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { BackupService } from "@/features/data-management/services/BackupService";
import { RestoreMode } from "@/lib/backup/types";

export async function POST(req: NextRequest) {
    try {
        const session = await verifySessionCookie();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
        }

        // Only ADMIN or MANAGER roles can perform database restore
        if (session.role === "VIEWER") {
            return NextResponse.json({ error: "Forbidden. Super Admin or Manager privilege required." }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const mode = (formData.get("mode") as RestoreMode) || "SAFE_MERGE";

        if (!file) {
            return NextResponse.json({ error: "No backup file provided." }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await BackupService.restoreFromArchive(
            buffer,
            mode,
            { id: session.userId, name: null, email: session.userId }
        );

        return NextResponse.json(result);
    } catch (e: any) {
        console.error("Backup restore error:", e);
        return NextResponse.json({ error: `Restore execution failed: ${e.message}` }, { status: 500 });
    }
}
