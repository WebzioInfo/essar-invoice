'use client';

import { useState } from "react";
import { Card, CardContent } from "@/ui/core/Card";
import { Button } from "@/ui/core/Button";
import {
  ArrowRightLeft,
  Building2,
  Wallet,
  CheckCircle2,
  Loader2,
  AlertCircle
} from "lucide-react";
import { formatCurrency } from "@/utils/financials";
import { recordInternalTransfer } from "@/features/billing/actions/FinanceActions";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export function TransferForm({ accounts }: { accounts: any[] }) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const router = useRouter();

  const sourceAccount = accounts.find(a => a.id === sourceId);
  const targetAccount = accounts.find(a => a.id === targetId);

  const handleSubmit = async (e?: React.FormEvent, isConfirmed = false) => {
    e?.preventDefault();
    if (!sourceId || !targetId || !amount) return;

    setLoading(true);
    setError(null);
    setWarning(null);

    const res = await recordInternalTransfer({
      sourceAccountId: sourceId,
      targetAccountId: targetId,
      amount: parseFloat(amount),
      description,
      confirmed: isConfirmed
    });

    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/transactions");
      }, 1500);
    } else if ('warning' in res && res.warning) {
      setWarning(res.warning as string);
    } else {
      setError(('error' in res && res.error) ? res.error as string : "Failed to process transfer.");
    }
  };

  return (
    <Card className="border-0 shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-[2.5rem] bg-white">
      <CardContent className="p-8 md:p-12">
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
          
          {/* Source and Target Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            
            {/* Source Account */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">
                From Account (Source / Debited)
              </label>
              <div className="relative">
                <select
                  value={sourceId}
                  onChange={(e) => {
                    setSourceId(e.target.value);
                    if (e.target.value === targetId) setTargetId("");
                  }}
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-500 rounded-2xl font-bold text-sm text-slate-900 transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select Source Account...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) — Bal: ₹{acc.balance?.toLocaleString('en-IN') || 0}
                    </option>
                  ))}
                </select>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  {sourceAccount?.type === 'CASH' ? <Wallet className="w-5 h-5 text-emerald-500" /> : <Building2 className="w-5 h-5 text-blue-500" />}
                </div>
              </div>
              {sourceAccount && (
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pl-1">
                  Current Liquidity: <span className="text-slate-900">{formatCurrency(sourceAccount.balance)}</span>
                </p>
              )}
            </div>

            {/* Target Account */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">
                To Account (Destination / Credited)
              </label>
              <div className="relative">
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-500 rounded-2xl font-bold text-sm text-slate-900 transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select Destination Account...</option>
                  {accounts
                    .filter((acc) => acc.id !== sourceId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}) — Bal: ₹{acc.balance?.toLocaleString('en-IN') || 0}
                      </option>
                    ))}
                </select>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  {targetAccount?.type === 'CASH' ? <Wallet className="w-5 h-5 text-emerald-500" /> : <Building2 className="w-5 h-5 text-blue-500" />}
                </div>
              </div>
              {targetAccount && (
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pl-1">
                  Current Balance: <span className="text-slate-900">{formatCurrency(targetAccount.balance)}</span>
                </p>
              )}
            </div>

          </div>

          {/* Amount & Description */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3 md:col-span-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">
                Transfer Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-14 px-4 bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-500 rounded-2xl font-black text-xl text-slate-900 placeholder:text-slate-300"
                required
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">
                Remarks / Purpose
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Bank Cash Withdrawal, Inter-account Transfer..."
                className="w-full h-14 px-4 bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-500 rounded-2xl font-bold text-sm text-slate-900 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Warning banner */}
          <AnimatePresence>
            {warning && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs font-bold">{warning}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => handleSubmit(e, true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase shrink-0"
                >
                  Proceed Anyway
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-xs font-bold">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              {error}
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-xs font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              Transfer executed successfully! Updating ledgers...
            </div>
          )}

          {/* Action Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <Button
              type="submit"
              disabled={loading || !sourceId || !targetId || !amount}
              size="lg"
              className="h-14 px-10 bg-slate-900 hover:bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-900/10 transition-all flex items-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Executing Transaction...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" /> Execute Internal Transfer
                </>
              )}
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
}
