// BackupService.ts - Service orchestrator for data management, backups, and audit logging
import { db } from "@/db/prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { ALL_MODELS_META } from "@/lib/backup/dependencyGraph";
import { BackupEngine, BackupArchiveResult } from "@/lib/backup/backupEngine";
import { BackupValidator } from "@/lib/backup/validation";
import { RestoreEngine } from "@/lib/backup/restoreEngine";
import { RestoreMode, ValidationResult, RestoreExecutionResult } from "@/lib/backup/types";

export interface DatabaseHealthStats {
    totalRecords: number;
    modelCounts: Record<string, number>;
    dbStatus: "HEALTHY" | "DEGRADED";
    lastBackupDate: string | null;
}

export class BackupService {
    /**
     * Retrieves database health statistics across all 21 models.
     */
    static async getDatabaseStats(): Promise<DatabaseHealthStats> {
        const modelCounts: Record<string, number> = {};
        let totalRecords = 0;

        for (const meta of ALL_MODELS_META) {
            const delegate = (db as any)[meta.prismaDelegate];
            if (delegate && typeof delegate.count === "function") {
                try {
                    const count = await delegate.count();
                    modelCounts[meta.modelName] = count;
                    totalRecords += count;
                } catch {
                    modelCounts[meta.modelName] = 0;
                }
            }
        }

        // Find last backup audit log
        let lastBackupDate: string | null = null;
        try {
            const lastAudit = await db.auditLog.findFirst({
                where: { action: { in: ["BACKUP_CREATED", "BACKUP_DOWNLOADED"] } },
                orderBy: { createdAt: "desc" },
            });
            if (lastAudit) {
                lastBackupDate = lastAudit.createdAt.toISOString();
            }
        } catch {}

        return {
            totalRecords,
            modelCounts,
            dbStatus: "HEALTHY",
            lastBackupDate,
        };
    }

    /**
     * Generates a full or selective backup archive.
     */
    static async createBackup(
        user: { id: string; name: string | null; email: string } | null,
        backupType: "FULL" | "SELECTIVE" = "FULL",
        selectedModels?: string[]
    ): Promise<BackupArchiveResult> {
        const result = await BackupEngine.generateBackup({
            db,
            backupType,
            selectedModels,
            user,
        });

        // Record Audit Log
        if (user?.id) {
            recordAuditLog(db, {
                userId: user.id,
                action: "BACKUP_CREATED",
                entityType: "Backup",
                entityId: result.fileName,
                details: {
                    backupType,
                    totalRecords: result.totalRecords,
                    byteLength: result.byteLength,
                    includedModels: result.manifest.includedModels,
                },
            }).catch(() => {});
        }

        return result;
    }

    /**
     * Inspects and deeply validates an uploaded backup archive buffer.
     */
    static async inspectAndValidateArchive(buffer: Buffer): Promise<ValidationResult> {
        const { validation } = await BackupValidator.validateArchive(buffer, db);
        return validation;
    }

    /**
     * Executes restoration from an uploaded backup buffer.
     */
    static async restoreFromArchive(
        buffer: Buffer,
        mode: RestoreMode,
        user: { id: string; name: string | null; email: string } | null
    ): Promise<RestoreExecutionResult> {
        const { validation, parsedData } = await BackupValidator.validateArchive(buffer, db);

        if (!validation.isValid || !parsedData) {
            throw new Error(`Backup validation failed: ${validation.errors.join("; ")}`);
        }

        if (user?.id) {
            recordAuditLog(db, {
                userId: user.id,
                action: "RESTORE_STARTED",
                entityType: "Backup",
                entityId: parsedData.manifest.format,
                details: {
                    mode,
                    totalRecords: validation.totalRecords,
                },
            }).catch(() => {});
        }

        const result = await RestoreEngine.executeRestore({
            db,
            parsedData,
            mode,
            user,
        });

        if (user?.id) {
            recordAuditLog(db, {
                userId: user.id,
                action: result.success ? "RESTORE_COMPLETED" : "RESTORE_FAILED",
                entityType: "Backup",
                entityId: parsedData.manifest.format,
                details: {
                    mode,
                    totalCreated: result.totalCreated,
                    totalUpdated: result.totalUpdated,
                    totalFailed: result.totalFailed,
                },
            }).catch(() => {});
        }

        return result;
    }
}
