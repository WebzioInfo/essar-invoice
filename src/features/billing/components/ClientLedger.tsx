"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/utils/financials";
import { Download, History } from "lucide-react";
import { Card } from "@/ui/core/Card";
import { Button } from "@/ui/core/Button";
import { Skeleton } from "@/ui/core/Skeleton";

interface LedgerEntry {
    id: string;
    date: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    referenceType: string;
}

export function ClientLedger({ clientId, clientName }: { clientId: string, clientName: string }) {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        async function fetchLedger() {
            try {
                const res = await fetch(`/api/reports/ledger?partyId=${clientId}&partyType=CLIENT`);
                if (!res.ok) throw new Error("Failed to fetch ledger");
                const data = await res.json();
                const fetchedEntries = data.entries || [];
                setEntries(fetchedEntries);
                
                const bal = fetchedEntries.reduce((acc: number, curr: any) => {
                    const amt = Number(curr.amount || curr.debit || curr.credit || 0);
                    return curr.type === 'CREDIT' ? acc + amt : acc - amt;
                }, 0);
                setBalance(bal);
            } catch (err) {
                console.error("Failed to fetch ledger", err);
            } finally {
                setLoading(false);
            }
        }
        fetchLedger();
    }, [clientId]);

    const handleDownload = () => {
        window.open(`/api/statements/download?partyId=${clientId}&partyType=CLIENT`, '_blank');
    };

    if (loading) return <Skeleton className="h-[400px] w-full rounded-3xl" />;

    return (
        <Card className="overflow-hidden border-0 shadow-2xl shadow-slate-200/50 bg-white/50 backdrop-blur-xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-slate-50 to-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                        <History className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Statement of Account</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{clientName}</p>
                    </div>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 border-slate-200"
                    onClick={handleDownload}
                >
                    <Download className="w-3.5 h-3.5" />
                    Export PDF
                </Button>
            </div>

            <div className="p-6">
                {entries.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        No ledger transactions recorded yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Type</th>
                                    <th className="py-3 px-4">Description</th>
                                    <th className="py-3 px-4 text-right">Debit</th>
                                    <th className="py-3 px-4 text-right">Credit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                                {entries.map((entry: any) => (
                                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3 px-4 text-slate-500">
                                            {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-black ${
                                                entry.type === 'DEBIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                            }`}>
                                                {entry.type || entry.referenceType}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-900">{entry.description}</td>
                                        <td className="py-3 px-4 text-right font-black text-slate-900">
                                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right font-black text-slate-900">
                                            {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Card>
    );
}
