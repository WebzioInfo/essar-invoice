// validation.ts - Comprehensive multi-tier validation engine for ERP backups
import JSZip from "jszip";
import { PrismaClient } from "@prisma/client";
import { ALL_MODELS_META, getModelMeta } from "./dependencyGraph";
import { deserializeModelRecords } from "./deserializer";
import { verifySha256 } from "./checksum";
import { BackupManifest, BackupMetadata, ConflictItem, ModelValidationSummary, ValidationResult } from "./types";

export interface ParsedBackupData {
    manifest: BackupManifest;
    metadata: BackupMetadata | null;
    recordsByModel: Map<string, any[]>;
}

export class BackupValidator {
    /**
     * Deeply validates an uploaded .essar-backup ZIP buffer without modifying the database.
     */
    static async validateArchive(
        buffer: Buffer,
        db: PrismaClient
    ): Promise<{ validation: ValidationResult; parsedData: ParsedBackupData | null }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const modelSummaries: ModelValidationSummary[] = [];
        const conflicts: ConflictItem[] = [];
        const modelCounts: Record<string, number> = {};

        let zip: JSZip;
        try {
            zip = await JSZip.loadAsync(buffer);
        } catch (e: any) {
            errors.push(`Corrupt or invalid ZIP archive: ${e.message}`);
            return {
                validation: {
                    isValid: false,
                    formatValid: false,
                    checksumsValid: false,
                    schemaCompatible: false,
                    manifest: null,
                    metadata: null,
                    modelCounts: {},
                    totalRecords: 0,
                    errors,
                    warnings,
                    modelSummaries: [],
                    conflicts: [],
                    canRestoreSafeMerge: false,
                    canRestoreEmptyDb: false,
                    canRestoreReplaceAll: false,
                },
                parsedData: null,
            };
        }

        // 1. Verify Manifest
        const manifestFile = zip.file("manifest.json");
        if (!manifestFile) {
            errors.push("Missing 'manifest.json' inside backup archive.");
            return {
                validation: {
                    isValid: false,
                    formatValid: false,
                    checksumsValid: false,
                    schemaCompatible: false,
                    manifest: null,
                    metadata: null,
                    modelCounts: {},
                    totalRecords: 0,
                    errors,
                    warnings,
                    modelSummaries: [],
                    conflicts: [],
                    canRestoreSafeMerge: false,
                    canRestoreEmptyDb: false,
                    canRestoreReplaceAll: false,
                },
                parsedData: null,
            };
        }

        let manifest: BackupManifest;
        try {
            const manifestStr = await manifestFile.async("string");
            manifest = JSON.parse(manifestStr);
        } catch (e: any) {
            errors.push(`Malformed 'manifest.json': ${e.message}`);
            return {
                validation: {
                    isValid: false,
                    formatValid: false,
                    checksumsValid: false,
                    schemaCompatible: false,
                    manifest: null,
                    metadata: null,
                    modelCounts: {},
                    totalRecords: 0,
                    errors,
                    warnings,
                    modelSummaries: [],
                    conflicts: [],
                    canRestoreSafeMerge: false,
                    canRestoreEmptyDb: false,
                    canRestoreReplaceAll: false,
                },
                parsedData: null,
            };
        }

        if (manifest.format !== "ESSAR_ERP_BACKUP") {
            errors.push(`Unsupported backup format: '${manifest.format}'. Expected 'ESSAR_ERP_BACKUP'.`);
        }

        // 2. Parse Metadata if present
        let metadata: BackupMetadata | null = null;
        const metadataFile = zip.file("metadata.json");
        if (metadataFile) {
            try {
                const metaStr = await metadataFile.async("string");
                metadata = JSON.parse(metaStr);
            } catch {}
        }

        // 3. Verify Checksums and Extract Data Files
        let checksumsValid = true;
        const recordsByModel = new Map<string, any[]>();
        const allParsedIdsByModel = new Map<string, Set<string>>();

        for (const meta of ALL_MODELS_META) {
            const filePath = `data/${meta.fileName}`;
            const file = zip.file(filePath);

            if (!file) {
                // If model was included in manifest but missing from zip
                if (manifest.includedModels.includes(meta.modelName)) {
                    errors.push(`Model '${meta.modelName}' declared in manifest but '${filePath}' is missing in archive.`);
                }
                continue;
            }

            const contentStr = await file.async("string");

            // Verify SHA-256 hash if present in manifest
            const expectedHash = manifest.checksums?.[filePath];
            if (expectedHash) {
                const isHashMatch = verifySha256(contentStr, expectedHash);
                if (!isHashMatch) {
                    checksumsValid = false;
                    errors.push(`Checksum mismatch in '${filePath}'. The file may be corrupt or tampered.`);
                }
            }

            // Parse model records
            let records: any[] = [];
            const modelErrors: string[] = [];
            try {
                records = deserializeModelRecords(contentStr);
            } catch (e: any) {
                modelErrors.push(`Failed to parse JSON in '${filePath}': ${e.message}`);
                errors.push(`Failed to parse '${filePath}': ${e.message}`);
            }

            const expectedCount = manifest.recordCounts?.[meta.modelName] ?? records.length;
            if (records.length !== expectedCount) {
                warnings.push(`Record count mismatch for ${meta.modelName}: manifest says ${expectedCount}, found ${records.length}.`);
            }

            // Validate internal primary keys and uniqueness
            const seenIds = new Set<string>();
            const duplicateIds: string[] = [];

            for (const r of records) {
                const pk = r[meta.primaryKey];
                if (!pk) {
                    modelErrors.push(`Record missing primary key '${meta.primaryKey}'.`);
                    continue;
                }
                if (seenIds.has(pk)) {
                    duplicateIds.push(pk);
                } else {
                    seenIds.add(pk);
                }
            }

            if (duplicateIds.length > 0) {
                modelErrors.push(`Found ${duplicateIds.length} duplicate primary key(s) inside ${meta.modelName}.`);
                errors.push(`Duplicate primary keys in ${meta.modelName}: ${duplicateIds.slice(0, 3).join(", ")}...`);
            }

            allParsedIdsByModel.set(meta.modelName, seenIds);
            recordsByModel.set(meta.modelName, records);
            modelCounts[meta.modelName] = records.length;

            modelSummaries.push({
                modelName: meta.modelName,
                recordCount: records.length,
                validCount: records.length - modelErrors.length,
                invalidCount: modelErrors.length,
                errors: modelErrors,
            });
        }

        // 4. Foreign Key Referential Integrity Analysis
        for (const meta of ALL_MODELS_META) {
            const records = recordsByModel.get(meta.modelName) || [];
            for (const fk of meta.foreignKeys) {
                const parentIdsInBackup = allParsedIdsByModel.get(fk.parentModel);

                for (const r of records) {
                    const fkVal = r[fk.field];
                    if (!fkVal) continue; // nullable foreign key

                    const existsInBackup = parentIdsInBackup?.has(fkVal);
                    if (!existsInBackup) {
                        // Check if it exists in the live database
                        const parentMeta = getModelMeta(fk.parentModel);
                        if (parentMeta) {
                            try {
                                const parentDelegate = (db as any)[parentMeta.prismaDelegate];
                                const inDb = await parentDelegate.findUnique({ where: { [parentMeta.primaryKey]: fkVal } });
                                if (!inDb) {
                                    warnings.push(`Foreign key reference '${fk.field}: ${fkVal}' in ${meta.modelName} (ID: ${r.id}) not found in backup or live database.`);
                                }
                            } catch {}
                        }
                    }
                }
            }
        }

        // 5. Check Live Database for Conflicts (Safe Merge Analysis)
        let totalLiveRecords = 0;
        for (const meta of ALL_MODELS_META) {
            const delegate = (db as any)[meta.prismaDelegate];
            if (!delegate) continue;

            const records = recordsByModel.get(meta.modelName) || [];
            if (records.length === 0) continue;

            try {
                const liveCount = await delegate.count();
                totalLiveRecords += liveCount;

                // Sample collision checks for unique keys / IDs
                const idsToCheck = records.map(r => r[meta.primaryKey]).slice(0, 50);
                const existing = await delegate.findMany({
                    where: { [meta.primaryKey]: { in: idsToCheck } },
                });

                for (const liveRec of existing) {
                    const backupRec = records.find(r => r[meta.primaryKey] === liveRec[meta.primaryKey]);
                    if (backupRec) {
                        // Check if contents differ
                        const isIdentical = JSON.stringify(liveRec) === JSON.stringify(backupRec);
                        if (!isIdentical) {
                            conflicts.push({
                                modelName: meta.modelName,
                                recordId: liveRec[meta.primaryKey],
                                identifierLabel: `${meta.label} (${liveRec[meta.primaryKey]})`,
                                conflictType: "ID_EXISTS_WITH_DIFF_DATA",
                                existingSummary: { id: liveRec.id, updatedAt: liveRec.updatedAt },
                                backupSummary: { id: backupRec.id, updatedAt: backupRec.updatedAt },
                                proposedAction: "UPDATE",
                            });
                        }
                    }
                }
            } catch (e: any) {
                warnings.push(`Could not check live collisions for ${meta.modelName}: ${e.message}`);
            }
        }

        const totalRecords = Object.values(modelCounts).reduce((a, b) => a + b, 0);
        const isValid = errors.length === 0 && checksumsValid;

        const validation: ValidationResult = {
            isValid,
            formatValid: errors.length === 0,
            checksumsValid,
            schemaCompatible: true,
            manifest,
            metadata,
            modelCounts,
            totalRecords,
            errors,
            warnings,
            modelSummaries,
            conflicts,
            canRestoreSafeMerge: isValid,
            canRestoreEmptyDb: isValid && totalLiveRecords === 0,
            canRestoreReplaceAll: isValid,
        };

        const parsedData: ParsedBackupData | null = isValid ? {
            manifest,
            metadata,
            recordsByModel,
        } : null;

        return { validation, parsedData };
    }
}
