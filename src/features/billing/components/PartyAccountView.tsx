"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/ui/core/Card";
import { Button } from "@/ui/core/Button";
import { useToast } from "@/context/ToastContext";
import { 
    Building2, Mail, Phone, MapPin, ShieldCheck, TrendingUp, 
    CreditCard, FileText, Calendar, Filter, Search, Download, Printer, 
    MessageSquare, ChevronRight, CheckCircle2, Clock, 
    AlertTriangle, RefreshCw, Loader2, Edit3
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/utils/financials";
import { StatusBadge } from "@/features/billing/components/StatusBadge";
import { InvoiceShareModal } from "./InvoiceShareModal";
import { getPartyAccountOverviewAction } from "../actions/accountActions";
import apiClient from "@/lib/apiClient";

interface PartyAccountViewProps {
    partyId: string;
    partyType: 'CLIENT' | 'SUPPLIER';
    initialData?: any;
}

export function PartyAccountView({ partyId, partyType, initialData }: PartyAccountViewProps) {
    const isClient = partyType === 'CLIENT';
    const { success, error } = useToast();

    // Tab Navigation
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LEDGER' | 'DOCUMENTS' | 'PAYMENTS' | 'OUTSTANDING' | 'STATEMENT'>('OVERVIEW');

    // Data state
    const [loading, setLoading] = useState(false);
    const [accountData, setAccountData] = useState<any>(initialData || null);

    // Filter states
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [txType, setTxType] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Statement PDF state
    const [isDownloadingStatement, setIsDownloadingStatement] = useState(false);

    // Share Modal State
    const [shareModalConfig, setShareModalConfig] = useState<{
        isOpen: boolean;
        documentType: 'INVOICE' | 'CLIENT_STATEMENT' | 'VENDOR_STATEMENT';
        invoiceId?: string;
        partyId?: string;
        actionType: 'SHARE' | 'FOLLOWUP';
        channel: 'WHATSAPP' | 'EMAIL';
    }>({
        isOpen: false,
        documentType: 'INVOICE',
        invoiceId: "",
        partyId: "",
        actionType: 'SHARE',
        channel: 'WHATSAPP'
    });

    useEffect(() => {
        loadData();
    }, [partyId, partyType, startDate, endDate, txType, searchQuery]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getPartyAccountOverviewAction(partyId, partyType, {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                transactionType: txType || undefined,
                search: searchQuery || undefined
            });

            if (res && 'success' in res && res.data) {
                setAccountData(res.data);
            } else if (res && 'error' in res) {
                error(res.error || "Failed to load account overview.");
            }
        } catch (err: any) {
            console.error("[ACCOUNT_LOAD_ERROR]", err);
            error(err.message || "Error loading account data.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadStatement = async () => {
        setIsDownloadingStatement(true);
        try {
            const res = await apiClient.post("/api/statements/download", {
                partyId,
                partyType,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            }, {
                responseType: 'blob'
            });

            const disposition = (res.headers as any)["content-disposition"] || "";
            const fileNameMatch = disposition.match(/filename="?([^"]+)"?/);
            const fileName = fileNameMatch ? fileNameMatch[1] : `Statement_${summary?.name || 'Account'}.pdf`;

            const url = URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            success("Account Statement PDF downloaded successfully.");
        } catch (err: any) {
            console.error("[STATEMENT_DOWNLOAD_ERROR]", err);
            error("Failed to download Account Statement PDF.");
        } finally {
            setIsDownloadingStatement(false);
        }
    };

    const handlePrintStatement = async () => {
        setIsDownloadingStatement(true);
        try {
            const res = await apiClient.post("/api/statements/download", {
                partyId,
                partyType,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            }, { responseType: 'blob' });

            const url = URL.createObjectURL(res.data);
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);

            iframe.onload = () => {
                iframe.contentWindow?.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    URL.revokeObjectURL(url);
                }, 1000);
            };

            success("Opening print dialog for Account Statement...");
        } catch (err: any) {
            error("Failed to print statement.");
        } finally {
            setIsDownloadingStatement(false);
        }
    };

    if (!accountData && loading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading complete financial account ledger...</p>
            </div>
        );
    }

    const summary = accountData?.summary;
    const ledger = accountData?.ledger || [];
    const documents = accountData?.documents || [];
    const payments = accountData?.payments || [];
    const outstanding = accountData?.outstanding || { totalOutstanding: 0, items: [] };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
            {/* ── TOP HEADER & ACTIONS BAR ── */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                        <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black italic uppercase tracking-tight">{summary?.name}</h1>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                                {summary?.accountStatus}
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-3">
                            <span>{summary?.partyType === 'CLIENT' ? 'Customer Account' : 'Supplier/Vendor Account'}</span>
                            {summary?.gstin && <span>• GST: {summary.gstin}</span>}
                            {summary?.phone && <span>• {summary.phone}</span>}
                        </p>
                    </div>
                </div>

                {/* Primary ERP Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => setActiveTab('STATEMENT')}
                        className="h-11 px-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 border border-white/10"
                    >
                        <Printer className="w-4 h-4 text-slate-300" />
                        Statement
                    </button>

                    <button
                        onClick={() => setShareModalConfig({
                            isOpen: true,
                            documentType: isClient ? 'CLIENT_STATEMENT' : 'VENDOR_STATEMENT',
                            partyId,
                            actionType: 'SHARE',
                            channel: 'EMAIL'
                        })}
                        className="h-11 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-indigo-950/40"
                    >
                        <Mail className="w-4 h-4" />
                        Email
                    </button>

                    <button
                        onClick={() => setShareModalConfig({
                            isOpen: true,
                            documentType: isClient ? 'CLIENT_STATEMENT' : 'VENDOR_STATEMENT',
                            partyId,
                            actionType: 'SHARE',
                            channel: 'WHATSAPP'
                        })}
                        className="h-11 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/40"
                    >
                        <MessageSquare className="w-4 h-4" />
                        WhatsApp
                    </button>
                </div>
            </div>

            {/* ── ACCOUNT SUMMARY STRIP ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <Card className="border-0 shadow-lg ring-1 ring-slate-200 bg-white p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        {isClient ? 'Current Outstanding' : 'Current Payable'}
                    </p>
                    <p className={`text-lg font-black italic ${summary?.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(Math.abs(summary?.currentBalance || 0))}
                    </p>
                </Card>

                <Card className="border-0 shadow-lg ring-1 ring-slate-200 bg-white p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        {isClient ? 'Total Lifetime Sales' : 'Total Procurement'}
                    </p>
                    <p className="text-lg font-black italic text-slate-900">{formatCurrency(summary?.totalTurnover || 0)}</p>
                </Card>

                <Card className="border-0 shadow-lg ring-1 ring-slate-200 bg-white p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        {isClient ? 'Payments Received' : 'Payments Made'}
                    </p>
                    <p className="text-lg font-black italic text-emerald-600">{formatCurrency(summary?.totalPaid || 0)}</p>
                </Card>

                <Card className="border-0 shadow-lg ring-1 ring-slate-200 bg-white p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Opening Balance</p>
                    <p className="text-lg font-black italic text-slate-800">{formatCurrency(summary?.openingBalance || 0)}</p>
                </Card>

                <Card className="border-0 shadow-lg ring-1 ring-slate-200 bg-white p-4 rounded-2xl col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total {isClient ? 'Invoices' : 'Orders'}</p>
                    <p className="text-lg font-black italic text-slate-900">{summary?.totalDocumentCount || 0}</p>
                </Card>
            </div>

            {/* ── TOP ERP NAVIGATION TAB BAR ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto w-full md:w-auto">
                    {[
                        { id: 'OVERVIEW', label: 'Overview', icon: Building2 },
                        { id: 'LEDGER', label: 'Ledger', icon: FileText, count: ledger.length },
                        { id: 'DOCUMENTS', label: isClient ? 'Invoices' : 'Purchases', icon: TrendingUp, count: documents.length },
                        { id: 'PAYMENTS', label: 'Payments', icon: CreditCard, count: payments.length },
                        { id: 'OUTSTANDING', label: 'Outstanding', icon: AlertTriangle, count: outstanding.items?.length, highlight: outstanding.totalOutstanding > 0 },
                        { id: 'STATEMENT', label: 'Statement', icon: Printer }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`h-10 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                                    isActive 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Icon className={`w-3.5 h-3.5 ${tab.highlight ? 'text-rose-400' : ''}`} />
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <Button
                    onClick={loadData}
                    disabled={loading}
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl hidden md:flex"
                    title="Refresh Account Data"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* ── TAB 1: OVERVIEW ── */}
            {activeTab === 'OVERVIEW' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-0 shadow-lg ring-1 ring-slate-200 rounded-2xl bg-white p-6 space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b pb-3">Contact & Address</h3>
                            {summary?.email && (
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400">Email Address</p>
                                    <p className="text-xs font-bold text-slate-800">{summary.email}</p>
                                </div>
                            )}
                            {summary?.phone && (
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400">Phone Number</p>
                                    <p className="text-xs font-bold text-slate-800">{summary.phone}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Address</p>
                                <p className="text-xs font-bold text-slate-800 leading-snug">{summary?.address}</p>
                            </div>
                        </Card>

                        <Card className="border-0 shadow-xl ring-1 ring-slate-900/5 rounded-2xl p-6 bg-slate-900 text-white md:col-span-2 space-y-6">
                            <h3 className="text-base font-black italic uppercase tracking-tight flex items-center gap-2 border-b border-slate-800 pb-3">
                                <TrendingUp className="w-5 h-5 text-indigo-400" />
                                Commercial Analytics & Turnover Standing
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current FY Turnover</p>
                                    <p className="text-xl font-black italic text-emerald-400">{formatCurrency(summary?.currentFyTurnover || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Previous FY Turnover</p>
                                    <p className="text-xl font-black italic text-slate-300">{formatCurrency(summary?.previousFyTurnover || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Average Order Value</p>
                                    <p className="text-xl font-black italic text-indigo-400">{formatCurrency(summary?.avgDocumentValue || 0)}</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* ── TAB 2: LEDGER ── */}
            {activeTab === 'LEDGER' && (
                <Card className="border-0 shadow-xl ring-1 ring-slate-200 rounded-2xl overflow-hidden bg-white">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Filter Ledger Timeline</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                            />
                            <span className="text-xs font-bold text-slate-400">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                                    <th className="py-3.5 px-4">Date</th>
                                    <th className="py-3.5 px-4">Type</th>
                                    <th className="py-3.5 px-4">Ref #</th>
                                    <th className="py-3.5 px-4">Description</th>
                                    <th className="py-3.5 px-4 text-right">Debit (₹)</th>
                                    <th className="py-3.5 px-4 text-right">Credit (₹)</th>
                                    <th className="py-3.5 px-4 text-right">Running Balance (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                {ledger.map((row: any) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4 text-slate-500">{new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                                                {row.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-mono font-black text-slate-900">{row.reference}</td>
                                        <td className="py-3 px-4 text-slate-600">{row.description}</td>
                                        <td className="py-3 px-4 text-right font-black text-slate-900">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                                        <td className="py-3 px-4 text-right font-black text-slate-900">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                                        <td className="py-3 px-4 text-right font-black italic text-indigo-600">
                                            {formatCurrency(Math.abs(row.runningBalance))} {row.runningBalance >= 0 ? 'Dr' : 'Cr'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* ── TAB 3: DOCUMENTS ── */}
            {activeTab === 'DOCUMENTS' && (
                <Card className="border-0 shadow-xl ring-1 ring-slate-200 rounded-2xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                                    <th className="py-3.5 px-4">Document #</th>
                                    <th className="py-3.5 px-4">Date</th>
                                    <th className="py-3.5 px-4 text-right">Grand Total</th>
                                    <th className="py-3.5 px-4 text-right">Paid</th>
                                    <th className="py-3.5 px-4 text-right">Balance Due</th>
                                    <th className="py-3.5 px-4 text-center">Status</th>
                                    <th className="py-3.5 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                {documents.map((doc: any) => (
                                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4 font-black text-slate-900">{doc.invoiceNo || doc.purchaseNo}</td>
                                        <td className="py-3 px-4 text-slate-500">{new Date(doc.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(Number(doc.grandTotal))}</td>
                                        <td className="py-3 px-4 text-right font-black text-emerald-600">{formatCurrency(doc.paidAmount)}</td>
                                        <td className="py-3 px-4 text-right font-black text-rose-600">{formatCurrency(doc.balanceDue)}</td>
                                        <td className="py-3 px-4 text-center"><StatusBadge status={doc.status} /></td>
                                        <td className="py-3 px-4 text-right">
                                            <Link href={isClient ? `/invoices/${doc.id}` : `/purchases/${doc.id}`}>
                                                <Button size="sm" variant="ghost" className="h-8 px-3 rounded-xl text-xs font-black uppercase">View</Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* ── TAB 4: PAYMENTS ── */}
            {activeTab === 'PAYMENTS' && (
                <Card className="border-0 shadow-xl ring-1 ring-slate-200 rounded-2xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                                    <th className="py-3.5 px-4">Date</th>
                                    <th className="py-3.5 px-4">Method</th>
                                    <th className="py-3.5 px-4">Reference</th>
                                    <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                {payments.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4 text-slate-500">{new Date(p.paidAt || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="py-3 px-4"><span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">{p.method}</span></td>
                                        <td className="py-3 px-4 font-mono">{p.reference || p.id.slice(-6)}</td>
                                        <td className="py-3 px-4 text-right font-black text-emerald-600">{formatCurrency(Number(p.amount))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* ── TAB 5: OUTSTANDING ── */}
            {activeTab === 'OUTSTANDING' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-0 shadow-lg bg-rose-50 border-rose-200 p-6 rounded-2xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">Total Outstanding</p>
                            <h3 className="text-3xl font-black italic text-rose-900">{formatCurrency(outstanding.totalOutstanding)}</h3>
                        </Card>
                        <Card className="border-0 shadow-lg bg-amber-50 border-amber-200 p-6 rounded-2xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Overdue Amount</p>
                            <h3 className="text-3xl font-black italic text-amber-900">{formatCurrency(outstanding.totalOverdue)}</h3>
                        </Card>
                        <Card className="border-0 shadow-lg bg-emerald-50 border-emerald-200 p-6 rounded-2xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Current Due (Within Terms)</p>
                            <h3 className="text-3xl font-black italic text-emerald-900">{formatCurrency(outstanding.totalCurrentDue)}</h3>
                        </Card>
                    </div>

                    <Card className="border-0 shadow-xl ring-1 ring-slate-200 rounded-2xl overflow-hidden bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                                        <th className="py-3.5 px-4">Doc #</th>
                                        <th className="py-3.5 px-4">Date</th>
                                        <th className="py-3.5 px-4">Due Date</th>
                                        <th className="py-3.5 px-4 text-right">Grand Total</th>
                                        <th className="py-3.5 px-4 text-right">Paid</th>
                                        <th className="py-3.5 px-4 text-right">Balance Due</th>
                                        <th className="py-3.5 px-4 text-center">Overdue Days</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                    {outstanding.items.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4 font-black text-slate-900">{item.documentNo}</td>
                                            <td className="py-3 px-4 text-slate-500">{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="py-3 px-4 text-slate-500">{new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(item.grandTotal)}</td>
                                            <td className="py-3 px-4 text-right font-black text-emerald-600">{formatCurrency(item.paidAmount)}</td>
                                            <td className="py-3 px-4 text-right font-black text-rose-600">{formatCurrency(item.balanceDue)}</td>
                                            <td className="py-3 px-4 text-center">
                                                {item.daysOverdue > 0 ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">
                                                        {item.daysOverdue} days
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">Current</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* ── TAB 6: STATEMENT ── */}
            {activeTab === 'STATEMENT' && (
                <Card className="border-0 shadow-2xl ring-1 ring-slate-200 rounded-2xl p-8 bg-white space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                        <div>
                            <h2 className="text-xl font-black italic uppercase text-slate-900">Download Account Statement</h2>
                            <p className="text-xs font-bold text-slate-500 mt-1">Official certified ERP PDF with running balance, debits, credits, and bank details.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handlePrintStatement}
                                disabled={isDownloadingStatement}
                                variant="outline"
                                className="h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4" /> Print
                            </Button>
                            <Button
                                onClick={handleDownloadStatement}
                                disabled={isDownloadingStatement}
                                className="h-11 px-5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2"
                            >
                                {isDownloadingStatement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                Download PDF
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Share Modal */}
            <InvoiceShareModal
                isOpen={shareModalConfig.isOpen}
                onClose={() => setShareModalConfig(prev => ({ ...prev, isOpen: false }))}
                documentType={shareModalConfig.documentType}
                partyId={partyId}
                actionType={shareModalConfig.actionType}
                channel={shareModalConfig.channel}
            />
        </div>
    );
}
