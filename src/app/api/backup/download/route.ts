// download/route.ts - Authenticated streaming endpoint for downloading full or selective .essar-backup archives
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { BackupService } from "@/features/data-management/services/BackupService";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySessionCookie();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = (searchParams.get("type") === "SELECTIVE" ? "SELECTIVE" : "FULL") as "FULL" | "SELECTIVE";
        const modelsParam = searchParams.get("models");
        const selectedModels = modelsParam ? modelsParam.split(",").filter(Boolean) : undefined;

        const backupResult = await BackupService.createBackup(
            { id: session.userId, name: null, email: session.userId },
            type,
            selectedModels
        );

        return new Response(backupResult.buffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="${backupResult.fileName}"`,
                "Content-Length": backupResult.byteLength.toString(),
                "X-Essar-Backup-Records": backupResult.totalRecords.toString(),
            },
        });
    } catch (e: any) {
        console.error("Backup download error:", e);
        return NextResponse.json({ error: `Failed to generate backup: ${e.message}` }, { status: 500 });
    }
}
