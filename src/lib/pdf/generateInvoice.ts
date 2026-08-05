// generateInvoice.ts
import { db } from "@/db/prisma/client";
import jsPDF from "jspdf";
import { initializeFonts } from "./assets";
import { aggregateHsnSummary } from "./utils";
import { getDimensions, mergeInvoiceWithAttachment } from "./layout";
import { 
    drawCompanyHeader, 
    drawCustomerCards, 
    drawItemsTable, 
    drawHsnSummaryTable, 
    drawGstDeclaration, 
    drawTotalsSection, 
    drawWordsSection, 
    drawRemarksSection, 
    drawBankAndSignatureSection, 
    drawPageFooter 
} from "./sections";

export interface PDFGenerationResult {
    buffer: Uint8Array<ArrayBufferLike>;
    fileName: string;
}

/**
 * Generates a fully composed enterprise PDF invoice buffer for a given invoiceId.
 */
export async function generateInvoicePDF(invoiceId: string): Promise<PDFGenerationResult> {
    const invoice = await db.invoice.findFirst({
        where: { id: invoiceId, deletedAt: null },
        select: {
            id: true,
            invoiceNo: true,
            date: true,
            gstType: true,
            subTotal: true,
            taxTotal: true,
            grandTotal: true,
            ewayBill: true,
            ewayBillUrl: true,
            vehicleNo: true,
            notes: true,
            billingName: true,
            billingAddress1: true,
            billingAddress2: true,
            billingState: true,
            billingPinCode: true,
            billingPhone: true,
            billingGst: true,
            shippingName: true,
            shippingAddress1: true,
            shippingAddress2: true,
            shippingState: true,
            shippingPinCode: true,
            isFreightCollect: true,
            freightAmount: true,
            freightTaxPercent: true,
            client: true,
            lineItems: {
                orderBy: { id: "asc" },
                include: { product: true }
            },
        },
    });

    if (!invoice) {
        throw new Error("Invoice not found");
    }

    const settings = await db.companySetting.findFirst() || {
        companyName: "ESSAR ENTERPRISES",
        gstin: "29AOPPM7487J1ZV",
        address1: "SITE NO.9, SEEGAHALLI VILLAGE",
        address2: "KR PURAM HOBLI",
        city: "BANGALORE",
        pincode: "560049",
        phone: "+91 85531 85300",
        email: "essarwater.info@gmail.com",
        bankName: "FEDERAL BANK",
        bankBranch: "DOMMASANDRA",
        bankAccountNo: "21650200003173",
        bankIfsc: "FDRL0002165",
        bankAccountName: "ESSAR ENTERPRISES",
        showPkgDetails: true,
        showLogo: false,
        logoUrl: "logo.png"
    };

    // 1. Initialize jsPDF Document
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // 2. Initialize Fonts
    await initializeFonts(doc);

    const dim = getDimensions(doc);
    let y = dim.topMargin;

    // 3. Draw Company Header
    y = drawCompanyHeader(doc, settings, y);

    // 4. Draw billing / shipping client cards
    const billing = {
        name: invoice.billingName || invoice.client?.name || "N/A",
        address1: invoice.billingAddress1 || invoice.client?.address1 || "N/A",
        address2: invoice.billingAddress2 || invoice.client?.address2 || "",
        state: invoice.billingState || invoice.client?.state || "N/A",
        pinCode: invoice.billingPinCode || invoice.client?.pinCode || "",
        phone: invoice.billingPhone || invoice.client?.phone || "",
        gst: invoice.billingGst || invoice.client?.gst || ""
    };

    const shipping = {
        name: invoice.shippingName || billing.name,
        address1: invoice.shippingAddress1 || billing.address1,
        address2: invoice.shippingAddress2 || billing.address2,
        state: invoice.shippingState || billing.state,
        pinCode: invoice.shippingPinCode || billing.pinCode,
        phone: billing.phone,
        gst: billing.gst
    };

    y = drawCustomerCards(doc, billing, shipping, invoice, y);

    // 5. Build products map mapping
    const lineItems = invoice.lineItems || [];
    const productMap = new Map();
    lineItems.forEach((li: any) => {
        if (li.product) {
            productMap.set(li.productId, li.product);
        }
    });

    // 6. Draw Items Table
    const tableRes = drawItemsTable(doc, invoice, lineItems, productMap, settings, y);
    y = tableRes.endY;

    // 7. Aggregate HSN Summary map
    const freightVal = invoice.freightAmount?.toNumber ? invoice.freightAmount.toNumber() : Number(invoice.freightAmount || 0);
    const fTaxPercent = invoice.freightTaxPercent?.toNumber ? invoice.freightTaxPercent.toNumber() : Number(invoice.freightTaxPercent || 0);
    const hsnSummaryMap = aggregateHsnSummary(lineItems, freightVal, fTaxPercent);

    const gstType = invoice.gstType || "CGST_SGST";
    y = drawHsnSummaryTable(doc, gstType, hsnSummaryMap, y);

    // 8. Draw GST Declaration
    y = drawGstDeclaration(doc, invoice.billingState || invoice.client?.state || "Karnataka", y);

    // 9. Process financial totals
    const taxVal = invoice.taxTotal?.toNumber ? invoice.taxTotal.toNumber() : Number(invoice.taxTotal || 0);
    let cgst = 0, sgst = 0, igst = 0;
    if (gstType === "CGST_SGST") {
        cgst = taxVal / 2;
        sgst = taxVal / 2;
    } else {
        igst = taxVal;
    }

    const grandTotalRaw = invoice.grandTotal?.toNumber ? invoice.grandTotal.toNumber() : Number(invoice.grandTotal || 0);
    const rounded = Math.round(grandTotalRaw);
    const roundOff = rounded - grandTotalRaw;

    // 10. Draw Totals Breakdown
    y = drawTotalsSection(doc, invoice, tableRes.subTotal, freightVal, cgst, sgst, igst, roundOff, rounded, y);

    // 11. Draw narrative narrative words
    y = drawWordsSection(doc, rounded, taxVal, y);

    // 12. Draw Remarks notes
    y = drawRemarksSection(doc, invoice.notes, y);

    // 13. Draw bank card & signatures
    y = drawBankAndSignatureSection(doc, settings, y);

    // 14. Pagination footers stamping
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawPageFooter(doc, i, totalPages);
    }

    // 15. Compile buffer array
    let finalBuffer: Uint8Array<ArrayBufferLike> = new Uint8Array(doc.output("arraybuffer"));

    // 16. Merge attachment E-way details
    if (invoice.ewayBillUrl) {
        finalBuffer = await mergeInvoiceWithAttachment(finalBuffer, invoice.ewayBillUrl);
    }

    // 17. Sanitize Filename: ESSAR_<InvoiceNumber>_<ClientName>.pdf
    const clientName = (invoice.client?.name || "CLIENT").split(" ")[0].toUpperCase();
    const safeFileName = `ESSAR_${invoice.invoiceNo}_${clientName}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');

    return {
        buffer: finalBuffer,
        fileName: safeFileName,
    };
}
