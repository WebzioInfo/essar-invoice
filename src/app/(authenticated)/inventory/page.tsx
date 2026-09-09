"use client";

import React, { useEffect, useState, useCallback } from "react";
import { StockLogTable } from "@/features/inventory/components/StockLogTable";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";
import { InventoryReconciliationModal } from "@/features/inventory/components/InventoryReconciliationModal";
import { StockAdjustmentForm } from "@/features/inventory/components/StockAdjustmentForm";
import { Card } from "@/ui/core/Card";
import { Button } from "@/ui/core/Button";
import { Modal } from "@/ui/core/Modal";
import {
    Layers, AlertTriangle, History as HistoryIcon, ShieldCheck,
    Sliders, RefreshCw, Package, ArrowUpRight, ArrowDownRight,
    Sparkles, CheckCircle2
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { TableSkeleton } from "@/ui/core/Skeleton";
import { toast } from "sonner";
import { ProductInventorySummary, InventoryLedgerMetrics } from "@/features/inventory/services/StockService";

export default function InventoryPage() {
    const [data, setData] = useState<{
        items: ProductInventorySummary[];
        metrics: InventoryLedgerMetrics;
        products: any[];
        stockLogs: any[];
        inventoryLevels: Record<string, number>;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReconcileOpen, setIsReconcileOpen] = useState(false);
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [selectedAdjustProduct, setSelectedAdjustProduct] = useState<any>(null);

    const fetchInventory = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get("/api/inventory/stats");
            setData(res.data);
        } catch (error: any) {
            toast.error("Failed to sync inventory ledger.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    if (loading && !data) {
        return (
            <div className="p-8 space-y-6">
                <TableSkeleton />
            </div>
        );
    }

    const items = data?.items || [];
    const metrics = data?.metrics || {
        totalProducts: items.length,
        inStockCount: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        negativeStockCount: 0,
        totalStockUnits: 0,
        totalPackagesCount: 0,
        totalCostValuation: 0,
        totalRetailValuation: 0,
        movements24h: 0,
        movements30d: 0,
        stockIn30d: 0,
        stockOut30d: 0
    };
    const stockLogs = data?.stockLogs || [];

    const handleAdjustStock = (product?: ProductInventorySummary) => {
        setSelectedAdjustProduct(product || null);
        setIsAdjustOpen(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-24">
            {/* Control Center Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary-100 text-primary-800 border border-primary-200">
                            Real-Time Ledger
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">
                            {metrics.totalProducts} Catalog Items
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                        Inventory <span className="text-primary-600">Control Center</span>
                    </h1>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                        Authoritative stock tracking, packaging conversions, valuation, and movement audits
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsReconcileOpen(true)}
                        className="text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Reconcile Ledger
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => handleAdjustStock()}
                        className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-primary-600/20"
                    >
                        <Sliders className="w-4 h-4" />
                        Adjust Stock
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchInventory}
                        disabled={loading}
                        className="text-slate-500 hover:text-slate-800 h-9 w-9 p-0"
                        title="Refresh Inventory"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Smart KPI Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Physical Stock & Packaging */}
                <Card className="bg-slate-900 border-0 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
                    <div className="absolute -right-6 -top-6 w-28 h-28 bg-primary-500/20 rounded-full blur-2xl" />
                    <div className="flex items-center justify-between mb-4">
                        <Layers className="text-primary-400 w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-400/80 bg-primary-950/80 px-2 py-0.5 rounded-full border border-primary-800/50">
                            Reserve Balance
                        </span>
                    </div>
                    <div className="text-3xl font-black italic tracking-tight tabular-nums">
                        {metrics.totalStockUnits.toLocaleString()}
                    </div>
                    <div className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1.5">
                        <span>Total Units across catalog</span>
                        {metrics.totalPackagesCount > 0 && (
                            <span className="text-primary-300 font-bold">({metrics.totalPackagesCount.toLocaleString()} Boxes)</span>
                        )}
                    </div>
                </Card>

                {/* Stock Health & Alerts */}
                <Card className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <AlertTriangle className="text-rose-500 w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                            Threshold Alerts
                        </span>
                    </div>
                    <div className="text-3xl font-black italic tracking-tight tabular-nums text-rose-600">
                        {metrics.lowStockCount + metrics.outOfStockCount + metrics.negativeStockCount}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span>Low: <strong>{metrics.lowStockCount}</strong></span>
                        <span>•</span>
                        <span>Out: <strong>{metrics.outOfStockCount}</strong></span>
                        {metrics.negativeStockCount > 0 && (
                            <>
                                <span>•</span>
                                <span className="text-rose-600 font-bold">Negative: {metrics.negativeStockCount}</span>
                            </>
                        )}
                    </div>
                </Card>

                {/* Inventory Valuation */}
                <Card className="bg-gradient-to-br from-emerald-900 to-slate-900 border-0 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl" />
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm">
                            ₹
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/50">
                            Asset Value
                        </span>
                    </div>
                    <div className="text-2xl font-black italic tracking-tight tabular-nums">
                        ₹{metrics.totalCostValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-emerald-300/80 mt-1">
                        Retail Value: ₹{metrics.totalRetailValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                </Card>

                {/* 30-Day Movement Velocity */}
                <Card className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <HistoryIcon className="text-primary-600 w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            30-Day Velocity
                        </span>
                    </div>
                    <div className="text-3xl font-black italic tracking-tight tabular-nums text-slate-900">
                        {metrics.movements30d} <span className="text-xs font-bold text-slate-400 not-italic">Ops</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" /> +{metrics.stockIn30d.toLocaleString()}
                        </span>
                        <span>•</span>
                        <span className="text-rose-600 font-bold flex items-center gap-0.5">
                            <ArrowDownRight className="w-3 h-3" /> -{metrics.stockOut30d.toLocaleString()}
                        </span>
                    </div>
                </Card>
            </div>

            {/* Inventory Table Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Catalog Inventory</h2>
                        <p className="text-xs font-medium text-slate-500">Live stock quantities, packaging metrics, and item valuations</p>
                    </div>
                </div>

                <InventoryTable
                    items={items}
                    onAdjustStock={handleAdjustStock}
                    onRefresh={fetchInventory}
                />
            </div>

            {/* Audit Logs Section */}
            <div className="space-y-4 pt-6 border-t border-slate-200/80">
                <div className="flex items-center justify-between px-1">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Movement Audit Ledger</h2>
                        <p className="text-xs font-medium text-slate-500">Chronological transaction logs across Invoices, Purchases, and Adjustments</p>
                    </div>
                </div>

                <StockLogTable logs={stockLogs} />
            </div>

            {/* Reconciliation Modal */}
            <InventoryReconciliationModal
                isOpen={isReconcileOpen}
                onClose={() => setIsReconcileOpen(false)}
                onReconciled={fetchInventory}
            />

            {/* Stock Adjustment Modal */}
            <Modal
                isOpen={isAdjustOpen}
                onClose={() => {
                    setIsAdjustOpen(false);
                    setSelectedAdjustProduct(null);
                }}
                title=""
                maxWidth="max-w-2xl"
            >
                <StockAdjustmentForm
                    products={items.map(p => ({ id: p.id, description: p.description, sku: p.sku }))}
                    onSuccess={() => {
                        setIsAdjustOpen(false);
                        setSelectedAdjustProduct(null);
                        fetchInventory();
                    }}
                />
            </Modal>
        </div>
    );
}
