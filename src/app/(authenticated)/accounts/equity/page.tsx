import { db } from "@/db/prisma/client";
import { verifySessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { 
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { FounderForm } from "@/features/billing/components/FounderForm";

export default async function FounderEquityPage() {
    const session = await verifySessionCookie();
    if (!session) redirect("/login");

    // Fetch Founder Account
    const founderAccount = await db.account.findFirst({
        where: { type: 'EQUITY' }
    });

    // Fetch Cash/Bank Accounts for the target/source
    const liquidAccounts = await db.account.findMany({
        where: { type: { in: ['BANK', 'CASH'] } }
    });

    if (!founderAccount) {
        return (
            <div className="p-20 text-center">
                <h2 className="text-2xl font-black uppercase italic">Founder Account Not Initialized</h2>
                <p className="text-slate-400 mt-2 font-bold uppercase tracking-widest text-xs">Please create an EQUITY type account in the database first.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-up max-w-2xl mx-auto pb-24">
            <Link href="/accounts" className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Accounts
            </Link>

            <FounderForm 
                founderAccount={founderAccount} 
                liquidAccounts={liquidAccounts} 
            />
        </div>
    );
}
