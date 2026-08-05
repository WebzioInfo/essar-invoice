// utils.ts
import jsPDF from "jspdf";
import { getFontName } from "./assets";
import { COLORS, SPACING } from "./styles";

/**
 * Formats a number to Indian Rupees format (e.g. 12,34,567.89).
 */
export function fmtAmount(n: number): string {
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Splits a text block into wrapped lines according to the specified column width.
 */
export function splitText(
    doc: jsPDF, 
    text: string, 
    width: number, 
    fontName: string, 
    fontStyle: string, 
    fontSize: number
): string[] {
    doc.setFont(fontName, fontStyle);
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, width);
}

/**
 * Computes the exact rendering height (in mm) of a wrapped text block.
 */
export function getWrappedTextHeight(
    doc: jsPDF,
    text: string,
    width: number,
    fontName: string,
    fontStyle: string,
    fontSize: number,
    lineHeightMultiplier: number = SPACING.LINE_HEIGHT_RATIO
): number {
    if (!text) return 0;
    const lines = splitText(doc, text, width, fontName, fontStyle, fontSize);
    return lines.length * (fontSize * lineHeightMultiplier);
}

/**
 * Calculates the optimal font size to fit text within a maxWidth.
 */
export function getOptimalFontSize(
    doc: jsPDF,
    text: string,
    maxWidth: number,
    config: { fontName?: string; fontStyle?: string; maxSize: number; minSize?: number; step?: number }
): number {
    const fontName = config.fontName || getFontName();
    const fontStyle = config.fontStyle || "normal";
    const maxSize = config.maxSize;
    const minSize = config.minSize || 6.0;
    const step = config.step || 0.5;

    let currentSize = maxSize;

    while (currentSize >= minSize) {
        doc.setFont(fontName, fontStyle);
        doc.setFontSize(currentSize);
        const textWidth = doc.getTextWidth(text);
        if (textWidth <= maxWidth) {
            return currentSize;
        }
        currentSize -= step;
    }

    return minSize;
}

/**
 * Renders auto-scaled, wrapped text and returns the ending Y position.
 */
export function renderScaledText(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    config: { fontStyle?: "normal" | "bold" | "italic" | "bolditalic"; maxSize: number; minSize?: number; step?: number },
    options?: { align?: "left" | "right" | "center"; color?: [number, number, number]; lineHeightMultiplier?: number }
): number {
    const fontName = getFontName();
    const fontStyle = config.fontStyle || "normal";
    const fontSize = getOptimalFontSize(doc, text, maxWidth, {
        ...config,
        fontName,
        fontStyle
    });

    doc.setFont(fontName, fontStyle);
    doc.setFontSize(fontSize);

    if (options?.color) {
        doc.setTextColor(...options.color);
    } else {
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
    }

    const lines = splitText(doc, text, maxWidth, fontName, fontStyle, fontSize);
    const mult = options?.lineHeightMultiplier || SPACING.LINE_HEIGHT_RATIO;
    const lineHeight = fontSize * mult;

    doc.text(lines, x, y, { align: options?.align || "left" });
    return y + (lines.length * lineHeight);
}

/**
 * Aggregates dynamic GST tax breakdown grouped by HSN code and GST rate.
 */
export function aggregateHsnSummary(lineItems: any[], freightVal: number, fTaxPercent: number): Map<string, any> {
    const hsnSummaryMap = new Map<string, any>();

    lineItems.forEach((item: any) => {
        const hsn = item.hsn || "N/A";
        const itemRate = item.rate?.toNumber ? item.rate.toNumber() : Number(item.rate || 0);
        const itemTaxAmount = item.taxAmount?.toNumber ? item.taxAmount.toNumber() : Number(item.taxAmount || 0);
        const itemTaxPercent = item.taxPercent?.toNumber ? item.taxPercent.toNumber() : Number(item.taxPercent || 0);

        const taxableValue = (item.qty || 0) * itemRate;
        const groupKey = `${hsn}_${itemTaxPercent}`;

        if (!hsnSummaryMap.has(groupKey)) {
            hsnSummaryMap.set(groupKey, {
                hsn,
                taxPercent: itemTaxPercent,
                taxableValue: 0,
                taxAmount: 0,
            });
        }

        const existing = hsnSummaryMap.get(groupKey)!;
        existing.taxableValue += taxableValue;
        existing.taxAmount += itemTaxAmount;
    });

    if (freightVal > 0) {
        const fTax = (freightVal * fTaxPercent) / 100;
        const fKey = `FREIGHT_${fTaxPercent}`;
        hsnSummaryMap.set(fKey, {
            hsn: "Freight Charges",
            taxPercent: fTaxPercent,
            taxableValue: freightVal,
            taxAmount: fTax,
        });
    }

    return hsnSummaryMap;
}
