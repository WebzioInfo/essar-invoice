// types.ts - Core types for Essar ERP Backup & Disaster Recovery System

export type RestoreMode = "SAFE_MERGE" | "EMPTY_DB" | "REPLACE_ALL";

export interface BackupManifest {
    format: "ESSAR_ERP_BACKUP";
    formatVersion: string; // e.g. "1.0.0"
    application: "Essar ERP";
    applicationVersion: string;
    createdAt: string; // ISO String
    databaseProvider: "mysql";
    schemaVersion: string;
    backupType: "FULL" | "SELECTIVE";
    recordCounts: Record<string, number>;
    includedModels: string[];
    checksums: Record<string, string>; // filename -> sha256
    totalRecords: number;
    sourceTimezone: string;
    integrityAlgorithm: "SHA-256";
}

export interface BackupMetadata {
    companyName: string;
    generatedBy: {
        id: string;
        name: string | null;
        email: string;
    } | null;
    environment: string;
    nodeVersion: string;
}

export interface ModelValidationSummary {
    modelName: string;
    recordCount: number;
    validCount: number;
    invalidCount: number;
    errors: string[];
}

export interface ConflictItem {
    modelName: string;
    recordId: string;
    identifierLabel: string; // e.g. "Invoice #JE/B2B/01/26-27"
    conflictType: "ID_EXISTS_WITH_DIFF_DATA" | "UNIQUE_KEY_COLLISION" | "FOREIGN_KEY_MISSING";
    existingSummary: Record<string, any>;
    backupSummary: Record<string, any>;
    proposedAction: "UPDATE" | "SKIP" | "RESOLVE_MANUALLY";
}

export interface ValidationResult {
    isValid: boolean;
    formatValid: boolean;
    checksumsValid: boolean;
    schemaCompatible: boolean;
    manifest: BackupManifest | null;
    metadata: BackupMetadata | null;
    modelCounts: Record<string, number>;
    totalRecords: number;
    errors: string[];
    warnings: string[];
    modelSummaries: ModelValidationSummary[];
    conflicts: ConflictItem[];
    canRestoreSafeMerge: boolean;
    canRestoreEmptyDb: boolean;
    canRestoreReplaceAll: boolean;
}

export interface ModelRestoreStats {
    modelName: string;
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: string[];
}

export interface RestoreExecutionResult {
    success: boolean;
    restoreMode: RestoreMode;
    timestamp: string;
    totalProcessed: number;
    totalCreated: number;
    totalUpdated: number;
    totalSkipped: number;
    totalFailed: number;
    modelStats: Record<string, ModelRestoreStats>;
    safetyBackupPath?: string;
    errors: string[];
    verificationReport: VerificationReport;
}

export interface VerificationReport {
    isVerified: boolean;
    recordCountDiscrepancies: Record<string, { expected: number; actual: number }>;
    referentialIntegrityErrors: string[];
    criticalChecks: {
        clientsAccessible: boolean;
        productsAccessible: boolean;
        invoicesAccessible: boolean;
        quotationsAccessible: boolean;
        accountingBalanced: boolean;
    };
    notes: string[];
}
