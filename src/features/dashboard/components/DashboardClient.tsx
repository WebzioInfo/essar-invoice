"use client";

import React from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import {
  FileText,
  Users,
  Package,
  IndianRupee,
  FilePlus,
  ClipboardList,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/utils";
import { StatusBadge } from "@/features/billing/components/StatusBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/ui/core/Card";
import { Button } from "@/ui/core/Button";

interface DashboardClientProps {
  data: {
    invoiceCount: number;
    clientCount: number;
    productCount: number;
    totalRevenue: number;
    totalOutstanding: number;
    thisMonthRevenue: number;
    statusMap: Record<string, number>;
    pendingInvoices: any[];
    recentInvoices: any[];
  };
}

const containerVars: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVars: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  },
};

export function DashboardClient({ data }: DashboardClientProps) {
  const {
    invoiceCount,
    clientCount,
    productCount,
    totalRevenue,
    totalOutstanding,
    thisMonthRevenue,
    statusMap,
    pendingInvoices,
    recentInvoices,
  } = data;

  return (
    <motion.div 
      variants={containerVars}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* ── Welcome Banner ── */}
      <motion.div
        variants={itemVars}
        className="rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-primary-900/10"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" }}
      >
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #6366F1 0%, transparent 60%)" }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Enterprise Overview</h2>
            <p className="text-slate-400 text-sm mt-1.5 font-medium">
              System Operations Hub — {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Link href="/invoices/new">
            <Button variant="secondary" size="lg" className="shadow-xl shadow-accent-500/20">
              <FilePlus className="w-4 h-4" />
              Generate Invoice
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <motion.div 
        variants={itemVars}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={<IndianRupee className="w-5 h-5 text-emerald-500" />}
          sub="Accrued from paid orders"
        />
        <KpiCard
          label="Monthly Target"
          value={formatCurrency(thisMonthRevenue)}
          icon={<TrendingUp className="w-5 h-5 text-primary-500" />}
          sub="Revenue in current cycle"
        />
        <KpiCard
          label="Outstanding"
          value={formatCurrency(totalOutstanding)}
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          sub="Pending receivables"
        />
        <KpiCard
          label="Active Database"
          value={clientCount.toString()}
          icon={<Users className="w-5 h-5 text-indigo-500" />}
          sub={`${productCount} system nodes`}
        />
      </motion.div>

      {/* ── Main Operations Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Invoices */}
        <motion.div variants={itemVars} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-6">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest financial transactions and billing</CardDescription>
              </div>
              <Link href="/invoices">
                <Button variant="ghost" size="sm" className="text-xs font-bold">
                  View General Ledger <ChevronRight size={14} className="ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-1">
                {recentInvoices.length === 0 ? (
                  <EmptyState />
                ) : (
                  recentInvoices.map((inv: any) => (
                    <Link key={inv.id} href={`/invoices/${inv.id}`} className="block">
                      <div className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50/80 transition-all group border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all text-slate-400 group-hover:text-primary-500">
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-800 truncate">{inv.invoiceNo}</p>
                            <p className="text-xs text-slate-400 font-semibold truncate mt-0.5">{inv.client.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <StatusBadge status={inv.status} />
                          <p className="font-bold text-sm text-slate-900">{formatCurrency(inv.grandTotal.toNumber())}</p>
                          <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column: Status & Pending */}
        <div className="space-y-6">
          <motion.div variants={itemVars}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <StatusRow label="Drafts" count={statusMap["DRAFT"] || 0} color="bg-slate-300" total={invoiceCount} />
                <StatusRow label="Deployed" count={statusMap["SENT"] || 0} color="bg-blue-500" total={invoiceCount} />
                <StatusRow label="Settled" count={statusMap["PAID"] || 0} color="bg-emerald-500" total={invoiceCount} />
                <StatusRow label="Critical" count={statusMap["OVERDUE"] || 0} color="bg-red-500" total={invoiceCount} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVars}>
            <Card className="bg-white/50 border-dashed border-2 border-slate-100 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Pending Collections</CardTitle>
                <Clock className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingInvoices.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No pending items detected.</p>
                ) : (
                  pendingInvoices.map((inv: any) => (
                    <Link key={inv.id} href={`/invoices/${inv.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-50">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{inv.client.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{inv.invoiceNo}</p>
                        </div>
                        <p className="text-xs font-bold text-red-600 ml-2 shrink-0">{formatCurrency(inv.grandTotal.toNumber())}</p>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function KpiCard({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub: string }) {
  return (
    <Card className="hover:scale-[1.03] transition-fluid group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 opacity-80">{label}</p>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center transition-all group-hover:bg-white group-hover:shadow-soft border border-transparent group-hover:border-slate-50">
            {icon}
          </div>
        </div>
        <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">{value}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{sub}</p>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, count, color, total }: { label: string; count: number; color: string; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[11px]">
        <span className="font-bold text-slate-500 uppercase tracking-tight">{label}</span>
        <span className="font-black text-slate-900">{count}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
          className={`h-full rounded-full ${color}`} 
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileText size={24} className="text-slate-200" />
      </div>
      <p className="text-sm font-bold text-slate-400">Secure Vault Empty</p>
      <p className="text-xs text-slate-300 mt-1">Initialize your first record.</p>
    </div>
  );
}
