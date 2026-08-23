// generateQuotation.ts
import { db } from "@/db/prisma/client";
import jsPDF from "jspdf";
import { initializeFonts } from "./assets";
import { aggregateHsnSummary } from "./utils";
import { getDimensions } from "./layout";
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
import { determinePlaceOfSupplyState, calculateGstBreakdown } from "@/utils/gst";

export interface QuotationPDFGenerationResult {
    buffer: Uint8Array<ArrayBufferLike>;
    fileName: string;
}

/**
 * Generates an authoritative, fully composed enterprise PDF quotation buffer for a given quotationId.
 */
export async function generateQuotationPDF(quotationId: string): Promise<QuotationPDFGenerationResult> {
    const quotation = await db.quotation.findFirst({
        where: { id: quotationId, deletedAt: null },
        select: {
            id: true,
            quotationNo: true,
            date: true,
            validUntil: true,
            gstType: true,
            subTotal: true,
            taxTotal: true,
            grandTotal: true,
            status: true,
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

    if (!quotation) {
        throw new Error("Quotation not found");
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

    // 3. Draw Company Header with QUOTATION title
    y = drawCompanyHeader(doc, settings, y, "QUOTATION");

    // 4. Draw billing / shipping client cards
    const billing = {
        name: quotation.billingName || quotation.client?.name || "N/A",
        address1: quotation.billingAddress1 || quotation.client?.address1 || "N/A",
        address2: quotation.billingAddress2 || quotation.client?.address2 || "",
        state: quotation.billingState || quotation.client?.state || "N/A",
        pinCode: quotation.billingPinCode || quotation.client?.pinCode || "",
        phone: quotation.billingPhone || quotation.client?.phone || "",
        gst: quotation.billingGst || quotation.client?.gst || ""
    };

    const shipping = {
        name: quotation.shippingName || billing.name,
        address1: quotation.shippingAddress1 || billing.address1,
        address2: quotation.shippingAddress2 || billing.address2,
        state: quotation.shippingState || billing.state,
        pinCode: quotation.shippingPinCode || billing.pinCode,
        phone: billing.phone,
        gst: billing.gst
    };

    y = drawCustomerCards(doc, billing, shipping, quotation, y, "QUOTATION");

    // 5. Build products map
    const lineItems = quotation.lineItems || [];
    const productMap = new Map();
    lineItems.forEach((li: any) => {
        if (li.product) {
            productMap.set(li.productId, li.product);
        }
    });

    // 6. Draw Items Table
    const tableRes = drawItemsTable(doc, quotation, lineItems, productMap, settings, y);
    y = tableRes.endY;

    // 7. Aggregate HSN Summary map
    const freightVal = quotation.freightAmount?.toNumber ? quotation.freightAmount.toNumber() : Number(quotation.freightAmount || 0);
    const fTaxPercent = quotation.freightTaxPercent?.toNumber ? quotation.freightTaxPercent.toNumber() : Number(quotation.freightTaxPercent || 0);
    const hsnSummaryMap = aggregateHsnSummary(lineItems, freightVal, fTaxPercent);

    const posState = determinePlaceOfSupplyState(quotation);
    const gstType = quotation.gstType || "CGST_SGST";
    y = drawHsnSummaryTable(doc, gstType, hsnSummaryMap, y);

    // 8. Draw Quotation Commercial Declaration
    y = drawGstDeclaration(
        doc, 
        posState, 
        y,
        `Declaration: This quotation reflects current estimated pricing and supply terms for state of ${posState}. Subject to final confirmation.`
    );

    // 9. Process financial totals
    const taxVal = quotation.taxTotal?.toNumber ? quotation.taxTotal.toNumber() : Number(quotation.taxTotal || 0);
    const { cgst, sgst, igst } = calculateGstBreakdown(taxVal, gstType);

    const grandTotalRaw = quotation.grandTotal?.toNumber ? quotation.grandTotal.toNumber() : Number(quotation.grandTotal || 0);
    const rounded = Math.round(grandTotalRaw);
    const roundOff = rounded - grandTotalRaw;

    // 10. Draw Totals Breakdown
    y = drawTotalsSection(doc, quotation, tableRes.subTotal, freightVal, cgst, sgst, igst, roundOff, rounded, y);

    // 11. Draw Narrative words
    y = drawWordsSection(doc, rounded, taxVal, y);

    // 12. Draw Terms & Conditions / Commercial Terms
    y = drawRemarksSection(doc, quotation.notes, y, "TERMS & CONDITIONS");

    // 13. Draw Bank Card & Signatures
    y = drawBankAndSignatureSection(doc, settings, y);

    // 14. Pagination footers stamping
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawPageFooter(doc, i, totalPages);
    }

    // 15. Compile buffer array
    const finalBuffer: Uint8Array<ArrayBufferLike> = new Uint8Array(doc.output("arraybuffer"));

    // 16. Sanitize Filename: ESSAR_<QuotationNumber>_<ClientName>.pdf
    const clientName = (quotation.client?.name || "CLIENT").split(" ")[0].toUpperCase();
    const safeFileName = `ESSAR_${quotation.quotationNo}_${clientName}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');

    return {
        buffer: finalBuffer,
        fileName: safeFileName,
    };
}
