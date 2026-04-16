"use client";

import { useState, useTransition } from "react";
import { markInvoiceSentAction, deleteInvoiceAction, restoreInvoiceAction, permanentlyDeleteInvoiceAction } from "@/features/billing/actions/billing";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/ui/core/Button";
import { Send, FileDown, CheckCircle2, Edit, Loader2, Trash2, RotateCcw, AlertCircle } from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/apiClient";
import { useRouter } from "next/navigation";

interface InvoiceActionsProps {
    invoiceId: string;
    status: string;
    isDeleted?: boolean;
}

export function InvoiceActions({ invoiceId, status, isDeleted = false }: InvoiceActionsProps) {
    const [isPending, startTransition] = useTransition();
    const [isDownloading, setIsDownloading] = useState(false);
    const { success, error, info } = useToast();
    const router = useRouter();

    const handleMarkSent = () => {
        startTransition(async () => {
            const res = await markInvoiceSentAction(invoiceId);
            if (res && 'success' in res) {
                success("Invoice marked as SENT.");
            } else {
                error("Failed to update status.");
            }
        });
    };

    const handleTrash = () => {
        if (!confirm("Are you sure you want to move this invoice to trash?")) return;
        startTransition(async () => {
            const res = await deleteInvoiceAction(invoiceId);
            if (res?.success) {
                success("Invoice moved to trash.");
                router.push("/invoices");
            } else {
                error("Failed to trash invoice.");
            }
        });
    };

    const handleRestore = () => {
        startTransition(async () => {
            const res = await restoreInvoiceAction(invoiceId);
            if (res?.success) {
                success("Invoice restored successfully.");
                router.refresh();
            } else {
                error("Failed to restore invoice.");
            }
        });
    };

    const handlePermanentDelete = () => {
        if (!confirm("CRITICAL: This will permanently delete the invoice record. This action cannot be undone. Proceed?")) return;
        startTransition(async () => {
            const res = await permanentlyDeleteInvoiceAction(invoiceId);
            if (res?.success) {
                success("Invoice permanently deleted.");
                router.push("/invoices?trash=true");
            } else {
                error("Failed to delete invoice.");
            }
        });
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const res = await apiClient.post("/api/invoices/download", { invoiceId }, {
                responseType: 'blob'
            });

            const url = URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            
            // Extract filename from Content-Disposition header
            const contentDisposition = res.headers['content-disposition'];
            let fileName = `invoice-${invoiceId}.pdf`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch && fileNameMatch.length === 2) {
                    fileName = fileNameMatch[1];
                }
            }
            
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            success("Downloaded successfully.");
        } catch (err: any) {
            error("Failed to generate PDF.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            {isDeleted ? (
                <>
                    <Button 
                        onClick={handleRestore} 
                        disabled={isPending}
                        variant="secondary"
                        className="h-10 px-6 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        Restore Invoice
                    </Button>
                    <Button 
                        onClick={handlePermanentDelete} 
                        disabled={isPending}
                        variant="ghost"
                        className="h-10 px-6 gap-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Delete Permanently
                    </Button>
                </>
            ) : (
                <>
                    {status === "DRAFT" && (
                        <Button 
                            onClick={handleMarkSent} 
                            disabled={isPending}
                            variant="secondary"
                            className="h-10 px-6 gap-2 border-slate-200 shadow-sm"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Mark as Sent
                        </Button>
                    )}

                    {status !== "PAID" && status !== "DRAFT" && (
                        <Link href={`/payments/new?invoiceId=${invoiceId}`}>
                            <Button 
                                className="h-10 px-6 gap-2 shadow-xl shadow-success-500/20"
                                style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
                            >
                                <CheckCircle2 className="w-4 h-4" /> Record Payment
                            </Button>
                        </Link>
                    )}

                    {status === "DRAFT" && (
                        <Link href={`/invoices/${invoiceId}/edit`}>
                            <Button variant="ghost" className="h-10 px-4 gap-2 text-slate-500 hover:text-slate-900">
                                <Edit className="w-4 h-4" /> Edit
                            </Button>
                        </Link>
                    )}

                    <Button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        variant="secondary"
                        className="h-10 px-6 gap-2 border-slate-200"
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        {isDownloading ? "Generating..." : "Download PDF"}
                    </Button>

                    <Button 
                        onClick={handleTrash}
                        disabled={isPending}
                        variant="ghost"
                        className="h-10 px-4 gap-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all ml-auto"
                        title="Move to Trash"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </>
            )}
        </div>
    );
}
