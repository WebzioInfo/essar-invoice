"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
    X, Package, Layers, History as HistoryIcon, ArrowUpRight, ArrowDownRight,
    RefreshCw, AlertTriangle, CheckCircle2, DollarSign, Box, Tag, FileText
} from "lucide-react";
import { Modal } from "@/ui/core/Modal";
import { Button } from "@/ui/core/Button";
import { Card } from "@/ui/core/Card";
import { cn } from "@/utils";
import apiClient from "@/lib/apiClient";
import { ProductInventorySummary } from "../services/StockService";
import { Skeleton } from "@/ui/core/Skeleton";

interface ProductStockDrawerProps {
    product: ProductInventorySummary | null;
    isOpen: boolean;
    onClose: () => void;
    onAdjustStock?: (product: ProductInventorySummary) => void;
}

export function ProductStockDrawer({ product, isOpen, onClose, onAdjustStock }: ProductStockDrawerProps) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    useEffect(() => {
        if (!product || !isOpen) return;

        const fetchLogs = async () => {
            try {
                setLoadingLogs(true);
                const res = await apiClient.get(`/api/inventory/product/${product.id}/logs`);
                setLogs(res.data.logs || []);
            } catch (err) {
                console.error("Failed to load product movement logs:", err);
            } finally {
                setLoadingLogs(false);
            }
        };

        fetchLogs();
    }, [product, isOpen]);

    if (!product) return null;

    const isNegative = product.currentStock < 0;
    const isOutOfStock = product.currentStock === 0;
    const isLowStock = product.currentStock > 0 && product.currentStock <= 5;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-4xl">
            <div className="space-y-6">
                {/* Header Header Summary */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                isNegative ? "bg-rose-100 text-rose-700" :
                                isOutOfStock ? "bg-amber-100 text-amber-700" :
                                isLowStock ? "bg-orange-100 text-orange-700" :
                                "bg-emerald-100 text-emerald-700"
                            )}>
                                {isNegative ? "Negative Stock" : isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                            </span>
                            {product.sku && (
                                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    SKU: {product.sku}
                                </span>
                            )}
                            {product.hsn && (
                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    HSN: {product.hsn}
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{product.description}</h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Base Unit: <strong className="text-slate-800">{product.unit}</strong> • GST: <strong className="text-slate-800">{product.gstRate}%</strong>
                        </p>
                    </div>

                    {onAdjustStock && (
                        <Button
                            size="sm"
                            className="bg-primary-600 hover:bg-primary-700 text-white shrink-0"
                            onClick={() => {
                                onClose();
                                onAdjustStock(product);
                            }}
                        >
                            Adjust Stock Level
                        </Button>
                    )}
                </div>

                {/* KPI Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="p-4 bg-slate-50/80 border border-slate-200/60 rounded-2xl">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Current Stock</div>
                        <div className={cn(
                            "text-2xl font-black tabular-nums tracking-tight",
                            isNegative ? "text-rose-600" : isOutOfStock ? "text-amber-600" : "text-slate-900"
                        )}>
                            {product.currentStock.toLocaleString()} <span className="text-xs font-semibold text-slate-500">{product.unit}</span>
                        </div>
                    </Card>

                    <Card className="p-4 bg-slate-50/80 border border-slate-200/60 rounded-2xl">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Packaging Breakdown</div>
                        <div className="text-sm font-bold text-slate-900 tabular-nums">
                            {product.qtyPerBox > 0 ? (
                                <>
                                    <span className="text-base font-black text-indigo-600">{product.totalPackages}</span> {product.pkgType || "BOX"}
                                    {product.looseUnits !== 0 && (
                                        <span className="text-xs font-semibold text-slate-600 ml-1">
                                            + {product.looseUnits} {product.unit}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span className="text-xs text-slate-500 italic">No packaging spec</span>
                            )}
                        </div>
                        {product.qtyPerBox > 0 && (
                            <div className="text-[9px] text-slate-400 mt-1">({product.qtyPerBox} {product.unit} / {product.pkgType || "BOX"})</div>
                        )}
                    </Card>

                    <Card className="p-4 bg-slate-50/80 border border-slate-200/60 rounded-2xl">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Cost Valuation</div>
                        <div className="text-lg font-black text-slate-900 tabular-nums">
                            ₹{product.costValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">Rate: ₹{product.purchaseRate.toLocaleString('en-IN')}</div>
                    </Card>

                    <Card className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">Retail Valuation</div>
                        <div className="text-lg font-black text-emerald-700 tabular-nums">
                            ₹{product.retailValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[9px] text-emerald-600 mt-0.5">Rate: ₹{product.sellingRate.toLocaleString('en-IN')}</div>
                    </Card>
                </div>

                {/* Movement History Audit Table */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <HistoryIcon className="w-4 h-4 text-primary-600" />
                            Movement Audit Trail ({logs.length})
                        </h3>
                    </div>

                    {loadingLogs ? (
                        <div className="space-y-2 py-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <Box className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-slate-600">No stock movements recorded yet.</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Movements from invoices, purchases, and manual adjustments will appear here.</p>
                        </div>
                    ) : (
                        <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                            {logs.map((log: any) => {
                                const change = Number(log.quantityChange);
                                const isPositive = change > 0;

                                return (
                                    <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                                isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                            )}>
                                                {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-900">
                                                        {log.type === "ADD" ? "Stock In" :
                                                         log.type === "REMOVE" ? "Stock Out" :
                                                         log.type === "ADJUSTMENT" ? "Adjustment" :
                                                         log.type === "RETURN" ? "Sales Return" : log.type}
                                                    </span>
                                                    {log.referenceId && (
                                                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                            Ref: {log.referenceId}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    {format(new Date(log.createdAt), "MMM dd, yyyy · HH:mm")}
                                                    {log.notes && ` • ${log.notes}`}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className={cn(
                                                "text-xs font-black tabular-nums",
                                                isPositive ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {isPositive ? `+${change}` : change} {product.unit}
                                            </div>
                                            <div className="text-[10px] text-slate-400 tabular-nums">
                                                Bal: {Number(log.quantityAfter)} {product.unit}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
