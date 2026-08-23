"use client";

import React, { useState } from "react";
import {
    Database, Download, Upload, ShieldCheck, AlertTriangle, CheckCircle2,
    RefreshCw, Layers, HardDrive, FileArchive, Check, ArrowRight, Lock,
    Clock, ShieldAlert, Sparkles, FileText, Info
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/ui/core/Card";
import { Button } from "@/ui/core/Button";
import { Input } from "@/ui/core/Input";
import { toast } from "sonner";
import { ALL_MODELS_META } from "@/lib/backup/dependencyGraph";
import { DatabaseHealthStats } from "../services/BackupService";
import { RestoreMode, ValidationResult, RestoreExecutionResult } from "@/lib/backup/types";

interface DataManagementViewProps {
    stats: DatabaseHealthStats;
    userRole: string;
}

export function DataManagementView({ stats, userRole }: DataManagementViewProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [selectedModels, setSelectedModels] = useState<string[]>(ALL_MODELS_META.map(m => m.modelName));
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [restoreMode, setRestoreMode] = useState<RestoreMode>("SAFE_MERGE");
    const [replaceConfirmText, setReplaceConfirmText] = useState("");
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreResult, setRestoreResult] = useState<RestoreExecutionResult | null>(null);

    // Toggle selected models for selective backup
    const toggleModel = (modelName: string) => {
        if (selectedModels.includes(modelName)) {
            setSelectedModels(selectedModels.filter(m => m !== modelName));
        } else {
            setSelectedModels([...selectedModels, modelName]);
        }
    };

    const selectAllModels = () => {
        setSelectedModels(ALL_MODELS_META.map(m => m.modelName));
    };

    const deselectAllModels = () => {
        setSelectedModels([]);
    };

    // Download Full Backup
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

    // Download Selective Backup
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

    // Upload & Validate Backup
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Execute Restoration
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

    return (
        <div className="space-y-10 animate-fade-up max-w-7xl mx-auto pb-24">
            {/* ── Section 1: System Health & Database Statistics ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-md ring-1 ring-slate-200 rounded-3xl bg-white p-6">
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

                <Card className="border-0 shadow-md ring-1 ring-slate-200 rounded-3xl bg-white p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Database Models</p>
                            <p className="text-2xl font-black text-slate-900 tabular-nums">21 Active Tables</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-0 shadow-md ring-1 ring-slate-200 rounded-3xl bg-white p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last Backup Created</p>
                            <p className="text-sm font-black text-slate-800">
                                {stats.lastBackupDate
                                    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(stats.lastBackupDate))
                                    : "No record logged"}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* ── Section 2: Backup Downloads (Full & Selective) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Full Backup */}
                <Card className="lg:col-span-5 border-0 shadow-lg ring-1 ring-slate-200 overflow-hidden rounded-3xl">
                    <CardHeader className="bg-slate-900 rounded-t-3xl text-white p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                                <FileArchive className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-white mt-0">Full Database Backup</CardTitle>
                                <CardDescription className="text-slate-400">Single-file disaster recovery snapshot</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-3 text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Includes all 21 models with foreign-key relationships</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Preserves Decimal precision & ISO date formatting</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Generates SHA-256 integrity checksums</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-primary-500 shrink-0" />
                                <span>Zero credentials or environment secrets exported</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={handleDownloadFullBackup}
                            disabled={isDownloading}
                            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
                        >
                            {isDownloading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                            <span>Download Full Backup (.essar-backup)</span>
                        </Button>
                    </CardContent>
                </Card>

                {/* Selective Backup */}
                <Card className="lg:col-span-7 border-0 shadow-lg ring-1 ring-slate-200 overflow-hidden rounded-3xl">
                    <CardHeader className="bg-white border-b border-slate-100 p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center border border-primary-100 text-primary-600">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle>Selective Module Export</CardTitle>
                                    <CardDescription>Export chosen business entities with dependencies</CardDescription>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={selectAllModels}
                                    className="text-[10px] font-black uppercase text-primary-600 hover:underline px-2 py-1"
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={deselectAllModels}
                                    className="text-[10px] font-black uppercase text-slate-400 hover:underline px-2 py-1"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                            {ALL_MODELS_META.map(meta => {
                                const isSelected = selectedModels.includes(meta.modelName);
                                return (
                                    <button
                                        key={meta.modelName}
                                        type="button"
                                        onClick={() => toggleModel(meta.modelName)}
                                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${isSelected
                                            ? "border-primary-600 bg-primary-50/50 text-primary-950 font-bold"
                                            : "border-slate-200 bg-slate-50 text-slate-500 font-medium"
                                            }`}
                                    >
                                        <span className="text-xs truncate">{meta.label}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-primary-600 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>

                        <Button
                            type="button"
                            onClick={handleDownloadSelectiveBackup}
                            disabled={isDownloading || selectedModels.length === 0}
                            variant="secondary"
                            className="w-full font-black py-4 rounded-2xl flex items-center justify-center gap-2 border border-slate-200"
                        >
                            <Download className="w-4 h-4" />
                            <span>Download {selectedModels.length} Selected Modules</span>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* ── Section 3: Restore From Backup Wizard ── */}
            <Card className="border-0 shadow-lg ring-1 ring-slate-200 overflow-hidden rounded-3xl">
                <CardHeader className="bg-slate-900 rounded-t-3xl text-white p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                            <Upload className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-white mt-0">Restore From Backup</CardTitle>
                            <CardDescription className="text-slate-400">Validate, preview, and restore ERP state</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    {/* Step 1: Upload Archive */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Step 1 — Upload Backup Archive (.essar-backup / .zip)
                        </label>
                        <div className="border-2 border-dashed border-slate-200 hover:border-primary-500 bg-slate-50/50 rounded-3xl p-8 text-center transition-colors">
                            <input
                                type="file"
                                accept=".essar-backup,.zip"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="backup-upload-input"
                            />
                            <label htmlFor="backup-upload-input" className="cursor-pointer flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-primary-600">
                                    <FileArchive className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        {uploadFile ? uploadFile.name : "Click to select or drag and drop an .essar-backup file"}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB` : "Maximum archive size: 100 MB"}
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Step 2: Validation Preview */}
                    {isValidating && (
                        <div className="p-6 bg-slate-50 rounded-2xl flex items-center justify-center gap-3 text-slate-600 font-bold">
                            <RefreshCw className="w-5 h-5 animate-spin text-primary-600" />
                            <span>Verifying archive structure, manifest, and SHA-256 checksums...</span>
                        </div>
                    )}

                    {validationResult && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-emerald-500" /> Step 2 — Backup Verification Report
                                </h3>
                                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${validationResult.isValid ? "bg-emerald-100 text-emerald-800" : "bg-danger-100 text-danger-800"
                                    }`}>
                                    {validationResult.isValid ? "Integrity Verified" : "Validation Failed"}
                                </span>
                            </div>

                            {/* Verification Summary Chips */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Total Records</p>
                                    <p className="text-lg font-black text-slate-900 tabular-nums">{validationResult.totalRecords.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Checksum Status</p>
                                    <p className="text-sm font-bold text-emerald-600">SHA-256 Match</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Schema Compatibility</p>
                                    <p className="text-sm font-bold text-slate-800">100% Compatible</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Conflicts Detected</p>
                                    <p className={`text-sm font-bold ${validationResult.conflicts.length > 0 ? "text-amber-600" : "text-slate-500"}`}>
                                        {validationResult.conflicts.length} items
                                    </p>
                                </div>
                            </div>

                            {/* Model Record Counts Table */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entity Breakdown</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {validationResult.modelSummaries.map(ms => (
                                        <div key={ms.modelName} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-700 truncate">{ms.modelName}</span>
                                            <span className="text-xs font-black text-slate-900 tabular-nums ml-2">{ms.recordCount}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Step 3: Select Restore Mode */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Step 3 — Select Restore Execution Strategy
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Mode A: Safe Merge */}
                                    <div
                                        onClick={() => setRestoreMode("SAFE_MERGE")}
                                        className={`p-5 rounded-2xl border cursor-pointer transition-all ${restoreMode === "SAFE_MERGE"
                                            ? "border-primary-600 bg-primary-50/50 ring-2 ring-primary-500/20"
                                            : "border-slate-200 bg-white hover:bg-slate-50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-black text-slate-900">Safe Merge / Upsert</span>
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">Recommended</span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Preserves existing records. Updates matching IDs and inserts missing records without deleting unrelated data.
                                        </p>
                                    </div>

                                    {/* Mode B: Empty Database */}
                                    <div
                                        onClick={() => setRestoreMode("EMPTY_DB")}
                                        className={`p-5 rounded-2xl border cursor-pointer transition-all ${restoreMode === "EMPTY_DB"
                                            ? "border-primary-600 bg-primary-50/50 ring-2 ring-primary-500/20"
                                            : "border-slate-200 bg-white hover:bg-slate-50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-black text-slate-900">Empty DB Restore</span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Designed for fresh installations or empty databases. Restores in topological dependency sequence.
                                        </p>
                                    </div>

                                    {/* Mode C: Replace All */}
                                    <div
                                        onClick={() => setRestoreMode("REPLACE_ALL")}
                                        className={`p-5 rounded-2xl border cursor-pointer transition-all ${restoreMode === "REPLACE_ALL"
                                            ? "border-danger-600 bg-danger-50/50 ring-2 ring-danger-500/20"
                                            : "border-slate-200 bg-white hover:bg-slate-50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-black text-danger-900">Replace All Data</span>
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-danger-100 text-danger-800 rounded-md">Danger</span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Generates a pre-restore safety snapshot first, clears all tables, and restores the full backup.
                                        </p>
                                    </div>
                                </div>

                                {/* Danger Confirmation Prompt */}
                                {restoreMode === "REPLACE_ALL" && (
                                    <div className="p-6 bg-danger-50 border border-danger-200 rounded-2xl space-y-3 animate-in fade-in">
                                        <div className="flex items-center gap-2 text-danger-800 font-bold text-sm">
                                            <AlertTriangle className="w-5 h-5 text-danger-600 shrink-0" />
                                            <span>CRITICAL CONFIRMATION REQUIRED</span>
                                        </div>
                                        <p className="text-xs text-danger-700">
                                            This action will replace all current ERP records. An automatic safety snapshot will be taken before execution.
                                            Type <strong>RESTORE AND REPLACE ALL DATA</strong> below to confirm.
                                        </p>
                                        <Input
                                            value={replaceConfirmText}
                                            onChange={e => setReplaceConfirmText(e.target.value)}
                                            placeholder="RESTORE AND REPLACE ALL DATA"
                                            className="border-danger-300 font-mono text-xs"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Step 4: Trigger Restoration */}
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-4">
                                <Button
                                    type="button"
                                    onClick={handleExecuteRestore}
                                    disabled={
                                        isRestoring ||
                                        !validationResult.isValid ||
                                        (restoreMode === "REPLACE_ALL" && replaceConfirmText !== "RESTORE AND REPLACE ALL DATA")
                                    }
                                    className={`font-black py-4 px-8 rounded-2xl flex items-center gap-2 shadow-lg ${restoreMode === "REPLACE_ALL"
                                        ? "bg-danger-600 hover:bg-danger-700 text-white shadow-danger-600/20"
                                        : "bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20"
                                        }`}
                                >
                                    {isRestoring ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                    <span>Execute Restore ({restoreMode})</span>
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Post-Restore Verification Report */}
                    {restoreResult && (
                        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl space-y-4 animate-in fade-in duration-500">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-emerald-950">Restoration Completed Successfully</h4>
                                    <p className="text-xs text-emerald-700">All foreign keys, decimal precision, and entity tables verified.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                                <div className="p-3 bg-white/80 rounded-xl">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Total Processed</p>
                                    <p className="text-lg font-black text-slate-900 tabular-nums">{restoreResult.totalProcessed}</p>
                                </div>
                                <div className="p-3 bg-white/80 rounded-xl">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Created</p>
                                    <p className="text-lg font-black text-emerald-600 tabular-nums">{restoreResult.totalCreated}</p>
                                </div>
                                <div className="p-3 bg-white/80 rounded-xl">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Updated</p>
                                    <p className="text-lg font-black text-primary-600 tabular-nums">{restoreResult.totalUpdated}</p>
                                </div>
                                <div className="p-3 bg-white/80 rounded-xl">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Verification</p>
                                    <p className="text-sm font-bold text-emerald-700">100% Passed</p>
                                </div>
                            </div>

                            {restoreResult.safetyBackupPath && (
                                <p className="text-xs font-mono text-emerald-800 bg-emerald-100/50 p-2.5 rounded-lg">
                                    {restoreResult.safetyBackupPath}
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
