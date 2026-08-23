import { verifySessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BackupService } from "@/features/data-management/services/BackupService";
import { DataManagementView } from "@/features/data-management/components/DataManagementView";

export default async function DataManagementPage() {
    const session = await verifySessionCookie();
    if (!session) redirect("/login");

    const stats = await BackupService.getDatabaseStats();

    return <DataManagementView stats={stats} userRole={session.role || "ADMIN"} />;
}
