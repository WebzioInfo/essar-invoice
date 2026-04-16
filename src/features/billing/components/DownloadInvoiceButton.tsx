"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/ui/core/Button";
import { useToast } from "@/context/ToastContext";
import apiClient from "@/lib/apiClient";
import { cn } from "@/utils";

interface DownloadInvoiceButtonProps {
    invoiceId: string;
    className?: string;
    variant?: "ghost" | "secondary" | "primary" | "outline";
}

export function DownloadInvoiceButton({ invoiceId, className, variant = "ghost" }: DownloadInvoiceButtonProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const { success, error } = useToast();

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
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
            success("Download started.");
        } catch (err: any) {
            console.error(err);
            error("Failed to download PDF.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Button
            variant={variant}
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className={cn("h-8 w-8 p-0 rounded-lg transition-all", className)}
            title="Download PDF"
        >
            {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
            ) : (
                <FileDown className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:text-primary-600 transition-all" />
            )}
        </Button>
    );
}
