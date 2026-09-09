"use client";

import React, { useEffect, useState } from "react";
import {
    ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2, ArrowRight, X, Layers
} from "lucide-react";
import { Modal } from "@/ui/core/Modal";
import { Button } from "@/ui/core/Button";
import { Card } from "@/ui/core/Card";
import { cn } from "@/utils";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { Skeleton } from "@/ui/core/Skeleton";
import { StockDiscrepancyItem } from "../services/StockService";

interface InventoryReconciliationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReconciled?: () => void;
}

export function InventoryReconciliationModal({ isOpen, onClose, onReconciled }: InventoryReconciliationModalProps) {
    const [loading, setLoading] = useState(false);
    const [discrepancies, setDiscrepancies] = useState<StockDiscrepancyItem[]>([]);
    const [mismatchCount, setMismatchCount] = useState(0);
    const [reconcilingId, setReconcilingId] = useState<string | null>(null);

    const scanDiscrepancies = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get("/api/inventory/reconcile");
            setDiscrepancies(res.data.allDiscrepancies || []);
            setMismatchCount(res.data.mismatchCount || 0);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to scan inventory discrepancies.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            scanDiscrepancies();
        }
    }, [isOpen]);

    const handleReconcileItem = async (item: StockDiscrepancyItem) => {
        try {
            setReconcilingId(item.productId);
            const res = await apiClient.post("/api/inventory/reconcile", {
                productId: item.productId,
                expectedStock: item.calculatedStock,
                reason: `Reconciled stored stock (${item.storedStock}) to match verified ledger sum (${item.calculatedStock})`
            });

            toast.success(`Successfully reconciled stock for ${item.description}`);
            await scanDiscrepancies();
            if (onReconciled) onReconciled();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to reconcile product.");
        } finally {
            setReconcilingId(null);
        }
    };

    const mismatches = discrepancies.filter(d => d.hasMismatch);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-4xl">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                            mismatchCount > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                            {mismatchCount > 0 ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Stock Ledger Reconciliation</h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Cross-verifies physical stock tables against mathematical movement logs
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={scanDiscrepancies}
                        disabled={loading}
                        className="gap-1.5 text-xs font-bold"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        Re-Scan
                    </Button>
                </div>

                {/* Status summary */}
                <Card className={cn(
                    "p-4 rounded-2xl border",
                    mismatchCount > 0 ? "bg-amber-50/50 border-amber-200/80" : "bg-emerald-50/50 border-emerald-200/80"
                )}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {mismatchCount > 0 ? (
                                <>
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                    <span className="text-sm font-bold text-amber-900">
                                        {mismatchCount} product(s) with stock discrepancies detected
                                    </span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <span className="text-sm font-bold text-emerald-900">
                                        All inventory stocks are 100% mathematically reconciled with ledger history
                                    </span>
                                </>
                            )}
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500">
                            Total Scanned: {discrepancies.length}
                        </span>
                    </div>
                </Card>

                {/* Discrepancy List */}
                {loading ? (
                    <div className="space-y-3 py-6">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                    </div>
                ) : mismatches.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <p className="text-sm font-bold text-slate-800">Zero Stock Drift Detected</p>
                        <p className="text-xs text-slate-500 mt-0.5">Every current stock quantity perfectly matches the recorded audit logs.</p>
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                        {mismatches.map((item) => (
                            <div key={item.productId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-slate-900">{item.description}</span>
                                        {item.sku && (
                                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                {item.sku}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-4">
                                        <span>Current Stored: <strong className="text-slate-800">{item.storedStock} {item.unit}</strong></span>
                                        <span>Ledger Sum: <strong className="text-slate-800">{item.calculatedStock} {item.unit}</strong></span>
                                        <span className="text-rose-600 font-bold">
                                            Drift: {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy} {item.unit}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    onClick={() => handleReconcileItem(item)}
                                    disabled={reconcilingId === item.productId}
                                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 text-xs font-bold"
                                >
                                    {reconcilingId === item.productId ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    )}
                                    Reconcile to Ledger Sum
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end pt-2 border-t border-slate-100">
                    <Button variant="outline" onClick={onClose} size="sm">
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
