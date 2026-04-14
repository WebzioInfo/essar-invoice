"use client";

import { useState, useMemo, useRef } from "react";
import { 
    Search, 
    MoreVertical, 
    ShoppingCart, 
    Plus,
    Filter,
    CloudDownload,
    ArrowRight,
    ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/utils/financials";
import Link from "next/link";
import { cn } from "@/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";

interface PurchaseTableProps {
    purchases: any[];
}

export function PurchaseTable({ purchases }: PurchaseTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const parentRef = useRef<HTMLDivElement>(null);

    // ── Optimized Filtering ──
    const filtered = useMemo(() => {
        return purchases.filter(p => 
            p.purchaseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [purchases, searchTerm]);

    // ── Row Virtualization ──
    const rowVirtualizer = useVirtualizer({
        count: filtered.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 88, // Approximate row height
        overscan: 5,
    });

    return (
        <div className="space-y-6">
            {/* Header + Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/40 p-6 rounded-3xl border border-white/50 backdrop-blur-xl">
                <div className="flex-1 max-w-md relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search purchases or vendors..."
                        className="w-full bg-white/80 h-12 pl-12 pr-6 rounded-xl border-none clay-inner focus:ring-4 focus:ring-primary-500/10 focus:bg-white text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-3">
                    <button className="h-12 w-12 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-primary-600 transition-all hover:scale-105 active:scale-95">
                        <Filter size={18} />
                    </button>
                    <Link 
                        href="/purchases/new"
                        className="h-12 px-6 flex items-center gap-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:scale-[1.03] active:scale-[0.97] transition-all shadow-xl shadow-slate-900/10"
                    >
                        <Plus size={18} />
                        <span>Log Purchase</span>
                    </Link>
                </div>
            </div>

            {/* Table Area with Virtualization */}
            <div 
                ref={parentRef}
                className="bg-white/40 rounded-3xl border border-white/50 backdrop-blur-xl overflow-auto custom-scrollbar shadow-2xl max-h-[700px] relative"
            >
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Order ID</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Vendor</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Date</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Tax (GST)</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Total Amount</th>
                                <th className="px-8 py-4 w-20"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const purchase = filtered[virtualRow.index];
                                return (
                                    <tr 
                                        key={purchase.id}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                        className="group hover:bg-white transition-all duration-300 border-b border-slate-100 flex items-center"
                                    >
                                        <td className="px-8 flex-1">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-primary-50 group-hover:border-primary-100 transition-all font-mono font-bold text-xs text-slate-400 group-hover:text-primary-600">
                                                    {purchase.purchaseNo.slice(-3)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{purchase.purchaseNo}</p>
                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{purchase.status}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 flex-1">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 tracking-tight">{purchase.vendor?.name}</span>
                                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5 opacity-60">GST: {purchase.vendor?.gst || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 w-40 text-center">
                                            <span className="text-xs font-bold text-slate-600 tracking-wide">{new Date(purchase.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </td>
                                        <td className="px-8 w-48 text-right">
                                            <span className="text-sm font-bold text-emerald-600 tabular-nums">+{formatCurrency(purchase.taxTotal)}</span>
                                        </td>
                                        <td className="px-8 w-48 text-right">
                                            <span className="text-base font-black text-slate-900 tabular-nums">{formatCurrency(purchase.grandTotal)}</span>
                                        </td>
                                        <td className="px-8 w-20 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                                {purchase.ewayBillUrl && (
                                                    <button className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all" title="E-Way Bill">
                                                        <CloudDownload size={16} />
                                                    </button>
                                                )}
                                                <button className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {filtered.length === 0 && (
                    <div className="py-24 flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100 mb-6 border-dashed group">
                             <ShoppingCart className="w-8 h-8 text-slate-200 group-hover:animate-bounce" />
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 tracking-tight">Purchase Ledger Empty</h4>
                        <p className="text-slate-400 mt-2 text-xs font-medium max-w-xs leading-relaxed">No inward purchases found matching your current search parameters.</p>
                        <Link href="/purchases/new" className="mt-8 text-primary-600 font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:gap-3 transition-all">
                            Log Initial Procurement <ArrowRight size={14} />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
