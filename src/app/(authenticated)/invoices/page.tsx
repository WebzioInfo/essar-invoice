"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/utils/index";
import { formatCurrency } from "@/utils/financials";
import {
  FileText, Plus, Search, Filter,
  ChevronRight, Calendar, ArrowUpRight, ChevronDown,
} from "lucide-react";
import { StatusBadge } from "@/features/billing/components/StatusBadge";
import { InvoiceListActions } from "@/features/billing/components/InvoiceListActions";
import { InvoicesHeaderActions } from "@/features/billing/components/InvoicesHeaderActions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/core/Card";
import { Button } from "@/ui/core/Button";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { LiveSearch } from "@/components/common/LiveSearch";
import apiClient from "@/lib/apiClient";
import { TableSkeleton } from "@/ui/core/Skeleton";
import { toast } from "sonner";

const STATUS_TABS = [
  { label: "All Records", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Trash", value: "TRASH" },
];

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") || "";
  const searchQuery = searchParams.get("q") || "";
  const page = searchParams.get("page") || "1";

  const [data, setData] = useState<{ invoices: any[]; counts: any } | null>(null);
  const [loading, setLoading] = useState(true);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/api/invoices?status=${statusFilter}&q=${searchQuery}&page=${page}`);
        setData(res.data);
      } catch (error: any) {
        toast.error("Failed to synchronize archives.");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [statusFilter, searchQuery, page, refreshTrigger]);

  if (loading && !data) return <div className="p-8"><TableSkeleton /></div>;

  const invoices = data?.invoices || [];
  const countMap = data?.counts || {};

  return (
    <div className="space-y-8 animate-fade-up">
      {/* ── Header ── */}

      <Card className="border-0 shadow-sm ring-1 ring-slate-200/60 overflow-hidden rounded-[2.5rem] animate-in stagger-2">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <LiveSearch
              placeholder="Search by Invoice # or Client Name..."
              className="flex-1 w-full"
            />

            <div className="relative min-w-[220px] w-full sm:w-auto">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Filter className="w-4 h-4" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  router.push(`/invoices?${val ? `status=${val}` : ""}${searchQuery ? `&q=${searchQuery}` : ""}`);
                }}
                className="w-full appearance-none pl-11 pr-10 py-3 bg-slate-50 hover:bg-slate-100 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-500 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-800 transition-all cursor-pointer shadow-sm"
              >
                {STATUS_TABS.map((tab) => {
                  const count = countMap[tab.value] || 0;
                  return (
                    <option key={tab.value} value={tab.value} className="text-slate-900 font-bold">
                      {tab.label} ({count})
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            <div className="w-full sm:w-auto">
              <InvoicesHeaderActions />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── List Content ── */}
      <ErrorBoundary name="Invoice Table">
        <Card className="border-0 shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-[2.5rem] animate-in stagger-3">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 bg-slate-50/30">
              <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-xl shadow-slate-200/50 mb-6">
                <FileText className="w-10 h-10 opacity-20" />
              </div>
              <p className="font-black text-slate-900 text-xl italic uppercase tracking-tight">Zero Records Found</p>
              <p className="text-xs text-slate-500 mt-2 mb-10 font-bold uppercase tracking-widest italic opacity-60">
                {searchQuery || statusFilter ? "Adjustment of search filters required" : "Begin by generating your first document"}
              </p>
              <Link href="/invoices/new">
                <Button variant="primary" size="lg" className="italic px-8">
                  <Plus className="w-5 h-5 mr-1" />
                  Initiate First Invoice
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reference</th>
                    <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Entity Details</th>
                    <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hidden sm:table-cell">Timeline</th>
                    <th className="text-right px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Valuation</th>
                    <th className="text-center px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Policy</th>
                    <th className="text-right px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Execution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
                            <FileText size={18} className="text-slate-400 group-hover:text-primary-600" />
                          </div>
                          <p className="font-extrabold text-slate-900 text-base tracking-tight">{inv.invoiceNo}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <Link
                          href={`/clients/${inv.client.id}`}
                          className="group/client inline-flex flex-col hover:text-primary-600 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-black text-slate-800 tracking-tight group-hover/client:text-primary-600 transition-colors">{inv.client.name}</p>
                            <ArrowUpRight size={12} className="opacity-0 group-hover/client:opacity-100 transition-all text-primary-500" />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Corporate Client</p>
                        </Link>
                      </td>
                      <td className="px-8 py-6 hidden sm:table-cell">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                            <Calendar className="w-3.5 h-3.5 text-primary-500" />
                            {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(inv.date))}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Registration Date</p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <p className="text-lg font-black text-slate-900 italic tracking-tighter">{formatCurrency(Number(inv.grandTotal))}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Inclusive of GST</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex justify-center scale-110">
                          <StatusBadge status={inv.status} />
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <InvoiceListActions
                          invoiceId={inv.id}
                          isTrashed={statusFilter === "TRASH"}
                          onSuccess={refresh}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </ErrorBoundary>
    </div>
  );
}
