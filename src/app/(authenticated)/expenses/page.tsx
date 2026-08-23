import { db } from "@/db/prisma/client";
import { verifySessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency, fmtDate } from "@/utils/financials";
import { Card, CardContent } from "@/ui/core/Card";
import { Button } from "@/ui/core/Button";
import { Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { LiveSearch } from "@/components/common/LiveSearch";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const session = await verifySessionCookie();
  if (!session) redirect("/login");

  const params = await searchParams;
  const searchQuery = params.q || "";

  const expenses = await db.expense.findMany({
    where: searchQuery
      ? {
          OR: [
            { category: { contains: searchQuery } },
            { description: { contains: searchQuery } },
          ],
        }
      : undefined,
    orderBy: { date: "desc" },
    take: 100,
  });

  const totalExpenseAmount = expenses.reduce(
    (sum: number, e: any) => sum + Number(e.amount),
    0
  );

  return (
    <div className="space-y-8 animate-fade-up max-w-7xl mx-auto pb-24">
      {/* ── Search, Stats & Action Bar ── */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/60 overflow-hidden rounded-[2.5rem] animate-in stagger-2">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <LiveSearch
              placeholder="Search expenses by category or description..."
              className="flex-1 w-full"
            />

            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-900 w-full sm:w-auto shrink-0">
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Total Outflow</p>
                <p className="text-base font-black italic tabular-nums">{formatCurrency(totalExpenseAmount)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Link href="/expenses/new" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full italic shadow-xl shadow-accent-500/20 whitespace-nowrap">
                  <Plus className="w-5 h-5 mr-1" />
                  Record Expense
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Expenses Table ── */}
      <Card className="border-0 shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-[2.5rem] bg-white/50 backdrop-blur-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date</th>
                  <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</th>
                  <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Description</th>
                  <th className="text-right px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Receipt className="w-8 h-8 text-slate-300" />
                      </div>
                      No expense records found.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense: any) => (
                    <tr key={expense.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-6">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{fmtDate(expense.date)}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{expense.category}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{expense.description || "Uncategorized Expense"}</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className="text-lg font-black text-rose-600 italic tracking-tighter tabular-nums">
                          {formatCurrency(Number(expense.amount))}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
