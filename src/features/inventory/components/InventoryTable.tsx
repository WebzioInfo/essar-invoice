"use client";

import React, { useState, useMemo } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/ui/core/Table";
import {
    Package, Tag, Landmark, AlertTriangle, CheckCircle2, History as HistoryIcon,
    Search, SlidersHorizontal, ArrowUpDown, Download, Edit3, Box, ArrowRight,
    ChevronLeft, ChevronRight, RefreshCw, Eye
} from "lucide-react";
import { Button } from "@/ui/core/Button";
import { Card } from "@/ui/core/Card";
import { Input } from "@/ui/core/Input";
import { cn } from "@/utils";
import { ProductInventorySummary } from "../services/StockService";
import { ProductStockDrawer } from "./ProductStockDrawer";

interface InventoryTableProps {
    items: ProductInventorySummary[];
    onAdjustStock?: (product: ProductInventorySummary) => void;
    onRefresh?: () => void;
}

type FilterTab = "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NEGATIVE" | "PACKAGED";

export function InventoryTable({ items, onAdjustStock, onRefresh }: InventoryTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
    const [sortBy, setSortBy] = useState<"name" | "stock" | "valuation" | "sku">("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [selectedProduct, setSelectedProduct] = useState<ProductInventorySummary | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Counts for tabs
    const counts = useMemo(() => {
        let inStock = 0;
        let lowStock = 0;
        let outOfStock = 0;
        let negative = 0;
        let packaged = 0;

        items.forEach(item => {
            if (item.currentStock < 0) negative++;
            else if (item.currentStock === 0) outOfStock++;
            else if (item.currentStock <= 5) lowStock++;
            else inStock++;

            if (item.qtyPerBox > 0) packaged++;
        });

        return {
            all: items.length,
            inStock: inStock + lowStock,
            lowStock,
            outOfStock,
            negative,
            packaged
        };
    }, [items]);

    // Filter & Sort
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = item.description.toLowerCase().includes(q);
                const matchSku = item.sku?.toLowerCase().includes(q);
                const matchHsn = item.hsn?.toLowerCase().includes(q);
                if (!matchName && !matchSku && !matchHsn) return false;
            }

            // Tab filter
            switch (activeTab) {
                case "IN_STOCK":
                    return item.currentStock > 5;
                case "LOW_STOCK":
                    return item.currentStock > 0 && item.currentStock <= 5;
                case "OUT_OF_STOCK":
                    return item.currentStock === 0;
                case "NEGATIVE":
                    return item.currentStock < 0;
                case "PACKAGED":
                    return item.qtyPerBox > 0;
                default:
                    return true;
            }
        }).sort((a, b) => {
            let comp = 0;
            if (sortBy === "name") comp = a.description.localeCompare(b.description);
            else if (sortBy === "stock") comp = a.currentStock - b.currentStock;
            else if (sortBy === "valuation") comp = a.costValue - b.costValue;
            else if (sortBy === "sku") comp = (a.sku || "").localeCompare(b.sku || "");

            return sortDirection === "asc" ? comp : -comp;
        });
    }, [items, searchQuery, activeTab, sortBy, sortDirection]);

    // Paginated slice
    const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
    const paginatedItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [filteredItems, page, pageSize]);

    const handleSort = (field: "name" | "stock" | "valuation" | "sku") => {
        if (sortBy === field) {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortDirection("asc");
        }
    };

    const handleViewProduct = (product: ProductInventorySummary) => {
        setSelectedProduct(product);
        setIsDrawerOpen(true);
    };

    return (
        <div className="space-y-4">
            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    {[
                        { id: "ALL" as FilterTab, label: "All Items", count: counts.all },
                        { id: "IN_STOCK" as FilterTab, label: "In Stock", count: counts.inStock },
                        { id: "LOW_STOCK" as FilterTab, label: "Low Stock", count: counts.lowStock, alert: counts.lowStock > 0 },
                        { id: "OUT_OF_STOCK" as FilterTab, label: "Out of Stock", count: counts.outOfStock },
                        { id: "NEGATIVE" as FilterTab, label: "Negative", count: counts.negative, danger: counts.negative > 0 },
                        { id: "PACKAGED" as FilterTab, label: "Packaged", count: counts.packaged }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setPage(1); }}
                            className={cn(
                                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border",
                                activeTab === tab.id
                                    ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10"
                                    : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <span>{tab.label}</span>
                            <span className={cn(
                                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                                activeTab === tab.id
                                    ? "bg-slate-800 text-slate-200"
                                    : tab.danger
                                    ? "bg-rose-100 text-rose-700"
                                    : tab.alert
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-500"
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search & Actions */}
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search description, SKU, HSN..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            className="pl-9 text-xs bg-white rounded-xl border-slate-200"
                        />
                    </div>

                    <a
                        href="/api/data/export?entity=products&format=csv"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                        title="Export Inventory CSV"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Export</span>
                    </a>
                </div>
            </div>

            {/* Main Table Card */}
            <Card className="border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader className="bg-slate-900">
                            <TableRow className="border-0">
                                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer select-none hover:text-white" onClick={() => handleSort("name")}>
                                    <div className="flex items-center gap-1.5">
                                        <span>Product / Specs</span>
                                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                                    </div>
                                </TableHead>
                                <TableHead className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right cursor-pointer select-none hover:text-white" onClick={() => handleSort("stock")}>
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span>Physical Stock</span>
                                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                                    </div>
                                </TableHead>
                                <TableHead className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                    Packaging Breakdown
                                </TableHead>
                                <TableHead className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right cursor-pointer select-none hover:text-white" onClick={() => handleSort("valuation")}>
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span>Cost Value</span>
                                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                                    </div>
                                </TableHead>
                                <TableHead className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">
                                    Status
                                </TableHead>
                                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                            {paginatedItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-20 text-slate-400">
                                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                                        <p className="font-bold text-slate-700 text-sm">No inventory items matched your criteria</p>
                                        <p className="text-xs text-slate-400 mt-1">Try clearing filters or adjusting your search query</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedItems.map(item => {
                                    const isNegative = item.currentStock < 0;
                                    const isOutOfStock = item.currentStock === 0;
                                    const isLowStock = item.currentStock > 0 && item.currentStock <= 5;

                                    return (
                                        <TableRow key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                                            {/* Product info */}
                                            <TableCell className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors text-slate-500">
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0 max-w-sm">
                                                        <p 
                                                            className="font-extrabold text-slate-900 text-xs uppercase tracking-tight truncate cursor-pointer hover:text-primary-600 transition-colors"
                                                            onClick={() => handleViewProduct(item)}
                                                        >
                                                            {item.description}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-600 uppercase">
                                                                {item.unit}
                                                            </span>
                                                            {item.sku && (
                                                                <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded text-[9px] font-mono font-bold">
                                                                    SKU: {item.sku}
                                                                </span>
                                                            )}
                                                            {item.hsn && (
                                                                <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded text-[9px] font-mono">
                                                                    HSN: {item.hsn}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Stock Qty */}
                                            <TableCell className="px-4 py-4 text-right">
                                                <div className={cn(
                                                    "text-sm font-black tabular-nums tracking-tight",
                                                    isNegative ? "text-rose-600" : isOutOfStock ? "text-slate-400" : isLowStock ? "text-amber-600" : "text-slate-900"
                                                )}>
                                                    {item.currentStock.toLocaleString()} <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</span>
                                                </div>
                                                <div className="text-[9px] text-slate-400 mt-0.5">
                                                    Rate: ₹{item.purchaseRate.toLocaleString('en-IN')}
                                                </div>
                                            </TableCell>

                                            {/* Packaging */}
                                            <TableCell className="px-4 py-4">
                                                {item.qtyPerBox > 0 ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-800 tabular-nums">
                                                            <strong className="text-primary-700">{item.totalPackages}</strong> {item.pkgType || "BOX"}
                                                            {item.looseUnits !== 0 && (
                                                                <span className="text-[10px] text-slate-500 ml-1">
                                                                    + {item.looseUnits} {item.unit}
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400">
                                                            {item.qtyPerBox} {item.unit} / {item.pkgType || "BOX"}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">—</span>
                                                )}
                                            </TableCell>

                                            {/* Valuation */}
                                            <TableCell className="px-4 py-4 text-right">
                                                <div className="text-xs font-black text-slate-900 tabular-nums">
                                                    ₹{item.costValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </div>
                                                <div className="text-[9px] text-emerald-600 font-semibold tabular-nums mt-0.5">
                                                    Retail: ₹{item.retailValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </div>
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell className="px-4 py-4 text-center">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                    isNegative ? "bg-rose-50 text-rose-700 border-rose-200" :
                                                    isOutOfStock ? "bg-slate-100 text-slate-600 border-slate-200" :
                                                    isLowStock ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                )}>
                                                    {isNegative ? "Negative" : isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                                                </span>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2.5 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg text-xs font-bold gap-1"
                                                        onClick={() => handleViewProduct(item)}
                                                        title="View Movement History"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">Details</span>
                                                    </Button>

                                                    {onAdjustStock && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold gap-1"
                                                            onClick={() => onAdjustStock(item)}
                                                            title="Adjust Stock"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                            <span className="hidden sm:inline">Adjust</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <span>Showing {paginatedItems.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length} entries</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="h-8 px-2.5 text-xs font-bold gap-1"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Previous
                        </Button>

                        <span className="font-mono font-bold text-slate-700 px-2">
                            {page} / {totalPages}
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="h-8 px-2.5 text-xs font-bold gap-1"
                        >
                            Next
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Product Movement Drawer / Modal */}
            <ProductStockDrawer
                product={selectedProduct}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onAdjustStock={onAdjustStock}
            />
        </div>
    );
}
