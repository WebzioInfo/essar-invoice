import { db } from "@/db/prisma/client";
import { verifySessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/utils/financials";
import { Card, CardContent } from "@/ui/core/Card";
import { 
  TrendingUp, 
  History, 
  ArrowUpRight,
  ShieldCheck,
  Plus
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils";

function fmtDate(d: Date | string) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdvancesPage() {
  const session = await verifySessionCookie();
  if (!session) redirect("/login");

  const advances = await db.advance.findMany({
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-8 animate-fade-up max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tighter font-display uppercase italic">Advance Management</h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Unallocated Pre-payment Tracking</p>
        </div>

        <div className="flex items-center gap-3">
           <Link href="/payments/new">
             <button className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3">
               <Plus className="w-5 h-5" />
               <span>Add Advance Entry</span>
             </button>
           </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
         <Card className="border-0 bg-emerald-50 ring-1 ring-emerald-500/10 rounded-[2.5rem]">
            <CardContent className="p-8">
               <div className="flex items-center gap-3 mb-4 text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Total Advances Received</span>
               </div>
               <h3 className="text-4xl font-black text-emerald-900 tabular-nums">
                 {formatCurrency(advances.filter((a: any) => a.type === 'RECEIVED').reduce((sum: number, a: any) => sum + Number(a.amount), 0))}
               </h3>
               <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest mt-2">Client Pre-payments</p>
            </CardContent>
         </Card>

         <Card className="border-0 bg-blue-50 ring-1 ring-blue-500/10 rounded-[2.5rem]">
            <CardContent className="p-8">
               <div className="flex items-center gap-3 mb-4 text-blue-600">
                  <ArrowUpRight className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Total Advances Given</span>
               </div>
               <h3 className="text-4xl font-black text-blue-900 tabular-nums">
                 {formatCurrency(advances.filter((a: any) => a.type === 'GIVEN').reduce((sum: number, a: any) => sum + Number(a.amount), 0))}
               </h3>
               <p className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest mt-2">Vendor Pre-payments</p>
            </CardContent>
         </Card>
      </div>

      <Card className="border-0 shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-[2.5rem]">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Advance Stream</h3>
           </div>
        </div>
        <CardContent className="p-0">
          {advances.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
              No advance pre-payments recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                    <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Party</th>
                    <th className="text-center px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                    <th className="text-center px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="text-right px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {advances.map((advance: any) => (
                    <tr key={advance.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-8 py-6">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{fmtDate(advance.date)}</span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{advance.partyName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: #{advance.id.slice(-6)}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                         <span className={cn(
                           "text-[10px] font-black uppercase tracking-tight px-3 py-1 rounded-full border",
                           advance.type === 'RECEIVED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                         )}>
                           {advance.type}
                         </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                             {advance.status === 'ADJUSTED' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{advance.status}</span>
                          </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <span className="text-lg font-black text-slate-900 italic tracking-tighter tabular-nums">
                           {formatCurrency(Number(advance.amount))}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
