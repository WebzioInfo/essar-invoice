// sections.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";
import { numberToWords } from "@/utils/financials";
import { getFontName } from "./assets";
import { COLORS, FONT_SIZES, BORDERS, SPACING } from "./styles";
import { formatCurrency } from "./CurrencyFormatter";
import { fmtAmount, splitText, getWrappedTextHeight, getOptimalFontSize, renderScaledText } from "./utils";
import { getDimensions, getMultiColumnGrid, drawCard, drawLeftAccentBar, drawDivider, checkAndAddPage } from "./layout";

function fmtDate(d: Date | string | null) {
    if (!d) return "N/A";
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(d));
}

/**
 * Draws the Company Header, Logo, and TAX INVOICE title banner.
 */
export function drawCompanyHeader(doc: jsPDF, settings: any, startY: number): number {
    const dim = getDimensions(doc);
    const fontName = getFontName();

    let companyX = dim.leftMargin;

    if (settings?.showLogo) {
        try {
            let logoFileName = settings.logoUrl || "logo.png";
            if (logoFileName.startsWith("/")) logoFileName = logoFileName.slice(1);

            const logoPath = path.join(process.cwd(), "public", logoFileName);
            if (fs.existsSync(logoPath)) {
                const ext = path.extname(logoPath).slice(1).toUpperCase() || "PNG";
                const logoData = fs.readFileSync(logoPath).toString("base64");

                const maxLogoW = 40;
                const maxLogoH = 24;

                try {
                    const imgProps = doc.getImageProperties(logoData);
                    const aspect = imgProps.width / imgProps.height;
                    let renderW = maxLogoW;
                    let renderH = maxLogoW / aspect;

                    if (renderH > maxLogoH) {
                        renderH = maxLogoH;
                        renderW = maxLogoH * aspect;
                    }

                    doc.addImage(logoData, ext, dim.leftMargin, startY - 4, renderW, renderH);
                    companyX = dim.leftMargin + renderW + 6;
                } catch {
                    doc.addImage(logoData, ext, dim.leftMargin, startY - 4, 32, 18);
                    companyX = dim.leftMargin + 38;
                }
            }
        } catch (err) {
            console.error("[LOGO_RENDER_ERROR]", err);
        }
    }

    const maxTextW = dim.W - dim.rightMargin - companyX - 70;
    const companyName = (settings?.companyName || "ESSAR ENTERPRISES").toUpperCase();

    // Renders company name (MEDIUM size, bold)
    const endY = renderScaledText(
        doc,
        companyName,
        companyX,
        startY,
        maxTextW,
        { fontStyle: "bold", maxSize: FONT_SIZES.MEDIUM, minSize: 10 },
        { color: COLORS.TEXT_PRIMARY }
    );

    // Renders company details (SMALL size, normal)
    doc.setFont(fontName, "normal");
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(...COLORS.TEXT_SECONDARY);

    let curY = endY;

    const addrLine = `${settings?.address1 || ""}, ${settings?.address2 || ""}`;
    doc.text(addrLine, companyX, curY);

    curY += 4.0;
    const gstinCityLine = `${settings?.city || ""} - ${settings?.pincode || ""} | GSTIN: ${settings?.gstin || ""}`;
    doc.text(gstinCityLine, companyX, curY);

    curY += 4.0;
    const contactLine = `Email: ${settings?.email || ""} | Phone: ${settings?.phone || ""}`;
    doc.text(contactLine, companyX, curY);

    // Document title (LARGE size, bold)
    doc.saveGraphicsState();
    doc.setFont(fontName, "bold");
    doc.setFontSize(FONT_SIZES.LARGE);
    doc.setTextColor(...COLORS.TEXT_PRIMARY);
    doc.text("TAX INVOICE", dim.W - dim.rightMargin, startY, { align: "right" });
    doc.restoreGraphicsState();

    // Separation hairline divider
    const nextY = Math.max(curY + 6, startY);
    drawDivider(doc, dim.leftMargin, nextY, dim.usableW);

    return nextY + SPACING.SECTION_GAP;
}

/**
 * Draws Billing / Shipping / Document metadata cards in equal heights.
 * Completely borderless cards (shaded slate-50 backings) for Apple/Stripe look.
 */
export function drawCustomerCards(
    doc: jsPDF,
    billing: any,
    shipping: any,
    invoice: any,
    startY: number
): number {
    const spacing = SPACING;
    const fontName = getFontName();

    const colGap = -2;
    const grid = getMultiColumnGrid(doc, 3, colGap);
    const colW = grid.widths[0];

    // --- PRE-CALCULATE HEIGHTS ---
    const measureCardH = (data: any) => {
        let h = spacing.CARD_PADDING + 5.5; // Title gap
        const innerW = colW - (spacing.CARD_PADDING * 2);

        const nameHeight = getWrappedTextHeight(doc, data.name || "N/A", innerW, fontName, "bold", FONT_SIZES.SMALL);
        h += nameHeight + 1.5;

        const addrParts = [
            data.address1,
            data.address2,
            [data.state, data.pinCode].filter(Boolean).join(" - ")
        ].filter(Boolean).join(", ");

        if (addrParts) {
            const addrHeight = getWrappedTextHeight(doc, addrParts, innerW, fontName, "normal", FONT_SIZES.SMALL);
            h += addrHeight + 1.5;
        }

        if (data.phone) h += 3.8;
        if (data.gst) h += 3.8;

        return h + spacing.CARD_PADDING;
    };

    const bHeight = measureCardH(billing);
    const sHeight = measureCardH(shipping);

    // Meta Height
    let mHeight = spacing.CARD_PADDING + 5.5;
    const innerW = colW - (spacing.CARD_PADDING * 2);
    const valueW = innerW * 0.60;
    const infoRows = [
        { label: "Invoice No:", val: invoice.invoiceNo || "N/A", isBold: true },
        { label: "Date:", val: fmtDate(invoice.date) },
        { label: "E-Way Bill:", val: invoice.ewayBill || "N/A" },
        { label: "Vehicle No:", val: invoice.vehicleNo || "N/A" },
    ];
    infoRows.forEach(row => {
        const style = row.isBold ? "bold" : "normal";
        const lineH = getWrappedTextHeight(doc, row.val, valueW, fontName, style, FONT_SIZES.SMALL);
        mHeight += Math.max(lineH, 4.6);
    });
    mHeight += spacing.CARD_PADDING;

    const equalCardHeight = Math.max(bHeight, sHeight, mHeight) - 3;

    // --- DRAW BILL TO ---
    drawCard(doc, grid.xs[0], startY, colW, equalCardHeight);
    doc.saveGraphicsState();
    doc.setFont(fontName, "bold");
    doc.setFontSize(FONT_SIZES.MEDIUM);
    doc.setTextColor(...COLORS.TEXT_SECONDARY);
    doc.text("Bill To", grid.xs[0] + spacing.CARD_PADDING, startY + 5.5);
    doc.restoreGraphicsState();

    let curY = startY + 9.5;
    const cardInnerW = colW - (spacing.CARD_PADDING * 2);
    curY = renderScaledText(doc, billing.name || "N/A", grid.xs[0] + spacing.CARD_PADDING, curY, cardInnerW, { fontStyle: "bold", maxSize: FONT_SIZES.SMALL, minSize: 7.5 }, { color: COLORS.TEXT_PRIMARY });

    doc.setFont(fontName, "normal");
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(...COLORS.TEXT_SECONDARY);
    const bAddrParts = [billing.address1, billing.address2, [billing.state, billing.pinCode].filter(Boolean).join(" - ")].filter(Boolean).join(", ");
    if (bAddrParts) {
        const lines = doc.splitTextToSize(bAddrParts, cardInnerW);
        doc.text(lines, grid.xs[0] + spacing.CARD_PADDING, curY);
        curY += lines.length * 3.8;
    }
    if (billing.phone) {
        doc.text(`Phone: ${billing.phone}`, grid.xs[0] + spacing.CARD_PADDING, curY);
        curY += 3.8;
    }
    if (billing.gst) {
        doc.setFont(fontName, "bold");
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        doc.text(`GSTIN: ${billing.gst}`, grid.xs[0] + spacing.CARD_PADDING, curY);
    }

    // --- DRAW SHIP TO ---
    drawCard(doc, grid.xs[1], startY, colW, equalCardHeight);
    doc.saveGraphicsState();
    doc.setFont(fontName, "bold");
    doc.setFontSize(FONT_SIZES.MEDIUM);
    doc.setTextColor(...COLORS.TEXT_SECONDARY);
    doc.text("Ship To", grid.xs[1] + spacing.CARD_PADDING, startY + 5.5);
    doc.restoreGraphicsState();

    curY = startY + 9.5;
    curY = renderScaledText(doc, shipping.name || "N/A", grid.xs[1] + spacing.CARD_PADDING, curY, cardInnerW, { fontStyle: "bold", maxSize: FONT_SIZES.SMALL, minSize: 7.5 }, { color: COLORS.TEXT_PRIMARY });

    doc.setFont(fontName, "normal");
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(...COLORS.TEXT_SECONDARY);
    const sAddrParts = [shipping.address1, shipping.address2, [shipping.state, shipping.pinCode].filter(Boolean).join(" - ")].filter(Boolean).join(", ");
    if (sAddrParts) {
        const lines = doc.splitTextToSize(sAddrParts, cardInnerW);
        doc.text(lines, grid.xs[1] + spacing.CARD_PADDING, curY);
        curY += lines.length * 3.8;
    }
    if (shipping.phone) {
        doc.text(`Phone: ${shipping.phone}`, grid.xs[1] + spacing.CARD_PADDING, curY);
        curY += 3.8;
    }
    if (shipping.gst) {
        doc.setFont(fontName, "bold");
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        doc.text(`GSTIN: ${shipping.gst}`, grid.xs[1] + spacing.CARD_PADDING, curY);
    }

    // --- DRAW INVOICE DETAILS ---
    drawCard(doc, grid.xs[2], startY, colW, equalCardHeight);
    doc.saveGraphicsState();
    doc.setFont(fontName, "bold");
    doc.setFontSize(FONT_SIZES.MEDIUM);
    doc.setTextColor(...COLORS.TEXT_SECONDARY);
    doc.text("Invoice Details", grid.xs[2] + spacing.CARD_PADDING, startY + 5.5);
    doc.restoreGraphicsState();

    curY = startY + 9.5;
    const metaValW = cardInnerW * 0.60;
    infoRows.forEach(row => {
        doc.setFont(fontName, "bold");
        doc.setFontSize(FONT_SIZES.SMALL);
        doc.setTextColor(...COLORS.TEXT_SECONDARY);
        doc.text(row.label, grid.xs[2] + spacing.CARD_PADDING, curY);

        const style = row.isBold ? "bold" : "normal";
        doc.setFontSize(FONT_SIZES.SMALL);
        const lineH = Math.max(getWrappedTextHeight(doc, row.val, metaValW, fontName, style, FONT_SIZES.SMALL), 4.6);

        renderScaledText(
            doc,
            row.val,
            grid.xs[2] + colW - spacing.CARD_PADDING,
            curY,
            metaValW,
            { fontStyle: style, maxSize: FONT_SIZES.SMALL, minSize: 6.5 },
            { align: "right", color: row.isBold ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY }
        );

        curY += lineH;
    });

    return startY + equalCardHeight + spacing.SECTION_GAP;
}

/**
 * Renders the products items table.
 */
export function drawItemsTable(
    doc: jsPDF,
    invoice: any,
    lineItems: any[],
    productMap: Map<string, any>,
    settings: any,
    startY: number
): { endY: number; subTotal: number } {
    const dim = getDimensions(doc);
    const fontName = getFontName();
    const showPkg = !!settings?.showPkgDetails;

    const tableHead = showPkg
        ? [["Sl", "Pkg Details", "Description of Goods", "HSN/SAC", "Quantity", "Rate", "per", "Amount"]]
        : [["Sl", "Description of Goods", "HSN/SAC", "Quantity", "Rate", "per", "Amount"]];

    const tableBody = lineItems.map((item: any, i: number) => {
        const prod = productMap.get(item.productId);
        const productName = prod?.description || item.description || "N/A";
        const subTitle = (item.description && item.description !== prod?.description)
            ? `\n${item.description}`
            : (prod?.notes ? `\n${prod.notes}` : "");

        const pkgCountStr = Number(item.pkgCount || 0);
        const rawPerBox = (Number(item.qtyPerBox || 0) > 0) ? item.qtyPerBox : (prod?.qtyPerBox || 0);
        const perBox = (rawPerBox && typeof rawPerBox === 'object' && 'toNumber' in rawPerBox)
            ? (rawPerBox as any).toNumber()
            : Number(rawPerBox || 0);

        const pkgTypeRaw = (item.pkgType || "BOX").toUpperCase();
        const pkgType = pkgCountStr > 1 ? (pkgTypeRaw.endsWith('X') ? `${pkgTypeRaw}ES` : `${pkgTypeRaw}S`) : pkgTypeRaw;
        const pkgValue = (pkgCountStr > 0 && perBox > 0)
            ? `${pkgCountStr} ${pkgType}\nX ${perBox} ${item.unit || prod?.unit || "NOS"}`
            : (pkgCountStr > 0 ? `${pkgCountStr} ${pkgType}` : "-");

        const pkgInDesc = (!showPkg && pkgCountStr > 0) ? `\nNo. & Kind of Pkgs: ${pkgValue}` : "";

        return [
            String(i + 1),
            ...(showPkg ? [pkgValue] : []),
            `${productName.toUpperCase()}${subTitle}${pkgInDesc}`,
            item.hsn || "-",
            `${Number(item.qty).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${item.unit || "NOS"}`,
            formatCurrency(item.rate?.toNumber ? item.rate.toNumber() : Number(item.rate)),
            item.unit || "NOS",
            formatCurrency((item.qty || 0) * (item.rate?.toNumber ? item.rate.toNumber() : Number(item.rate))),
        ];
    });

    const columnStyles: any = showPkg ? {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "center", cellWidth: 18, fontSize: FONT_SIZES.SMALL - 1.0, cellPadding: 1, overflow: 'linebreak' },
        2: { halign: "left" },
        3: { halign: "center", cellWidth: 20 },
        4: { halign: "right", cellWidth: 22 },
        5: { halign: "right", cellWidth: 20 },
        6: { halign: "center", cellWidth: 12 },
        7: { halign: "right", cellWidth: 28 },
    } : {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "left" },
        2: { halign: "center", cellWidth: 20 },
        3: { halign: "right", cellWidth: 22 },
        4: { halign: "right", cellWidth: 20 },
        5: { halign: "center", cellWidth: 12 },
        6: { halign: "right", cellWidth: 28 },
    };

    autoTable(doc, {
        startY: startY,
        head: tableHead,
        body: tableBody,
        theme: "plain",
        styles: { font: fontName },
        headStyles: {
            fillColor: COLORS.BG_MUTED,
            textColor: COLORS.TEXT_PRIMARY,
            fontSize: FONT_SIZES.SMALL,
            fontStyle: "bold",
            lineWidth: BORDERS.HAIRLINE,
            lineColor: COLORS.BORDER_DARK,
            halign: "center",
            cellPadding: SPACING.TABLE_CELL_PADDING,
        },
        bodyStyles: {
            fontSize: FONT_SIZES.SMALL,
            textColor: COLORS.TEXT_SECONDARY,
            cellPadding: SPACING.TABLE_CELL_PADDING,
            valign: "middle",
            lineWidth: BORDERS.HAIRLINE,
            lineColor: COLORS.BORDER_LIGHT,
        },
        alternateRowStyles: { fillColor: COLORS.BG_LIGHT },
        columnStyles: columnStyles,
        margin: { left: dim.leftMargin, right: dim.rightMargin },
    });

    const y = (doc as any).lastAutoTable.finalY + 4;
    const subTotal = invoice.subTotal?.toNumber ? invoice.subTotal.toNumber() : Number(invoice.subTotal || 0);

    doc.saveGraphicsState();
    doc.setFont(fontName, "bold");
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(...COLORS.TEXT_PRIMARY);
    doc.text("Total", dim.W - dim.rightMargin - 40, y, { align: "right" });
    doc.text(formatCurrency(subTotal), dim.W - dim.rightMargin, y, { align: "right" });
    doc.restoreGraphicsState();

    return { endY: y + 6, subTotal };
}

/**
 * Renders the GST HSN summary tables.
 */
export function drawHsnSummaryTable(
    doc: jsPDF,
    gstType: string,
    hsnSummaryMap: Map<string, any>,
    startY: number
): number {
    const dim = getDimensions(doc);
    const fontName = getFontName();

    let hsnHead, hsnBody;

    if (gstType === 'IGST') {
        hsnHead = [["HSN/SAC", "Taxable Value", "IGST Rate", "IGST Amount", "Total Tax"]];
        hsnBody = Array.from(hsnSummaryMap.values()).map(h => [
            h.hsn,
            formatCurrency(h.taxableValue),
            `${h.taxPercent}%`,
            formatCurrency(h.taxAmount),
            formatCurrency(h.taxAmount)
        ]);
    } else {
        hsnHead = [["HSN/SAC", "Taxable Value", "CGST Rate", "CGST Amt", "SGST Rate", "SGST Amt", "Total Tax"]];
        hsnBody = Array.from(hsnSummaryMap.values()).map(h => {
            const rate = h.taxPercent / 2;
            const amt = h.taxAmount / 2;
            return [
                h.hsn,
                formatCurrency(h.taxableValue),
                `${rate}%`,
                formatCurrency(amt),
                `${rate}%`,
                formatCurrency(amt),
                formatCurrency(h.taxAmount)
            ];
        });
    }

    let y = startY;
    const hsnTableHeight = (hsnBody.length + 1) * 7.5;
    y = checkAndAddPage(doc, y, hsnTableHeight + 8);

    doc.saveGraphicsState();
    doc.setFont(fontName, "bold");
    doc.setFontSize(FONT_SIZES.MEDIUM);
    doc.setTextColor(...COLORS.TEXT_PRIMARY);
    doc.text("HSN/SAC Summary", dim.leftMargin, y);
    doc.restoreGraphicsState();

    y += 4.5;

    autoTable(doc, {
        startY: y,
        head: hsnHead,
        body: hsnBody,
        theme: "plain",
        styles: { font: fontName },
        headStyles: {
            fontSize: FONT_SIZES.SMALL,
            fillColor: COLORS.BG_MUTED,
            textColor: COLORS.TEXT_PRIMARY,
            halign: "center",
            lineWidth: BORDERS.HAIRLINE,
            lineColor: COLORS.BORDER_DARK,
            fontStyle: "bold",
            cellPadding: 2,
        },
        bodyStyles: {
            fontSize: FONT_SIZES.SMALL,
            halign: "right",
            lineWidth: BORDERS.HAIRLINE,
            lineColor: COLORS.BORDER_LIGHT,
            textColor: COLORS.TEXT_SECONDARY,
            cellPadding: 2,
        },
        alternateRowStyles: { fillColor: COLORS.BG_LIGHT },
        columnStyles: { 0: { halign: "center" } },
        margin: { left: dim.leftMargin, right: dim.rightMargin },
    });

    return (doc as any).lastAutoTable.finalY + SPACING.SECTION_GAP;
}

/**
 * Renders state supply declarations.
 */
export function drawGstDeclaration(doc: jsPDF, stateName: string, startY: number): number {
    const dim = getDimensions(doc);
    const fontName = getFontName();

    doc.saveGraphicsState();
    doc.setFont(fontName, "italic");
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(...COLORS.TEXT_MUTED);
    const declText = `Declaration: Place of supply is verified as state of ${stateName || "Karnataka"}. Taxes are computed accordingly.`;
    doc.text(declText, dim.leftMargin, startY);
    doc.restoreGraphicsState();

    return startY + 4;
}

/**
 * Draws the totals and breakdown block.
 * Renders a clean right-aligned floating totals section with zero backgrounds or card containers.
 */
export function drawTotalsSection(
    doc: jsPDF,
    invoice: any,
    subTotal: number,
    freightVal: number,
    cgst: number,
    sgst: number,
    igst: number,
    roundOff: number,
    rounded: number,
    startY: number
): number {
    const dim = getDimensions(doc);
    const fontName = getFontName();
    const spacing = SPACING;

    const rows: { label: string; val: string }[] = [];
    const itemsSubTotal = subTotal - freightVal;
    rows.push({ label: "Subtotal", val: formatCurrency(itemsSubTotal) });

    if (freightVal > 0) {
        rows.push({
            label: `Freight ${invoice.isFreightCollect ? '(Collect)' : ''}`,
            val: formatCurrency(freightVal)
        });
    }
    if (cgst > 0) rows.push({ label: "CGST", val: formatCurrency(cgst) });
    if (sgst > 0) rows.push({ label: "SGST", val: formatCurrency(sgst) });
    if (igst > 0) rows.push({ label: "IGST", val: formatCurrency(igst) });

    if (Math.abs(roundOff) > 0.005) {
        rows.push({
            label: "Round Off",
            val: (roundOff > 0 ? "+" : "") + formatCurrency(roundOff)
        });
    }

    // Design layout tokens
    const rowHeight = 5.5; // Roomy whitespace row gaps
    const dividerSpace = 4.5;
    const grandTotalHeight = 8.0;
    const blockW = 90;
    const blockH = (rows.length * rowHeight) + (dividerSpace * 2) + grandTotalHeight;

    const y = checkAndAddPage(doc, startY, blockH + spacing.SECTION_GAP);

    const cardX = dim.W - dim.rightMargin - blockW;
    const totalsX = dim.W - dim.rightMargin;

    let curY = y + 4.0;

    doc.saveGraphicsState();

    // Render Subtotal, Taxes, Freight rows
    rows.forEach(row => {
        // Labels: 9pt Medium Muted Gray
        doc.setFont(fontName, "normal");
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.TEXT_SECONDARY);
        doc.text(row.label, cardX, curY);

        // Values: 10pt SemiBold Dark
        doc.setFont(fontName, "bold");
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        doc.text(row.val, totalsX, curY, { align: "right" });

        curY += rowHeight;
    });

    // Hairline divider above GRAND TOTAL
    const divider1Y = curY - rowHeight + 2.5;
    drawDivider(doc, cardX, divider1Y, blockW, COLORS.BORDER_DARK, BORDERS.HAIRLINE);

    curY = divider1Y + 6.0;

    // GRAND TOTAL Label: 11pt Bold Uppercase Dark
    doc.setFont(fontName, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.TEXT_PRIMARY);
    doc.text("GRAND TOTAL", cardX, curY - 0.5);

    // GRAND TOTAL Value: 16pt Bold Dark with Currency symbol 13pt Bold
    const valStr = formatCurrency(rounded);
    let symbol = "₹";
    let numericVal = valStr;
    if (valStr.startsWith("₹ ")) {
        symbol = "₹";
        numericVal = valStr.substring(2);
    } else if (valStr.startsWith("₹")) {
        symbol = "₹";
        numericVal = valStr.substring(1);
    } else if (valStr.startsWith("Rs.")) {
        symbol = "Rs.";
        numericVal = valStr.substring(3);
    }

    doc.setFont(fontName, "bold");
    doc.setFontSize(16);
    const numWidth = doc.getTextWidth(numericVal);
    // Draw numeric value
    doc.text(numericVal, totalsX, curY, { align: "right" });

    // Draw currency symbol slightly smaller (13pt)
    doc.setFontSize(13);
    doc.text(symbol, totalsX - numWidth - 1.2, curY, { align: "right" });

    // Hairline divider below GRAND TOTAL
    const divider2Y = curY + 3.5;
    drawDivider(doc, cardX, divider2Y, blockW, COLORS.BORDER_DARK, BORDERS.HAIRLINE);

    doc.restoreGraphicsState();

    return y + blockH + spacing.SECTION_GAP;
}

/**
 * Draws narrative text words inside a clean container box spanning full printable width.
 */
export function drawWordsSection(doc: jsPDF, rounded: number, taxVal: number, startY: number): number {
    const dim = getDimensions(doc);
    const fontName = getFontName();
    const spacing = SPACING;

    const maxW = dim.usableW - 12;
    const line1 = numberToWords(rounded);
    const line2 = numberToWords(taxVal);

    doc.setFont(fontName, "bold");
    doc.setFontSize(FONT_SIZES.SMALL);
    const l1Lines = doc.splitTextToSize(line1, maxW);
    const l2Lines = doc.splitTextToSize(line2, maxW);

    const boxH = 12 + (l1Lines.length + l2Lines.length) * 4.2;
    let y = checkAndAddPage(doc, startY, boxH + spacing.ITEM_GAP);

    // Draw borderless shaded container box
    drawCard(doc, dim.leftMargin, y, dim.usableW, boxH, { fill: true, border: false });
    drawLeftAccentBar(doc, dim.leftMargin, y, boxH);

    let innerY = y + 5;
    doc.saveGraphicsState();

    doc.setFont(fontName, "bold");
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(...COLORS.TEXT_SECONDARY);
    doc.text("Amount Chargeable (in words):", dim.leftMargin + 6, innerY);

    doc.setFont(fontName, "bold");
    doc.setTextColor(...COLORS.TEXT_PRIMARY);
    doc.text(l1Lines, dim.leftMargin + 52, innerY);
    innerY += l1Lines.length * 4.2 + 2;

    doc.setFont(fontName, "bold");
    doc.setTextColor(...COLORS.TEXT_SECONDARY);
    doc.text("Tax Amount (in words):", dim.leftMargin + 6, innerY);

    doc.setFont(fontName, "bold");
    doc.setTextColor(...COLORS.TEXT_PRIMARY);
    doc.text(l2Lines, dim.leftMargin + 52, innerY);

    doc.restoreGraphicsState();

    return y + boxH + spacing.ITEM_GAP;
}

/**
 * Draws remarks and notes cards.
 */
export function drawRemarksSection(doc: jsPDF, notes: string | null, startY: number): number {
    if (!notes || !notes.trim()) return startY;

    const dim = getDimensions(doc);
    const fontName = getFontName();

    const notesText = notes.trim();
    const innerW = dim.usableW - 12;

    doc.setFont(fontName, "normal");
    doc.setFontSize(FONT_SIZES.SMALL);
    const lines = doc.splitTextToSize(notesText, innerW);
    const boxH = 9.5 + (lines.length * 4.2);
    let y = checkAndAddPage(doc, startY, boxH);

    drawCard(doc, dim.leftMargin, y, dim.usableW, boxH);
    drawLeftAccentBar(doc, dim.leftMargin, y, boxH);

    doc.saveGraphicsState();
    doc.setFont(fontName, "bold");
    doc.setFontSize(FONT_SIZES.MEDIUM);
    doc.setTextColor(...COLORS.TEXT_SECONDARY);
    doc.text("REMARKS / INTERNAL NOTES", dim.leftMargin + 6, y + 4.8);

    doc.setFont(fontName, "normal");
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(...COLORS.TEXT_PRIMARY);
    doc.text(lines, dim.leftMargin + 6, y + 8.8);
    doc.restoreGraphicsState();

    return y + boxH + SPACING.ITEM_GAP;
}

/**
 * Draws bank info and signatory.
 */
export function drawBankAndSignatureSection(doc: jsPDF, settings: any, startY: number): number {
    const dim = getDimensions(doc);
    const fontName = getFontName();
    const bankW = 105;
    const bankH = 34;

    let y = checkAndAddPage(doc, startY, bankH + 8);

    // Draw Bank Card
    drawCard(doc, dim.leftMargin, y, bankW, bankH);
    doc.saveGraphicsState();
    doc.setFont(fontName, "bold");
    doc.setFontSize(FONT_SIZES.MEDIUM);
    doc.setTextColor(...COLORS.TEXT_SECONDARY);
    doc.text("ACCOUNT DETAILS", dim.leftMargin + 5, y + 5);

    doc.setFont(fontName, "normal");
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(...COLORS.TEXT_PRIMARY);

    let bY = y + 9.5;
    const drawBankLine = (label: string, val: string) => {
        doc.setFont(fontName, "bold");
        doc.text(label, dim.leftMargin + 5, bY);
        doc.setFont(fontName, "normal");
        doc.text(val, dim.leftMargin + 25, bY);
        bY += 4.2;
    };
    drawBankLine("A/C Name:", settings?.bankAccountName || "ESSAR ENTERPRISES");
    drawBankLine("Bank Name:", settings?.bankName || "FEDERAL BANK");
    drawBankLine("Branch Name:", settings?.bankBranch || "DOMMASANDRA");
    drawBankLine("Account No:", settings?.bankAccountNo || "21650200003173");
    drawBankLine("IFSC Code:", (settings?.bankIfsc || "FDRL0002165").toUpperCase());
    doc.restoreGraphicsState();

    // Draw Signatory
    const sigX = dim.W - dim.rightMargin;
    doc.saveGraphicsState();
    doc.setFont(fontName, "bold");
    doc.setFontSize(FONT_SIZES.MEDIUM);
    doc.setTextColor(...COLORS.TEXT_PRIMARY);
    const companyName = (settings?.companyName || "ESSAR ENTERPRISES").toUpperCase();
    doc.text(`For ${companyName}`, sigX, y + 5, { align: "right" });

    doc.setDrawColor(...COLORS.BORDER_DARK);
    doc.setLineWidth(BORDERS.DEFAULT);
    doc.line(sigX - 45, y + 24, sigX, y + 24);

    doc.setFont(fontName, "normal");
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(...COLORS.TEXT_SECONDARY);
    doc.text("Authorised Signatory", sigX, y + 28, { align: "right" });
    doc.restoreGraphicsState();

    return y + bankH + SPACING.SECTION_GAP;
}

/**
 * Draws running footers.
 */
export function drawPageFooter(doc: jsPDF, pageNum?: number, totalPages?: number) {
    const dim = getDimensions(doc);
    const fontName = getFontName();
    doc.saveGraphicsState();
    doc.setFont(fontName, "normal");
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(...COLORS.TEXT_MUTED);

    const now = new Date();
    const formattedDate = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(now);
    const footerText = totalPages && pageNum
        ? `Computer Generated Tax Instrument | ERP Version 4.0 | Page ${pageNum} of ${totalPages} | Generated: ${formattedDate}`
        : `Computer Generated Tax Instrument | ERP Version 4.0 | Generated: ${formattedDate}`;

    doc.text(footerText, dim.W / 2, 285, { align: "center" });
    doc.restoreGraphicsState();
}
