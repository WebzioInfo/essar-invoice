import { db } from "@/db/prisma/client";
import { verifySessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/utils/financials";
import { formatDate } from "@/utils/date";
import { Card, CardContent } from "@/ui/core/Card";
import { Button } from "@/ui/core/Button";
import {
  Plus,
  LifeBuoy,
  TrendingUp,
  ArrowRightLeft,
  Calendar,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { LiveSearch } from "@/components/common/LiveSearch";
import { cn } from "@/utils";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function LoansPage({ searchParams }: PageProps) {
  const session = await verifySessionCookie();
  if (!session) redirect("/login");

  const params = await searchParams;
  const searchQuery = params.q || "";

  const [rawLoans, rawAdvances] = await Promise.all([
    db.loan.findMany({
      where: searchQuery
        ? {
            OR: [
              { partyName: { contains: searchQuery } },
              { notes: { contains: searchQuery } },
            ],
          }
        : undefined,
      orderBy: { date: "desc" },
    }),
    db.advance.findMany({
      where: searchQuery
        ? {
            OR: [
              { partyName: { contains: searchQuery } },
              { notes: { contains: searchQuery } },
            ],
          }
        : undefined,
      orderBy: { date: "desc" },
    }),
  ]);

  const totalLiabilities = rawLoans
    .filter((l: any) => l.type === "TAKEN")
    .reduce((sum: number, l: any) => sum + Number(l.amount), 0);

  const totalReceivables = rawLoans
    .filter((l: any) => l.type === "GIVEN")
    .reduce((sum: number, l: any) => sum + Number(l.amount), 0);

  const advancesReceived = rawAdvances
    .filter((a: any) => a.type === "RECEIVED")
    .reduce((sum: number, a: any) => sum + Number(a.amount), 0);

  const advancesGiven = rawAdvances
    .filter((a: any) => a.type === "GIVEN")
    .reduce((sum: number, a: any) => sum + Number(a.amount), 0);

  return (
    <div className="space-y-8 animate-fade-up max-w-7xl mx-auto pb-24">
      {/* ── Search & Action Bar ── */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/60 overflow-hidden rounded-[2.5rem] animate-in stagger-2">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <LiveSearch
              placeholder="Search loans & advances by party name or description..."
              className="flex-1 w-full"
            />

            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Link href="/loans/new" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full italic shadow-xl shadow-accent-500/20 whitespace-nowrap">
                  <Plus className="w-5 h-5 mr-1" />
                  New Capital Entry
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats KPI Summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-900 border-0 rounded-[2.5rem] p-7 text-white relative overflow-hidden group shadow-xl">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">Total Liabilities</p>
          <h3 className="text-3xl font-black tabular-nums tracking-tighter italic">
            {formatCurrency(totalLiabilities)}
          </h3>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Loans Taken (Payable)</p>
        </Card>

        <Card className="bg-white border-0 ring-1 ring-slate-200 rounded-[2.5rem] p-7 shadow-sm group hover:shadow-md transition-all">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary-600 mb-1">Total Receivables</p>
          <h3 className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter italic">
            {formatCurrency(totalReceivables)}
          </h3>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Loans Given (Receivable)</p>
        </Card>

        <Card className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-7 shadow-sm">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.25em] mb-1">Advances Received</p>
          <h3 className="text-3xl font-black text-emerald-900 tabular-nums tracking-tighter italic">
            {formatCurrency(advancesReceived)}
          </h3>
          <p className="text-[9px] font-bold text-emerald-600 mt-1 uppercase tracking-widest">Inward Advance Capital</p>
        </Card>

        <Card className="bg-amber-50 border border-amber-100 rounded-[2.5rem] p-7 shadow-sm">
          <p className="text-[10px] font-black text-amber-700 uppercase tracking-[0.25em] mb-1">Advances Given</p>
          <h3 className="text-3xl font-black text-amber-900 tabular-nums tracking-tighter italic">
            {formatCurrency(advancesGiven)}
          </h3>
          <p className="text-[9px] font-bold text-amber-600 mt-1 uppercase tracking-widest">Outward Advance Capital</p>
        </Card>
      </div>

      {/* ── Loans & Advances Tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Loans Table */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-0 shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-[2.5rem] bg-white/50 backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loan Party</th>
                    <th className="text-center px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Type</th>
                    <th className="text-center px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                    <th className="text-right px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Principal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawLoans.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                          <LifeBuoy className="w-8 h-8 text-slate-300" />
                        </div>
                        No loan records found.
                      </td>
                    </tr>
                  ) : (
                    rawLoans.map((loan: any) => (
                      <tr key={loan.id} className="hover:bg-slate-50/80 transition-all group">
                        <td className="px-8 py-6">
                          <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{loan.partyName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{formatDate(loan.date)}</p>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                              loan.type === "TAKEN"
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-primary-50 text-primary-700 border-primary-100"
                            )}
                          >
                            {loan.type === "TAKEN" ? "Taken" : "Given"}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <span
                            className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                              loan.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : "bg-slate-100 text-slate-500"
                            )}
                          >
                            {loan.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="text-base font-black text-slate-900 italic tracking-tighter tabular-nums">
                            {formatCurrency(Number(loan.amount))}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Advances Table */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-0 shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-[2.5rem] bg-white/50 backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Advance Party</th>
                    <th className="text-center px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Type</th>
                    <th className="text-right px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawAdvances.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                          <TrendingUp className="w-8 h-8 text-slate-300" />
                        </div>
                        No advance records found.
                      </td>
                    </tr>
                  ) : (
                    rawAdvances.map((advance: any) => (
                      <tr key={advance.id} className="hover:bg-slate-50/80 transition-all group">
                        <td className="px-8 py-6">
                          <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{advance.partyName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{formatDate(advance.date)}</p>
                        </td>
                        <td className="px-4 py-6 text-center">
                          <span
                            className={cn(
                              "text-[8px] font-black uppercase px-2.5 py-1 rounded-full border",
                              advance.type === "RECEIVED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-amber-50 text-amber-700 border-amber-100"
                            )}
                          >
                            {advance.type === "RECEIVED" ? "Recv" : "Given"}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="text-base font-black text-slate-900 italic tracking-tighter tabular-nums">
                            {formatCurrency(Number(advance.amount))}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
