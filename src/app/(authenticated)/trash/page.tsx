"use client";

import React, { useEffect, useState } from "react";
import { Trash2, FileText, ClipboardList, Package } from "lucide-react";
import { Card, CardContent } from "@/ui/core/Card";
import { formatCurrency } from "@/utils/financials";
import { InvoiceListActions } from "@/features/billing/components/InvoiceListActions";
import { QuotationListActions } from "@/features/billing/components/QuotationListActions";
import { PurchaseListActions } from "@/features/procurement/components/PurchaseListActions";
import apiClient from "@/lib/apiClient";
import { TableSkeleton } from "@/ui/core/Skeleton";
import { toast } from "sonner";

export default function TrashPage() {
  const [data, setData] = useState<{ invoices: any[]; quotations: any[]; purchases: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    const fetchTrash = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/api/trash/list");
        setData(res.data);
      } catch (error: any) {
        toast.error("Failed to synchronize system trash.");
      } finally {
        setLoading(false);
      }
    };
    fetchTrash();
  }, [refreshTrigger]);

  if (loading && !data) return <div className="p-8"><TableSkeleton /></div>;

  const invoices = data?.invoices || [];
  const quotations = data?.quotations || [];
  const purchases = data?.purchases || [];


  const totalTrash = invoices.length + quotations.length + purchases.length;

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="max-w-2xl">
        <h1 className="text-5xl font-black tracking-tight text-slate-900 font-display italic uppercase">
          System <span className="text-red-600">Trash</span>
        </h1>
        <p className="text-slate-500 mt-4 text-lg font-medium leading-relaxed italic">
          Recover deleted documents or purge them permanently from the system registry.
        </p>
      </div>

      {totalTrash === 0 ? (
        <div className="text-center py-32 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 rounded-[2.5rem] bg-white flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50">
            <Trash2 className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-slate-800 font-black text-2xl font-display uppercase italic tracking-tighter">Vault is Empty</h3>
          <p className="text-sm font-bold text-slate-400 mt-3 max-w-sm mx-auto leading-relaxed uppercase tracking-widest opacity-60">
            No deleted records found in the system.
          </p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Invoices Trash */}
          {invoices.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 px-4">
                <FileText className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 italic">Invoices ({invoices.length})</h2>
              </div>
              <Card className="border-0 shadow-2xl shadow-primary-900/5 overflow-hidden">
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-900">
                        <th className="text-left px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reference</th>
                        <th className="text-left px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Client</th>
                        <th className="text-right px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Value</th>
                        <th className="text-right px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="group hover:bg-slate-50 transition-all">
                          <td className="px-8 py-5 font-black text-slate-900 uppercase">{inv.invoiceNo}</td>
                          <td className="px-8 py-5 font-bold text-slate-600 uppercase text-xs">{inv.client.name}</td>
                          <td className="px-8 py-5 text-right font-black text-slate-900 italic">{formatCurrency(Number(inv.grandTotal))}</td>
                          <td className="px-8 py-5 text-right">
                            <InvoiceListActions invoiceId={inv.id} isTrashed onSuccess={refresh} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Quotations Trash */}
          {quotations.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 px-4">
                <ClipboardList className="w-5 h-5 text-amber-600" />
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 italic">Proposals ({quotations.length})</h2>
              </div>
              <Card className="border-0 shadow-2xl shadow-amber-900/5 overflow-hidden">
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-900">
                        <th className="text-left px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reference</th>
                        <th className="text-left px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Client</th>
                        <th className="text-right px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Value</th>
                        <th className="text-right px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quotations.map((quo) => (
                        <tr key={quo.id} className="group hover:bg-slate-50 transition-all">
                          <td className="px-8 py-5 font-black text-slate-900 uppercase">{quo.quotationNo}</td>
                          <td className="px-8 py-5 font-bold text-slate-600 uppercase text-xs">{quo.client.name}</td>
                          <td className="px-8 py-5 text-right font-black text-slate-900 italic">{formatCurrency(Number(quo.grandTotal))}</td>
                          <td className="px-8 py-5 text-right">
                            <QuotationListActions quotationId={quo.id} isTrashed onSuccess={refresh} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Purchases Trash */}
          {purchases.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 px-4">
                <Package className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 italic">Procurement ({purchases.length})</h2>
              </div>
              <Card className="border-0 shadow-2xl shadow-indigo-900/5 overflow-hidden">
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-900">
                        <th className="text-left px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reference</th>
                        <th className="text-right px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Value</th>
                        <th className="text-right px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchases.map((pur) => (
                        <tr key={pur.id} className="group hover:bg-slate-50 transition-all">
                          <td className="px-8 py-5 font-black text-slate-900 uppercase">{pur.purchaseNo}</td>
                          <td className="px-8 py-5 text-right font-black text-slate-900 italic">{formatCurrency(Number(pur.grandTotal))}</td>
                          <td className="px-8 py-5 text-right">
                            <PurchaseListActions purchaseId={pur.id} isTrashed onSuccess={refresh} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
