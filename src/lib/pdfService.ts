import apiClient from "@/lib/apiClient";

export interface PdfResponse {
    blob: Blob;
    fileName: string;
}

/**
 * Shared API fetcher for generating invoice PDF blob
 */
export async function fetchInvoicePdf(invoiceId: string): Promise<PdfResponse> {
    const res = await apiClient.post(
        "/api/invoices/download",
        { invoiceId },
        { responseType: "blob" }
    );

    const disposition = (res.headers as Record<string, string>)["content-disposition"] || "";
    const fileNameMatch = disposition.match(/filename="?([^"]+)"?/);
    const fileName = fileNameMatch ? fileNameMatch[1] : `invoice-${invoiceId}.pdf`;

    return {
        blob: res.data as Blob,
        fileName,
    };
}

/**
 * Triggers a direct browser download of the PDF blob
 */
export function downloadPdf(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Prints a PDF blob using a hidden iframe without printing HTML
 */
export function printPdf(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            const blobUrl = URL.createObjectURL(blob);
            const iframe = document.createElement("iframe");

            iframe.style.position = "fixed";
            iframe.style.right = "0";
            iframe.style.bottom = "0";
            iframe.style.width = "0";
            iframe.style.height = "0";
            iframe.style.border = "0";
            iframe.style.visibility = "hidden";
            iframe.src = blobUrl;

            const cleanup = () => {
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                    URL.revokeObjectURL(blobUrl);
                }, 2000);
            };

            iframe.onload = () => {
                try {
                    if (iframe.contentWindow) {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        cleanup();
                        resolve();
                    } else {
                        cleanup();
                        reject(new Error("Unable to access PDF print window."));
                    }
                } catch (err) {
                    cleanup();
                    reject(err);
                }
            };

            iframe.onerror = (err) => {
                cleanup();
                reject(err);
            };

            document.body.appendChild(iframe);
        } catch (err) {
            reject(err);
        }
    });
}
