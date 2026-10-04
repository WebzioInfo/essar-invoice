import { generateInvoicePDF } from "@/lib/pdf/generateInvoice";

export type ExportFormat = 'ORIGINAL' | 'THERMAL';

export class InvoicePdfService {
    static async generateInvoicePdf(invoiceId: string, format: ExportFormat = 'ORIGINAL'): Promise<{ buffer: Buffer; fileName: string }> {
        const res = await generateInvoicePDF(invoiceId);
        return {
            buffer: Buffer.from(res.buffer),
            fileName: res.fileName
        };
    }
}
