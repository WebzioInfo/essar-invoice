"use client";

import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/ui/core/Table";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Layers } from "lucide-react";
import { cn } from "@/utils";
import { StockLogActions } from "./StockLogActions";
import { Card } from "@/ui/core/Card";

interface StockLog {
    id: string;
    productId: string;
    type: string;
    quantityBefore: any;
    quantityChange: any;
    quantityAfter: any;
    referenceId: string | null;
    notes: string | null;
    createdAt: string;
    product: {
        description: string;
        sku: string | null;
    };
}

export function StockLogTable({ logs }: { logs: StockLog[] }) {
    if (logs.length === 0) {
        return (
            <Card className="border-0 shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-[2.5rem] bg-white/50 backdrop-blur-xl">
                <div className="flex flex-col items-center justify-center py-32 text-slate-400 bg-slate-50/30">
                    <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-xl shadow-slate-200/50 mb-6">
                        <Layers className="w-10 h-10 opacity-20" />
                    </div>
                    <p className="font-black text-slate-900 text-xl italic uppercase tracking-tight">Zero Inventory Logs</p>
                    <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest italic opacity-60">
                        Stock movements and ledger logs will appear here
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-[2.5rem] bg-white/50 backdrop-blur-xl">
            <div className="overflow-x-auto">
                <Table className="w-full">
                    <TableHeader className="bg-slate-900">
                        <TableRow>
                            <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Timestamp</TableHead>
                            <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Product / SKU</TableHead>
                            <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Movement</TableHead>
                            <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Delta</TableHead>
                            <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">New Balance</TableHead>
                            <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                        {logs.map((log) => {
                            const change = Number(log.quantityChange);
                            const isPositive = change > 0;

                            return (
                                <TableRow key={log.id} className="hover:bg-slate-50/80 transition-all group">
                                    <TableCell className="py-6 px-8">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-900 italic tracking-tight">
                                                {format(new Date(log.createdAt), "MMM dd, yyyy · HH:mm")}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                Log ID: {log.id.slice(-6)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[240px]">
                                                {log.product?.description || "Product Item"}
                                            </span>
                                            {log.product?.sku && (
                                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                    SKU: {log.product.sku}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-8 py-6 text-center">
                                        <div className="inline-flex justify-center">
                                            <div
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                    log.type === "ADD"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        : log.type === "REMOVE"
                                                        ? "bg-rose-50 text-rose-700 border-rose-100"
                                                        : "bg-amber-50 text-amber-700 border-amber-100"
                                                )}
                                            >
                                                {log.type === "ADD" && <ArrowUpRight size={10} />}
                                                {log.type === "REMOVE" && <ArrowDownRight size={10} />}
                                                {log.type === "MANUAL" && <RefreshCw size={10} />}
                                                {log.type}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-8 py-6 text-right">
                                        <span
                                            className={cn(
                                                "text-sm font-black italic tabular-nums",
                                                isPositive ? "text-emerald-600" : "text-rose-600"
                                            )}
                                        >
                                            {isPositive ? "+" : ""}
                                            {change}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-8 py-6 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-black text-slate-900 tabular-nums italic">
                                                {Number(log.quantityAfter)}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                Units
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-8 py-6 text-right">
                                        <StockLogActions
                                            logId={log.id}
                                            currentQuantity={Number(log.quantityChange)}
                                            currentNotes={log.notes}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}
