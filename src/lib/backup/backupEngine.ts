// backupEngine.ts - Complete ERP backup generator compiling .essar-backup ZIP archives
import JSZip from "jszip";
import { PrismaClient } from "@prisma/client";
import { ALL_MODELS_META, getModelMeta } from "./dependencyGraph";
import { serializeModelData } from "./serializer";
import { computeSha256 } from "./checksum";
import { BackupManifest, BackupMetadata } from "./types";

export interface BackupEngineOptions {
    db: PrismaClient;
    backupType?: "FULL" | "SELECTIVE";
    selectedModels?: string[];
    user?: { id: string; name: string | null; email: string } | null;
}

export interface BackupArchiveResult {
    buffer: Buffer;
    fileName: string;
    manifest: BackupManifest;
    metadata: BackupMetadata;
    totalRecords: number;
    byteLength: number;
}

export class BackupEngine {
    /**
     * Generates a complete .essar-backup ZIP archive across all requested models.
     */
    static async generateBackup(options: BackupEngineOptions): Promise<BackupArchiveResult> {
        const { db, backupType = "FULL", selectedModels, user = null } = options;

        const zip = new JSZip();
        const dataFolder = zip.folder("data");
        if (!dataFolder) {
            throw new Error("Failed to initialize zip data folder.");
        }

        // Determine which models to include
        let targetModels = ALL_MODELS_META;
        if (backupType === "SELECTIVE" && selectedModels && selectedModels.length > 0) {
            const selectedSet = new Set(selectedModels);
            targetModels = ALL_MODELS_META.filter(m => selectedSet.has(m.modelName));
        }

        const recordCounts: Record<string, number> = {};
        const checksums: Record<string, string> = {};
        let totalRecords = 0;

        // Fetch company setting for metadata
        let companyName = "Essar Enterprises";
        try {
            const cs = await db.companySetting.findFirst();
            if (cs?.companyName) companyName = cs.companyName;
        } catch {}

        // Query each model in topological order
        for (const meta of targetModels) {
            const delegate = (db as any)[meta.prismaDelegate];
            if (!delegate || typeof delegate.findMany !== "function") {
                console.warn(`Prisma delegate '${meta.prismaDelegate}' not found on client. Skipping.`);
                continue;
            }

            // Retrieve all records (including soft-deleted for disaster recovery)
            const records: any[] = await delegate.findMany({
                orderBy: { [meta.primaryKey]: "asc" },
            });

            const count = records.length;
            recordCounts[meta.modelName] = count;
            totalRecords += count;

            // Serialize data cleanly
            const jsonStr = serializeModelData(records);
            const fileChecksum = computeSha256(jsonStr);

            const filePath = `data/${meta.fileName}`;
            checksums[filePath] = fileChecksum;
            dataFolder.file(meta.fileName, jsonStr);
        }

        const now = new Date();
        const isoDate = now.toISOString();

        // Build Metadata
        const metadata: BackupMetadata = {
            companyName,
            generatedBy: user,
            environment: process.env.NODE_ENV || "production",
            nodeVersion: process.version,
        };
        const metadataJson = JSON.stringify(metadata, null, 2);
        zip.file("metadata.json", metadataJson);
        checksums["metadata.json"] = computeSha256(metadataJson);

        // Build Manifest
        const manifest: BackupManifest = {
            format: "ESSAR_ERP_BACKUP",
            formatVersion: "1.0.0",
            application: "Essar ERP",
            applicationVersion: "2.0.0",
            createdAt: isoDate,
            databaseProvider: "mysql",
            schemaVersion: "2026.08",
            backupType,
            recordCounts,
            includedModels: targetModels.map(m => m.modelName),
            checksums,
            totalRecords,
            sourceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            integrityAlgorithm: "SHA-256",
        };

        const manifestJson = JSON.stringify(manifest, null, 2);
        zip.file("manifest.json", manifestJson);
        zip.file("checksums.json", JSON.stringify(checksums, null, 2));

        // Add README for inspection
        const readmeContent = {
            title: "Essar ERP Disaster Recovery Archive",
            notice: "Confidential ERP Data Backup. To restore, use Settings -> Data Management in Essar ERP.",
            createdAt: isoDate,
            totalModels: targetModels.length,
            totalRecords,
        };
        zip.file("README.json", JSON.stringify(readmeContent, null, 2));

        // Compile archive buffer
        const buffer = await zip.generateAsync({
            type: "nodebuffer",
            compression: "DEFLATE",
            compressionOptions: { level: 9 },
        });

        // Timestamped filename: ESSAR_BACKUP_YYYY-MM-DD_HH-mm-ss.essar-backup
        const datePart = now.toISOString().slice(0, 10);
        const timePart = now.toTimeString().slice(0, 8).replace(/:/g, "-");
        const fileName = `ESSAR_BACKUP_${datePart}_${timePart}.essar-backup`;

        return {
            buffer,
            fileName,
            manifest,
            metadata,
            totalRecords,
            byteLength: buffer.byteLength,
        };
    }
}
