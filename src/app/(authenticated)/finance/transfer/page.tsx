import { db } from "@/db/prisma/client";
import { verifySessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TransferForm } from "./TransferForm";
import { FinanceService } from "@/features/billing/services/FinanceService";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import Link from "next/link";

export default async function TransferPage() {
  const session = await verifySessionCookie();
  if (!session) redirect("/login");

  const rawAccounts = await db.account.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });

  const accounts = await Promise.all(
    rawAccounts.map(async (acc) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      balance: await FinanceService.getAccountBalance(acc.id)
    }))
  );

  return (
    <div className="space-y-8 animate-fade-up max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/accounts" className="h-12 w-12 glass flex items-center justify-center rounded-2xl text-slate-400 hover:text-slate-900 transition-all border border-slate-200 group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tighter font-display uppercase italic flex items-center gap-3">
              <ArrowRightLeft className="w-8 h-8 text-primary-600" />
              Internal Money Transfer
            </h1>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Double-Entry Account Settlement Protocol</p>
          </div>
        </div>
      </div>

      <TransferForm accounts={accounts} />
    </div>
  );
}
