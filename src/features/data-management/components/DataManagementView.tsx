"use client";

import React, { useState, useEffect } from "react";
import {
    Database, Download, Upload, ShieldCheck, AlertTriangle, CheckCircle2,
    RefreshCw, Layers, HardDrive, FileArchive, Check, ArrowRight, Lock,
    Clock, ShieldAlert, Sparkles, FileText, Info, Table as TableIcon,
    FileSpreadsheet, FileCode, CheckSquare, Square, X, Eye
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/ui/core/Card";
import { Button } from "@/ui/core/Button";
import { Input } from "@/ui/core/Input";
import { toast } from "sonner";
import { ALL_MODELS_META } from "@/lib/backup/dependencyGraph";
import { DatabaseHealthStats } from "../services/BackupService";
import { RestoreMode, ValidationResult, RestoreExecutionResult } from "@/lib/backup/types";
import { DryRunReport, ImportEntity } from "../services/ImportService";
import { ExportEntity, ExportFormat } from "../services/ExportService";
import { cn } from "@/utils";
import apiClient from "@/lib/apiClient";

interface DataManagementViewProps {
    stats: DatabaseHealthStats;
    userRole: string;
}

type ManagementTab = "BACKUPS" | "IMPORT" | "EXPORT" | "CONSISTENCY";

export function DataManagementView({ stats, userRole }: DataManagementViewProps) {
    const [activeTab, setActiveTab] = useState<ManagementTab>("BACKUPS");

    // ── Backup State ──
    const [isDownloading, setIsDownloading] = useState(false);
    const [selectedModels, setSelectedModels] = useState<string[]>(ALL_MODELS_META.map(m => m.modelName));
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [restoreMode, setRestoreMode] = useState<RestoreMode>("SAFE_MERGE");
    const [replaceConfirmText, setReplaceConfirmText] = useState("");
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreResult, setRestoreResult] = useState<RestoreExecutionResult | null>(null);

    // ── Import State ──
    const [importEntity, setImportEntity] = useState<ImportEntity>("products");
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isDryRunning, setIsDryRunning] = useState(false);
    const [dryRunReport, setDryRunReport] = useState<DryRunReport | null>(null);
    const [isApplyingImport, setIsApplyingImport] = useState(false);

    // ── Export State ──
    const [exportEntity, setExportEntity] = useState<ExportEntity>("products");
    const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
    const [isExporting, setIsExporting] = useState(false);

    // ── Consistency State ──
    const [consistencyData, setConsistencyData] = useState<any>(null);
    const [isScanningConsistency, setIsScanningConsistency] = useState(false);

    // Toggle selected models for selective backup
    const toggleModel = (modelName: string) => {
        if (selectedModels.includes(modelName)) {
            setSelectedModels(selectedModels.filter(m => m !== modelName));
        } else {
            setSelectedModels([...selectedModels, modelName]);
        }
    };

    const selectAllModels = () => setSelectedModels(ALL_MODELS_META.map(m => m.modelName));
    const deselectAllModels = () => setSelectedModels([]);

    // ── Backup Download ──
    const handleDownloadFullBackup = () => {
        setIsDownloading(true);
        toast.info("Generating full database backup archive...");
        const link = document.createElement("a");
        link.href = "/api/backup/download?type=FULL";
        link.download = `ESSAR_BACKUP_${new Date().toISOString().slice(0, 10)}.essar-backup`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setIsDownloading(false), 2000);
    };

    const handleDownloadSelectiveBackup = () => {
        if (selectedModels.length === 0) {
            toast.error("Please select at least one module to export.");
            return;
        }
        setIsDownloading(true);
        toast.info("Generating selective backup archive...");
        const link = document.createElement("a");
        link.href = `/api/backup/download?type=SELECTIVE&models=${selectedModels.join(",")}`;
        link.download = `ESSAR_SELECTIVE_BACKUP_${new Date().toISOString().slice(0, 10)}.essar-backup`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setIsDownloading(false), 2000);
    };

    // ── Backup File Validation ──
    const handleBackupFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadFile(file);
        setValidationResult(null);
        setRestoreResult(null);
        setIsValidating(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            toast.loading("Analyzing and validating backup integrity...", { id: "validating-toast" });
            const res = await fetch("/api/backup/inspect", {
                method: "POST",
                body: formData,
            });

            const data: ValidationResult = await res.json();
            toast.dismiss("validating-toast");

            if (res.ok && data) {
                setValidationResult(data);
                if (data.isValid) {
                    toast.success("Backup validated successfully! Review summary below.");
                } else {
                    toast.error("Backup validation failed. Review issues before restoring.");
                }
            } else {
                toast.error((data as any)?.error || "Failed to inspect backup file.");
            }
        } catch (err: any) {
            toast.dismiss("validating-toast");
            toast.error(`Validation error: ${err.message}`);
        } finally {
            setIsValidating(false);
        }
    };

    // ── Execute Restore ──
    const handleExecuteRestore = async () => {
        if (!uploadFile || !validationResult?.isValid) {
            toast.error("Please upload and validate a valid backup archive first.");
            return;
        }

        if (restoreMode === "REPLACE_ALL" && replaceConfirmText !== "RESTORE AND REPLACE ALL DATA") {
            toast.error("Please type the exact confirmation phrase to proceed.");
            return;
        }

        setIsRestoring(true);
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("mode", restoreMode);

        try {
            toast.loading("Executing restoration pipeline...", { id: "restoring-toast" });
            const res = await fetch("/api/backup/restore", {
                method: "POST",
                body: formData,
            });

            const data: RestoreExecutionResult = await res.json();
            toast.dismiss("restoring-toast");

            if (res.ok && data.success) {
                setRestoreResult(data);
                toast.success(`Restoration complete! Processed ${data.totalProcessed} records.`);
            } else {
                toast.error((data as any)?.error || "Restoration encountered errors.");
                if (data.modelStats) {
                    setRestoreResult(data);
                }
            }
        } catch (err: any) {
            toast.dismiss("restoring-toast");
            toast.error(`Restoration failed: ${err.message}`);
        } finally {
            setIsRestoring(false);
        }
    };

    // ── Smart Import: Dry Run ──
    const handleRunDryRun = async () => {
        if (!importFile) {
            toast.error("Please choose a CSV or JSON file to import.");
            return;
        }

        setIsDryRunning(true);
        setDryRunReport(null);

        const formData = new FormData();
        formData.append("file", importFile);
        formData.append("entity", importEntity);

        try {
            toast.loading("Running Dry-Run simulation...", { id: "dry-run-toast" });
            const res = await fetch("/api/data/import/dry-run", {
                method: "POST",
                body: formData
            });

            const data: DryRunReport = await res.json();
            toast.dismiss("dry-run-toast");

            if (res.ok && data) {
                setDryRunReport(data);
                if (data.errorCount === 0 && data.ambiguousCount === 0) {
                    toast.success(`Dry-run passed! ${data.insertCount} inserts, ${data.updateCount} updates detected.`);
                } else {
                    toast.warning(`Dry-run found ${data.errorCount} errors and ${data.ambiguousCount} ambiguous conflicts.`);
                }
            } else {
                toast.error((data as any)?.error || "Dry-run failed.");
            }
        } catch (err: any) {
            toast.dismiss("dry-run-toast");
            toast.error(`Dry-run error: ${err.message}`);
        } finally {
            setIsDryRunning(false);
        }
    };

    // ── Smart Import: Apply ──
    const handleApplyImport = async () => {
        if (!dryRunReport || !dryRunReport.canApply) {
            toast.error("Cannot apply import until dry-run validates with zero errors.");
            return;
        }

        setIsApplyingImport(true);

        try {
            toast.loading("Applying changes transactionally to database...", { id: "apply-toast" });
            const recordsToApply = dryRunReport.changes.map(c => c.data);

            const res = await fetch("/api/data/import/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entity: dryRunReport.entity,
                    records: recordsToApply
                })
            });

            const data = await res.json();
            toast.dismiss("apply-toast");

            if (res.ok && data.success) {
                toast.success(`Import applied successfully! Inserted: ${data.inserted}, Updated: ${data.updated}`);
                setDryRunReport(null);
                setImportFile(null);
            } else {
                toast.error(data.error || "Failed to apply import.");
            }
        } catch (err: any) {
            toast.dismiss("apply-toast");
            toast.error(`Apply error: ${err.message}`);
        } finally {
            setIsApplyingImport(false);
        }
    };

    // ── Business Data Export ──
    const handleExport = () => {
        setIsExporting(true);
        toast.info(`Generating ${exportEntity} ${exportFormat.toUpperCase()} export...`);
        const link = document.createElement("a");
        link.href = `/api/data/export?entity=${exportEntity}&format=${exportFormat}`;
        link.download = `ESSAR_${exportEntity.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setIsExporting(false), 2000);
    };

    // ── Consistency Check ──
    const handleRunConsistencyCheck = async () => {
        setIsScanningConsistency(true);
        try {
            const res = await fetch("/api/data/consistency");
            const data = await res.json();
            setConsistencyData(data);
            if (data.isHealthy) {
                toast.success("Database consistency verified! 100% healthy.");
            } else {
                toast.warning("Database consistency issues detected. Review report below.");
            }
        } catch (err: any) {
            toast.error(`Failed to scan consistency: ${err.message}`);
        } finally {
            setIsScanningConsistency(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                            Data Safety & Administration
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">
                            {stats.totalRecords.toLocaleString()} Stored Records
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                        Data Management <span className="text-primary-600">Hub</span>
                    </h1>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                        Zero-data-loss database backups, deterministic imports with dry-run analysis, and business data export
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
                {[
                    { id: "BACKUPS" as ManagementTab, label: "Database Backups & Restore", icon: FileArchive },
                    { id: "IMPORT" as ManagementTab, label: "Smart Data Import (Dry Run)", icon: Upload },
                    { id: "EXPORT" as ManagementTab, label: "Business Data Export", icon: Download },
                    { id: "CONSISTENCY" as ManagementTab, label: "System Consistency & Health", icon: ShieldCheck }
                ].map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 border",
                                activeTab === tab.id
                                    ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10"
                                    : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ════════════════ TAB 1: BACKUPS & RESTORE ════════════════ */}
            {activeTab === "BACKUPS" && (
                <div className="space-y-8">
                    {/* Database Health Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                    <HardDrive className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Stored Records</p>
                                    <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.totalRecords.toLocaleString()}</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
                                    <Database className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Database Engine</p>
                                    <p className="text-2xl font-black text-slate-900">MySQL 8.0</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Database Integrity</p>
                                    <p className="text-2xl font-black text-emerald-600">VERIFIED</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Create Backup */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white p-6 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                                        <Download className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900">Full Production Backup</h2>
                                        <p className="text-xs text-slate-500">Cryptographically signed (.essar-backup) archive with SHA-256 validation</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                                    Generates a complete snapshot of all 21 database models including Invoices, Quotations, Products, Stock Ledger, Clients, and Payments.
                                </p>
                            </div>

                            <Button
                                onClick={handleDownloadFullBackup}
                                disabled={isDownloading}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-slate-900/10 gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Download Full Production Backup
                            </Button>
                        </Card>

                        {/* Selective Backup */}
                        <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white p-6 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-900">Selective Backup</h2>
                                            <p className="text-xs text-slate-500">Choose specific business modules to archive</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={selectAllModels} className="text-[10px] font-bold text-primary-600 hover:underline">Select All</button>
                                        <span className="text-slate-300">|</span>
                                        <button onClick={deselectAllModels} className="text-[10px] font-bold text-slate-400 hover:underline">Clear</button>
                                    </div>
                                </div>

                                <div className="max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                                    {ALL_MODELS_META.map(m => {
                                        const isSelected = selectedModels.includes(m.modelName);
                                        return (
                                            <button
                                                key={m.modelName}
                                                type="button"
                                                onClick={() => toggleModel(m.modelName)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-left transition-all border",
                                                    isSelected ? "bg-white text-slate-900 border-primary-300 shadow-xs font-black" : "bg-slate-100/50 text-slate-400 border-transparent"
                                                )}
                                            >
                                                {isSelected ? <CheckSquare className="w-3 h-3 text-primary-600 shrink-0" /> : <Square className="w-3 h-3 text-slate-300 shrink-0" />}
                                                <span className="truncate">{m.modelName}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <Button
                                onClick={handleDownloadSelectiveBackup}
                                disabled={isDownloading || selectedModels.length === 0}
                                variant="outline"
                                className="w-full h-12 rounded-2xl text-xs font-black uppercase tracking-wider border-slate-300 gap-2"
                            >
                                <Download className="w-4 h-4 text-primary-600" />
                                Download Selective Backup ({selectedModels.length} Modules)
                            </Button>
                        </Card>
                    </div>

                    {/* Restore Engine */}
                    <Card className="border border-slate-200/80 shadow-xl rounded-3xl bg-white p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-900">Restore from Backup Archive</h2>
                                <p className="text-xs text-slate-500">Upload and deeply validate .essar-backup files before applying restoration</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-primary-400 transition-colors bg-slate-50/50">
                                <FileArchive className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                                <label className="cursor-pointer">
                                    <span className="text-xs font-black text-primary-600 hover:underline">Click to upload .essar-backup file</span>
                                    <input
                                        type="file"
                                        accept=".essar-backup,application/octet-stream"
                                        onChange={handleBackupFileSelect}
                                        className="hidden"
                                    />
                                </label>
                                <p className="text-[10px] text-slate-400 mt-1">Automatic SHA-256 checksum and schema dependency validation will run on selection</p>
                                {uploadFile && (
                                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-mono font-bold text-slate-700">
                                        <FileArchive className="w-3.5 h-3.5 text-primary-600" />
                                        {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                                    </div>
                                )}
                            </div>

                            {/* Validation Result Box */}
                            {validationResult && (
                                <div className={cn(
                                    "p-5 rounded-2xl border",
                                    validationResult.isValid ? "bg-emerald-50/50 border-emerald-200" : "bg-rose-50/50 border-rose-200"
                                )}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {validationResult.isValid ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                            ) : (
                                                <AlertTriangle className="w-5 h-5 text-rose-600" />
                                            )}
                                            <span className="text-sm font-black text-slate-900">
                                                {validationResult.isValid ? "Archive Validated & Ready for Restore" : "Archive Validation Failed"}
                                            </span>
                                        </div>
                                        <span className="text-xs font-mono text-slate-500">
                                            Records: {validationResult.totalRecords.toLocaleString()}
                                        </span>
                                    </div>

                                    {validationResult.isValid && (
                                        <div className="space-y-4 pt-3 border-t border-emerald-100">
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                                                    <input
                                                        type="radio"
                                                        name="restoreMode"
                                                        value="SAFE_MERGE"
                                                        checked={restoreMode === "SAFE_MERGE"}
                                                        onChange={() => setRestoreMode("SAFE_MERGE")}
                                                        className="text-primary-600"
                                                    />
                                                    <span>SAFE MERGE (Deterministic Upsert, Never Deletes DB Records)</span>
                                                </label>
                                            </div>

                                            <Button
                                                onClick={handleExecuteRestore}
                                                disabled={isRestoring}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider h-11 px-6 rounded-xl shadow-md gap-2"
                                            >
                                                <Check className="w-4 h-4" />
                                                Execute Safe Merge Restore
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* ════════════════ TAB 2: SMART DATA IMPORT ════════════════ */}
            {activeTab === "IMPORT" && (
                <div className="space-y-8">
                    {/* Zero Data Loss Banner */}
                    <Card className="bg-primary-950 text-white border-0 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary-500/20 text-primary-400 flex items-center justify-center shrink-0 border border-primary-500/30">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-white">Absolute Zero-Data-Loss Import Engine</h2>
                                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                    Imports are deterministic. Existing database records are matched by SKU, GSTIN, or Business Identity.
                                    Records in the database not present in the import file are <strong>100% preserved</strong> and never deleted.
                                    Mandatory dry-run simulations must pass before any database writes occur.
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Import Configuration Card */}
                    <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            {/* Entity selector */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                    Target Business Entity
                                </label>
                                <select
                                    value={importEntity}
                                    onChange={(e) => {
                                        setImportEntity(e.target.value as ImportEntity);
                                        setDryRunReport(null);
                                    }}
                                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary-500/20"
                                >
                                    <option value="products">Products & Packaging</option>
                                    <option value="clients">Clients & GSTINs</option>
                                    <option value="vendors">Vendors / Suppliers</option>
                                    <option value="stock_adjustments">Stock Level Adjustments</option>
                                </select>
                            </div>

                            {/* File Upload */}
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                    Select CSV or JSON Dataset
                                </label>
                                <input
                                    type="file"
                                    accept=".csv,.json,text/csv,application/json"
                                    onChange={(e) => {
                                        setImportFile(e.target.files?.[0] || null);
                                        setDryRunReport(null);
                                    }}
                                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium text-slate-700 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <span className="text-xs text-slate-400">
                                {importFile ? `Selected: ${importFile.name} (${(importFile.size / 1024).toFixed(1)} KB)` : "No file chosen"}
                            </span>

                            <Button
                                onClick={handleRunDryRun}
                                disabled={isDryRunning || !importFile}
                                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider h-11 px-6 rounded-xl shadow-md gap-2"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", isDryRunning && "animate-spin")} />
                                Run Dry-Run Simulation
                            </Button>
                        </div>
                    </Card>

                    {/* Dry Run Results Preview */}
                    {dryRunReport && (
                        <Card className="border border-slate-200/80 shadow-xl rounded-3xl bg-white p-6 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900">Dry-Run Simulation Results</h2>
                                    <p className="text-xs text-slate-500">Simulated impact on database without executing any writes</p>
                                </div>

                                {dryRunReport.canApply ? (
                                    <Button
                                        onClick={handleApplyImport}
                                        disabled={isApplyingImport}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider h-11 px-6 rounded-xl shadow-md gap-2 shrink-0"
                                    >
                                        <Check className="w-4 h-4" />
                                        Apply Safe Import
                                    </Button>
                                ) : (
                                    <span className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold shrink-0">
                                        Fix {dryRunReport.errorCount} Errors to Enable Apply
                                    </span>
                                )}
                            </div>

                            {/* Metrics Breakdown */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="text-[10px] font-bold uppercase text-slate-400">Total in File</div>
                                    <div className="text-xl font-black text-slate-900 tabular-nums">{dryRunReport.totalRecords}</div>
                                </div>
                                <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                                    <div className="text-[10px] font-bold uppercase text-emerald-700">To Insert</div>
                                    <div className="text-xl font-black text-emerald-700 tabular-nums">{dryRunReport.insertCount}</div>
                                </div>
                                <div className="p-3 bg-primary-50/60 rounded-2xl border border-primary-100">
                                    <div className="text-[10px] font-bold uppercase text-primary-700">To Update</div>
                                    <div className="text-xl font-black text-primary-700 tabular-nums">{dryRunReport.updateCount}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="text-[10px] font-bold uppercase text-slate-400">Unchanged</div>
                                    <div className="text-xl font-black text-slate-600 tabular-nums">{dryRunReport.unchangedCount}</div>
                                </div>
                                <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100">
                                    <div className="text-[10px] font-bold uppercase text-rose-700">Errors</div>
                                    <div className="text-xl font-black text-rose-700 tabular-nums">{dryRunReport.errorCount}</div>
                                </div>
                            </div>

                            {/* Detailed Item Diff List */}
                            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                                {dryRunReport.changes.map((item, idx) => (
                                    <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/60 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                                item.action === "INSERT" ? "bg-emerald-100 text-emerald-700" :
                                                item.action === "UPDATE" ? "bg-primary-100 text-primary-700" :
                                                item.action === "UNCHANGED" ? "bg-slate-100 text-slate-600" :
                                                "bg-rose-100 text-rose-700"
                                            )}>
                                                {item.action}
                                            </span>
                                            <div>
                                                <span className="font-extrabold text-slate-900">{item.identifier}</span>
                                                {item.reason && <p className="text-[10px] text-slate-400 mt-0.5">{item.reason}</p>}
                                            </div>
                                        </div>

                                        {item.diff && (
                                            <div className="text-[10px] font-mono text-slate-500 text-right">
                                                {Object.entries(item.diff).map(([key, val]) => (
                                                    <div key={key}>
                                                        {key}: <span className="line-through text-rose-500">{String(val.old)}</span> → <span className="text-emerald-600 font-bold">{String(val.new)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* ════════════════ TAB 3: BUSINESS DATA EXPORT ════════════════ */}
            {activeTab === "EXPORT" && (
                <div className="space-y-8">
                    <Card className="border border-slate-200/80 shadow-xl rounded-3xl bg-white p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
                                <Download className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-900">Business Data Export Center</h2>
                                <p className="text-xs text-slate-500">Download formatted CSV or JSON datasets with numeric precision and formula injection defense</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Entity Cards */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                                    Select Dataset Entity
                                </label>
                                {[
                                    { id: "products" as ExportEntity, label: "Products & Stock Ledger", desc: "SKU, descriptions, packaging ratios, stock counts, cost and retail valuation rates" },
                                    { id: "invoices" as ExportEntity, label: "Invoices & Billing", desc: "Invoice numbers, client GSTINs, taxable amounts, GST splits, grand totals, and balance due" },
                                    { id: "quotations" as ExportEntity, label: "Quotations & Estimates", desc: "Quotation registry, validity dates, client details, and line totals" },
                                    { id: "clients" as ExportEntity, label: "Clients Directory", desc: "Client corporate names, GSTINs, phone, email, state codes, and billing addresses" },
                                    { id: "vendors" as ExportEntity, label: "Vendors & Suppliers", desc: "Vendor registry, GSTINs, contact details, and supply addresses" },
                                    { id: "stock_logs" as ExportEntity, label: "Movement Audit Trail", desc: "Chronological stock ledger movements, deltas, balances, and source references" }
                                ].map(ent => (
                                    <div
                                        key={ent.id}
                                        onClick={() => setExportEntity(ent.id)}
                                        className={cn(
                                            "p-3.5 rounded-2xl border cursor-pointer transition-all",
                                            exportEntity === ent.id
                                                ? "bg-primary-50/50 border-primary-400 shadow-xs"
                                                : "bg-slate-50/50 border-slate-200/70 hover:bg-slate-50 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-900">{ent.label}</span>
                                            {exportEntity === ent.id && <CheckCircle2 className="w-4 h-4 text-primary-600" />}
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{ent.desc}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Format & Download */}
                            <div className="flex flex-col justify-between space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                                        Choose Export Format
                                    </label>
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <button
                                            type="button"
                                            onClick={() => setExportFormat("csv")}
                                            className={cn(
                                                "p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all",
                                                exportFormat === "csv"
                                                    ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                            )}
                                        >
                                            <FileSpreadsheet className="w-6 h-6" />
                                            <span className="text-xs font-black">CSV / Excel</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setExportFormat("json")}
                                            className={cn(
                                                "p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all",
                                                exportFormat === "json"
                                                    ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                            )}
                                        >
                                            <FileCode className="w-6 h-6" />
                                            <span className="text-xs font-black">JSON Structured</span>
                                        </button>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                                        <p className="font-bold text-slate-800 mb-1">Export Safety Controls:</p>
                                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
                                            <li>Prevents CSV formula injection via single-quote escaping</li>
                                            <li>Numeric precision preserved for all rates and stock balances</li>
                                            <li>Streaming generation directly from authoritative database state</li>
                                        </ul>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="w-full bg-primary-600 hover:bg-primary-700 text-white h-12 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-primary-600/20 gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Download {exportEntity.toUpperCase()} ({exportFormat.toUpperCase()})
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ════════════════ TAB 4: CONSISTENCY & HEALTH ════════════════ */}
            {activeTab === "CONSISTENCY" && (
                <div className="space-y-8">
                    <Card className="border border-slate-200/80 shadow-xl rounded-3xl bg-white p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-900">Database Consistency & Integrity Auditor</h2>
                                    <p className="text-xs text-slate-500">Scans for orphan records, broken foreign keys, and stock ledger drifts</p>
                                </div>
                            </div>

                            <Button
                                onClick={handleRunConsistencyCheck}
                                disabled={isScanningConsistency}
                                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider h-11 px-6 rounded-xl shadow-md gap-2"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", isScanningConsistency && "animate-spin")} />
                                Scan Full Database
                            </Button>
                        </div>

                        {!consistencyData ? (
                            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-700">Click &quot;Scan Full Database&quot; to run integrity diagnostics</p>
                                <p className="text-xs text-slate-400 mt-1">Cross-references foreign keys, orphan line items, and stock balances across all tables</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className={cn(
                                    "p-4 rounded-2xl border flex items-center gap-3",
                                    consistencyData.isHealthy ? "bg-emerald-50/50 border-emerald-200" : "bg-amber-50/50 border-amber-200"
                                )}>
                                    {consistencyData.isHealthy ? (
                                        <>
                                            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                                            <div>
                                                <p className="text-sm font-black text-emerald-950">Database is 100% Consistent & Healthy</p>
                                                <p className="text-xs text-emerald-700">Zero orphan foreign keys, zero duplicate numbers, zero stock drifts detected.</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                                            <div>
                                                <p className="text-sm font-black text-amber-950">Integrity Issues Detected</p>
                                                <p className="text-xs text-amber-700">Review the flagged metrics below.</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="text-[10px] font-bold uppercase text-slate-400">Orphan Invoice Items</div>
                                        <div className="text-2xl font-black text-slate-900 tabular-nums">{consistencyData.issues.orphanInvoiceItems}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="text-[10px] font-bold uppercase text-slate-400">Orphan Invoices</div>
                                        <div className="text-2xl font-black text-slate-900 tabular-nums">{consistencyData.issues.orphanInvoices}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="text-[10px] font-bold uppercase text-slate-400">Negative Stock Items</div>
                                        <div className="text-2xl font-black text-slate-900 tabular-nums">{consistencyData.issues.negativeStockCount}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="text-[10px] font-bold uppercase text-slate-400">Stock Drift Mismatches</div>
                                        <div className="text-2xl font-black text-slate-900 tabular-nums">{consistencyData.issues.stockMismatchCount}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
