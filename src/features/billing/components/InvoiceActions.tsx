"use client";

import { useState, useTransition } from "react";
import { markInvoiceSentAction, deleteInvoiceAction } from "@/features/billing/actions/billing";
import { useToast } from "@/context/ToastContext";
import { Send, FileDown, CheckCircle2, Edit, Loader2, Trash2, Printer, Share2, MessageSquare, Mail } from "lucide-react";
import Link from "next/link";
import { useConfirmStore } from "@/hooks/useConfirmStore";
import { useRouter } from "next/navigation";
import { fetchInvoicePdf, downloadPdf, printPdf } from "@/lib/pdfService";
import { InvoiceShareModal } from "./InvoiceShareModal";

interface InvoiceActionsProps {
    invoiceId: string;
    status: string;
}

export function InvoiceActions({ invoiceId, status }: InvoiceActionsProps) {
    const [isPending, startTransition] = useTransition();
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [shareModalConfig, setShareModalConfig] = useState<{
        isOpen: boolean;
        channel: 'WHATSAPP' | 'EMAIL';
        actionType: 'SHARE' | 'FOLLOWUP';
    }>({ isOpen: false, channel: 'WHATSAPP', actionType: 'SHARE' });

    const { success, error, info } = useToast();
    const { confirm } = useConfirmStore();
    const router = useRouter();

    const handleMarkSent = () => {
        startTransition(async () => {
            const res = await markInvoiceSentAction(invoiceId);
            if (res && 'success' in res) {
                success("Invoice marked as SENT. You can now track its age.");
            } else if (res && 'error' in res) {
                error(res.error || "Failed to update status.");
            } else {
                error("Failed to update status.");
            }
        });
    };

    const handleTrash = async () => {
        const confirmed = await confirm({
            title: "Move to Trash",
            message: "Are you sure you want to move this invoice to trash? You can restore it later if needed.",
            type: "warning",
            confirmText: "Trash It"
        });

        if (!confirmed) return;

        startTransition(async () => {
            const res = await deleteInvoiceAction(invoiceId);
            if (res && 'success' in res) {
                success("Invoice moved to trash.");
                router.push("/invoices");
            } else if (res && 'error' in res) {
                error(res.error || "Failed to trash invoice.");
            } else {
                error("Failed to trash invoice.");
            }
        });
    };

    const handlePrintPDF = async () => {
        if (isPrinting || isDownloading) return;
        setIsPrinting(true);
        info("Generating PDF...");
        try {
            const { blob } = await fetchInvoicePdf(invoiceId);
            info("Printing...");
            await printPdf(blob);
            success("Invoice PDF sent to printer.");
        } catch (err: any) {
            console.error("[PRINT_ERROR]", err);
            const errorMsg = err?.response?.data?.error || err?.message || "Print Failed";
            error(errorMsg);
        } finally {
            setIsPrinting(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (isDownloading || isPrinting) return;
        setIsDownloading(true);
        info("Generating PDF...");
        try {
            const { blob, fileName } = await fetchInvoicePdf(invoiceId);
            downloadPdf(blob, fileName);
            success("PDF Generated");
        } catch (err: any) {
            console.error("[DOWNLOAD_ERROR]", err);
            const errorMsg = err?.response?.data?.error || err?.message || "Failed to generate PDF. Please try again.";
            error(errorMsg);
        } finally {
            setIsDownloading(false);
        }
    };

    const isDisabled = isPending || isDownloading || isPrinting;

    return (
        <div className="flex flex-wrap items-center gap-4">
            {status === "DRAFT" && (
                <button
                    onClick={handleMarkSent}
                    disabled={isDisabled}
                    className="h-14 px-8 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-[0.98] disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-primary-500" />}
                    Mark as Sent
                </button>
            )}

            {status !== "PAID" && status !== "DRAFT" && (
                <Link href={`/payments/new?invoiceId=${invoiceId}`}>
                    <button
                        disabled={isDisabled}
                        className="h-14 px-8 bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-3 active:scale-[0.98] disabled:opacity-50"
                    >
                        <CheckCircle2 className="w-4 h-4" /> Record Settlement
                    </button>
                </Link>
            )}

            {/* WhatsApp Share / Followup */}
            <button
                onClick={() => setShareModalConfig({ isOpen: true, channel: 'WHATSAPP', actionType: status === 'PAID' ? 'SHARE' : 'FOLLOWUP' })}
                disabled={isDisabled}
                className="h-14 px-6 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm hover:bg-emerald-100 transition-all flex items-center gap-2.5 active:scale-[0.98] disabled:opacity-50"
            >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                {status === 'PAID' ? 'WhatsApp' : 'Followup WhatsApp'}
            </button>

            {/* Email Share / Followup */}
            <button
                onClick={() => setShareModalConfig({ isOpen: true, channel: 'EMAIL', actionType: status === 'PAID' ? 'SHARE' : 'FOLLOWUP' })}
                disabled={isDisabled}
                className="h-14 px-6 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm hover:bg-indigo-100 transition-all flex items-center gap-2.5 active:scale-[0.98] disabled:opacity-50"
            >
                <Mail className="w-4 h-4 text-indigo-600" />
                {status === 'PAID' ? 'Email PDF' : 'Followup Email'}
            </button>

            {status === "DRAFT" && (
                <Link href={`/invoices/${invoiceId}/edit`}>
                    <button
                        disabled={isDisabled}
                        className="h-14 px-8 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-[0.98] disabled:opacity-50"
                    >
                        <Edit className="w-4 h-4 text-indigo-500" /> Modify
                    </button>
                </Link>
            )}

            <button
                onClick={handlePrintPDF}
                disabled={isDisabled}
                className="h-14 px-8 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-[0.98] disabled:opacity-70"
            >
                {isPrinting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                ) : (
                    <Printer className="w-4 h-4 text-slate-400" />
                )}
                {isPrinting ? "Generating PDF…" : "Print PDF"}
            </button>

            <button
                onClick={handleDownloadPDF}
                disabled={isDisabled}
                className="h-14 px-8 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-slate-900/10 hover:bg-primary-600 transition-all flex items-center gap-3 active:scale-[0.98] disabled:opacity-70"
            >
                {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <FileDown className="w-4 h-4" />
                )}
                {isDownloading ? "Generating PDF…" : "Download PDF"}
            </button>

            <button
                onClick={handleTrash}
                disabled={isDisabled}
                className="h-14 px-6 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all ml-auto active:scale-90 group disabled:opacity-50"
                title="Terminate Record"
            >
                <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            {/* Share Modal Render */}
            <InvoiceShareModal
                isOpen={shareModalConfig.isOpen}
                onClose={() => setShareModalConfig(prev => ({ ...prev, isOpen: false }))}
                documentType="INVOICE"
                invoiceId={invoiceId}
                actionType={shareModalConfig.actionType}
                channel={shareModalConfig.channel}
            />
        </div>
    );
}
