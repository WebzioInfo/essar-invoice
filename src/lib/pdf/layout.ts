// layout.ts
import jsPDF from "jspdf";
import { PDFDocument } from "pdf-lib";
import { COLORS, DIMENSIONS, BORDERS } from "./styles";

export interface Dimensions {
    W: number;
    H: number;
    leftMargin: number;
    rightMargin: number;
    topMargin: number;
    bottomMargin: number;
    usableW: number;
}

/**
 * Retrieves page dimensions and printable widths.
 */
export function getDimensions(doc: jsPDF): Dimensions {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    
    const leftMargin = DIMENSIONS.MARGIN;
    const rightMargin = DIMENSIONS.MARGIN;
    const topMargin = DIMENSIONS.MARGIN;
    const bottomMargin = H - DIMENSIONS.MARGIN;
    const usableW = W - leftMargin - rightMargin;

    return { W, H, leftMargin, rightMargin, topMargin, bottomMargin, usableW };
}

/**
 * Calculates column positions and widths for multi-column grids.
 */
export function getMultiColumnGrid(
    doc: jsPDF,
    columnsCount: number,
    gap: number
): { widths: number[]; xs: number[] } {
    const dim = getDimensions(doc);
    const totalGaps = gap * (columnsCount - 1);
    const colW = (dim.usableW - totalGaps) / columnsCount;

    const widths: number[] = [];
    const xs: number[] = [];

    for (let i = 0; i < columnsCount; i++) {
        widths.push(colW);
        xs.push(dim.leftMargin + i * (colW + gap));
    }

    return { widths, xs };
}

/**
 * Draws a card container. Defaults to borderless shaded panels.
 */
export function drawCard(
    doc: jsPDF,
    x: number,
    y: number,
    w: number,
    h: number,
    options?: { fill?: boolean; border?: boolean; fillColor?: [number, number, number]; borderColor?: [number, number, number] }
) {
    const doFill = options?.fill ?? true;
    const doBorder = options?.border ?? false; // default to FALSE for Apple/Stripe look
    const fillColor = options?.fillColor ?? COLORS.BG_LIGHT;
    const borderColor = options?.borderColor ?? COLORS.BORDER_DARK;

    doc.saveGraphicsState();
    
    if (doFill) {
        doc.setFillColor(...fillColor);
    }
    if (doBorder) {
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(BORDERS.DEFAULT);
    }

    const style = (doFill && doBorder) ? "FD" : (doFill ? "F" : (doBorder ? "D" : ""));
    if (style) {
        doc.rect(x, y, w, h, style);
    }

    doc.restoreGraphicsState();
}

/**
 * Draws a vertical left-accent indicator bar.
 */
export function drawLeftAccentBar(
    doc: jsPDF,
    x: number,
    y: number,
    h: number,
    color?: [number, number, number]
) {
    const drawColor = color ?? COLORS.PRIMARY;

    doc.saveGraphicsState();
    doc.setFillColor(...drawColor);
    doc.rect(x, y, BORDERS.ACCENT, h, "F");
    doc.restoreGraphicsState();
}

/**
 * Draws a horizontal separator divider line.
 */
export function drawDivider(
    doc: jsPDF,
    x: number,
    y: number,
    w: number,
    color?: [number, number, number],
    thickness?: number
) {
    const drawColor = color ?? COLORS.BORDER_DARK;
    const lineW = thickness ?? BORDERS.DEFAULT;

    doc.saveGraphicsState();
    doc.setDrawColor(...drawColor);
    doc.setLineWidth(lineW);
    doc.line(x, y, x + w, y);
    doc.restoreGraphicsState();
}

/**
 * Checks if requiredHeight fits on the current page. If not, adds a new page and returns the top margin.
 */
export function checkAndAddPage(doc: jsPDF, currentY: number, requiredHeight: number): number {
    const dim = getDimensions(doc);
    if (currentY + requiredHeight > dim.bottomMargin) {
        doc.addPage();
        return dim.topMargin;
    }
    return currentY;
}

/**
 * Merges invoice PDF buffer with external PDF or Image attachments (E-Way Bill, Challan, etc.)
 */
export async function mergeInvoiceWithAttachment(
    invoicePdfBuffer: Uint8Array,
    attachmentUrl: string
): Promise<Uint8Array> {
    try {
        const response = await fetch(attachmentUrl);
        if (!response.ok) return invoicePdfBuffer;

        const attachmentArrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get("content-type") || "";

        const mergedPdf = await PDFDocument.create();
        const invoiceDoc = await PDFDocument.load(invoicePdfBuffer);

        const invoicePages = await mergedPdf.copyPages(invoiceDoc, invoiceDoc.getPageIndices());
        invoicePages.forEach(p => mergedPdf.addPage(p));

        if (contentType.includes("pdf") || attachmentUrl.toLowerCase().endsWith(".pdf")) {
            const attachmentDoc = await PDFDocument.load(attachmentArrayBuffer);
            const attachmentPages = await mergedPdf.copyPages(attachmentDoc, attachmentDoc.getPageIndices());
            attachmentPages.forEach(p => mergedPdf.addPage(p));
        } else if (
            contentType.includes("image") || 
            attachmentUrl.match(/\.(png|jpe?g|webp)($|\?)/i)
        ) {
            let embeddedImage;
            if (contentType.includes("png") || attachmentUrl.toLowerCase().includes(".png")) {
                embeddedImage = await mergedPdf.embedPng(attachmentArrayBuffer);
            } else {
                embeddedImage = await mergedPdf.embedJpg(attachmentArrayBuffer);
            }

            if (embeddedImage) {
                const page = mergedPdf.addPage([595.28, 841.89]);
                const { width, height } = page.getSize();
                const imgAspect = embeddedImage.width / embeddedImage.height;

                let drawW = width - 40;
                let drawH = drawW / imgAspect;

                if (drawH > height - 40) {
                    drawH = height - 40;
                    drawW = drawH * imgAspect;
                }

                const drawX = (width - drawW) / 2;
                const drawY = (height - drawH) / 2;

                page.drawImage(embeddedImage, {
                    x: drawX,
                    y: drawY,
                    width: drawW,
                    height: drawH,
                });
            }
        }

        return await mergedPdf.save();
    } catch (mergeError) {
        console.error("[MERGE_ATTACHMENT_ERROR]", mergeError);
        return invoicePdfBuffer;
    }
}
