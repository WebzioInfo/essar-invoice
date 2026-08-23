"use client";

import { useState, useTransition } from "react";
import { convertQuotationToInvoiceAction, updateQuotationStatusAction } from "@/features/billing/actions/quotations";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/ui/core/Button";
import { Send, CheckCircle2, TrendingUp, XCircle, ArrowRight, FileText, FileDown, Loader2, Edit, Printer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuotationStatus } from "@/features/billing/types";
import { fetchQuotationPdf, downloadPdf, printPdf } from "@/lib/pdfService";

interface QuotationActionsProps {
    quotationId: string;
    status: string | QuotationStatus;
    convertedInvoiceId?: string | null;
}

export function QuotationActions({ quotationId, status, convertedInvoiceId }: QuotationActionsProps) {
    const [isPending, startTransition] = useTransition();
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const { success, error, info } = useToast();
    const router = useRouter();

    const handleUpdateStatus = (newStatus: QuotationStatus) => {
        startTransition(async () => {
            const res = await updateQuotationStatusAction(quotationId, newStatus);
            if (res && 'success' in res) {
                success(`Proposal successfully moved to ${newStatus} state.`);
            } else if (res && 'error' in res) {
                error(res.error || "Failed to update status.");
            } else {
                error("Failed to update status.");
            }
        });
    };

    const handleConvert = () => {
        startTransition(async () => {
            const formData = new FormData();
            formData.append("quotationId", quotationId);
            
            const convertRes = await convertQuotationToInvoiceAction(formData);
            if (convertRes && 'success' in convertRes) {
                success("Transformation complete! Quotation has been converted to a Tax Invoice.");
                if ('invoiceId' in convertRes && convertRes.invoiceId) {
                    router.push(`/invoices/${convertRes.invoiceId}`);
                }
            } else if (convertRes && 'error' in convertRes) {
                error(convertRes.error || "Failed to convert quotation.");
            } else {
                error("Failed to convert quotation.");
            }
        });
    };

    const handleDownloadPDF = async () => {
        if (isDownloading || isPrinting) return;
        setIsDownloading(true);
        info("Generating Quotation PDF...");
        try {
            const { blob, fileName } = await fetchQuotationPdf(quotationId);
            downloadPdf(blob, fileName);
            success("Quotation PDF downloaded successfully.");
        } catch (err: any) {
            console.error("[QUOTATION_DOWNLOAD_ERROR]", err);
            const errorMsg = err?.response?.data?.error || err?.message || "Failed to generate quotation PDF. Please try again.";
            error(errorMsg);
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePrintPDF = async () => {
        if (isPrinting || isDownloading) return;
        setIsPrinting(true);
        info("Preparing Quotation for print...");
        try {
            const { blob } = await fetchQuotationPdf(quotationId);
            await printPdf(blob);
            success("Quotation sent to print dialog.");
        } catch (err: any) {
            console.error("[QUOTATION_PRINT_ERROR]", err);
            const errorMsg = err?.response?.data?.error || err?.message || "Failed to open print dialog.";
            error(errorMsg);
        } finally {
            setIsPrinting(false);
        }
    };

    const isDisabled = isPending || isDownloading || isPrinting;

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Edit / Modify button - available for non-converted proposals */}
            {status !== QuotationStatus.CONVERTED && (
                <Link href={`/quotations/${quotationId}/edit`}>
                    <Button 
                        disabled={isDisabled}
                        variant="secondary"
                        className="h-10 px-5 gap-2 border-slate-200 text-slate-700 hover:text-primary-600 hover:bg-primary-50/50"
                    >
                        <Edit className="w-4 h-4 text-indigo-500" /> Modify Proposal
                    </Button>
                </Link>
            )}

            {status === QuotationStatus.DRAFT && (
                <Button 
                    onClick={() => handleUpdateStatus(QuotationStatus.SENT)} 
                    disabled={isDisabled}
                    variant="secondary"
                    className="h-10 px-6 gap-2 border-slate-200"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Mark as Sent
                </Button>
            )}
            
            {status === QuotationStatus.SENT && (
                <>
                    <Button 
                        onClick={() => handleUpdateStatus(QuotationStatus.ACCEPTED)} 
                        disabled={isDisabled}
                        className="h-10 px-6 gap-2 shadow-xl shadow-success-500/20 text-white"
                        style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Accept Proposal
                    </Button>
                    <Button 
                        onClick={() => handleUpdateStatus(QuotationStatus.REJECTED)} 
                        disabled={isDisabled}
                        variant="ghost"
                        className="h-10 px-4 gap-2 text-danger-600 hover:bg-danger-50"
                    >
                        <XCircle className="w-4 h-4" /> Reject
                    </Button>
                </>
            )}

            {status === QuotationStatus.ACCEPTED && (
                <Button 
                    onClick={handleConvert} 
                    disabled={isDisabled}
                    className="h-11 px-8 gap-3 shadow-2xl shadow-primary-500/20 rounded-2xl animate-pulse-subtle text-white"
                    style={{ background: "linear-gradient(135deg, #1B3A6B, #152E55)" }}
                >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                    CONVERT TO INVOICE <ArrowRight className="w-4 h-4" />
                </Button>
            )}

            {status === QuotationStatus.CONVERTED && convertedInvoiceId && (
                <Link href={`/invoices/${convertedInvoiceId}`}>
                    <Button variant="secondary" className="h-10 px-6 gap-2 text-primary-700 bg-primary-50 border-primary-200 hover:bg-primary-100">
                        <FileText className="w-4 h-4" /> View Linked Invoice
                    </Button>
                </Link>
            )}

            {/* Print PDF Button */}
            <Button 
                onClick={handlePrintPDF}
                disabled={isDisabled}
                variant="secondary" 
                className="h-10 px-4 gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
                {isPrinting ? <Loader2 className="w-4 h-4 animate-spin text-primary-600" /> : <Printer className="w-4 h-4 text-slate-400" />}
                {isPrinting ? "Generating..." : "Print"}
            </Button>

            {/* Download PDF Button */}
            <Button 
                onClick={handleDownloadPDF}
                disabled={isDisabled}
                className="h-10 px-5 gap-2 bg-slate-900 text-white hover:bg-primary-600 shadow-md shadow-slate-900/10 transition-all active:scale-95"
            >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                {isDownloading ? "Generating..." : "Download PDF"}
            </Button>
        </div>
    );
}
