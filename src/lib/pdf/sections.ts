// sections.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";
import { numberToWords } from "@/utils/financials";
import { getFontName } from "./assets";
import { COLORS, FONT_SIZES, BORDERS, SPACING, TABLE_TOKENS } from "./styles";
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
export function drawCompanyHeader(
    doc: jsPDF,
    settings: any,
    startY: number,
    documentTitle: string = "TAX INVOICE"
): number {
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
    doc.text(documentTitle, dim.W - dim.rightMargin, startY, { align: "right" });
    doc.restoreGraphicsState();

    // Separation hairline divider
    const nextY = Math.max(curY + 6, startY);
    drawDivider(doc, dim.leftMargin, nextY, dim.usableW);

    return nextY + SPACING.SECTION_GAP;
}

/**
 * Draws Billing / Shipping / Document metadata section in a clean borderless corporate layout.
 * PURE WHITE background directly on the page with zero boxes, zero borders, zero background shading.
 * For QUOTATIONS: Renders a single, spacious "QUOTED TO" section (plus optional Delivery Address if explicitly enabled).
 * For INVOICES: Renders "BILL TO" and "SHIP TO" sections.
 */
export function drawCustomerCards(
    doc: jsPDF,
    billing: any,
    shipping: any,
    docData: any,
    startY: number,
    docType: "INVOICE" | "QUOTATION" = "INVOICE"
): number {
    const dim = getDimensions(doc);
    const fontName = getFontName();

    // Check if quotation has an explicit, distinct separate delivery address
    const isQuotation = docType === "QUOTATION";
    const hasSeparateDelivery = Boolean(
        !docData.shippingSameAsBilling &&
        shipping &&
        (shipping.name || shipping.address1) &&
        (shipping.name !== billing.name || shipping.address1 !== billing.address1)
    );

    const headerY = startY + 2.0;

    // Derive GST Scheme text
    const taxRates = Array.from(new Set((docData.lineItems || []).map((li: any) => Number(li.taxPercent || 0)).filter((r: number) => r > 0)));
    const rateSuffix = taxRates.length === 1 ? ` (${taxRates[0]}%)` : "";

    // =========================================================================
    // CASE A: STANDARD QUOTATION (SINGLE "QUOTED TO" RECIPIENT BLOCK)
    // =========================================================================
    if (isQuotation && !hasSeparateDelivery) {
        const gap = 8.0;
        const col1W = Math.floor((dim.usableW - gap) * 0.60); // 60% width for Customer Address
        const col2W = dim.usableW - gap - col1W;              // 40% width for Quotation Details

        const col1X = dim.leftMargin;
        const col2X = col1X + col1W + gap;

        // --- 1. QUOTED TO COLUMN ---
        doc.setFont(fontName, "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate-500 uppercase label
        doc.text("QUOTED TO", col1X, headerY);

        let y1 = headerY + 4.5;

        // Client Name (Bold 9.5pt)
        const bName = (billing.name || "N/A").trim();
        doc.setFont(fontName, "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        const bNameLines = doc.splitTextToSize(bName, col1W);
        doc.text(bNameLines, col1X, y1);
        y1 += (bNameLines.length * 4.0) + 1.0;

        // Address Lines (Normal 8pt)
        const bAddrParts = [
            billing.address1,
            billing.address2,
            [billing.state, billing.pinCode].filter(Boolean).join(" - ")
        ].filter(Boolean).join("\n");

        if (bAddrParts) {
            doc.setFont(fontName, "normal");
            doc.setFontSize(8);
            doc.setTextColor(...COLORS.TEXT_SECONDARY);
            const bAddrLines = doc.splitTextToSize(bAddrParts, col1W);
            doc.text(bAddrLines, col1X, y1);
            y1 += (bAddrLines.length * 3.6) + 1.0;
        }

        // Phone
        if (billing.phone) {
            doc.setFont(fontName, "normal");
            doc.setFontSize(8);
            doc.setTextColor(...COLORS.TEXT_SECONDARY);
            doc.text(`Phone: ${billing.phone}`, col1X, y1);
            y1 += 3.8;
        }

        // GSTIN
        if (billing.gst) {
            doc.setFont(fontName, "bold");
            doc.setFontSize(8);
            doc.setTextColor(...COLORS.TEXT_PRIMARY);
            doc.text(`GSTIN: ${billing.gst}`, col1X, y1);
            y1 += 4.0;
        }

        // --- 2. QUOTATION DETAILS COLUMN ---
        doc.setFont(fontName, "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("QUOTATION DETAILS", col2X, headerY);

        let y2 = headerY + 4.5;

        const infoRows = [
            { label: "Quotation No:", val: docData.quotationNo || "N/A", isBold: true },
            { label: "Date:", val: fmtDate(docData.date) },
            { label: "Offer Validity:", val: docData.validUntil ? fmtDate(docData.validUntil) : "Indefinite Offer" },
        ];

        const labelColW = 24.0;
        const valColW = col2W - labelColW;

        infoRows.forEach(row => {
            doc.setFont(fontName, "bold");
            doc.setFontSize(8);
            doc.setTextColor(...COLORS.TEXT_SECONDARY);
            doc.text(row.label, col2X, y2);

            const style = row.isBold ? "bold" : "normal";
            doc.setFont(fontName, style);
            doc.setTextColor(...(row.isBold ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY));
            const valLines = doc.splitTextToSize(row.val, valColW);
            doc.text(valLines, col2X + labelColW, y2);

            const rowH = Math.max(valLines.length * 3.6, 4.2);
            y2 += rowH;
        });

        const maxEndY = Math.max(y1, y2);
        return maxEndY + 4.0;
    }

    // =========================================================================
    // CASE B: INVOICE OR QUOTATION WITH EXPLICIT SEPARATE DELIVERY ADDRESS (3 COLUMNS)
    // =========================================================================
    const colGap = 6.0;
    const totalGaps = colGap * 2;
    const availableW = dim.usableW - totalGaps;

    const col1W = Math.floor(availableW * 0.35);
    const col2W = Math.floor(availableW * 0.35);
    const col3W = availableW - col1W - col2W;

    const col1X = dim.leftMargin;
    const col2X = col1X + col1W + colGap;
    const col3X = col2X + col2W + colGap;

    // --- 1. COLUMN 1: BILL TO / QUOTED TO ---
    const primaryLabel = isQuotation ? "QUOTED TO" : "BILL TO";
    doc.setFont(fontName, "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(primaryLabel, col1X, headerY);

    let y1 = headerY + 4.5;

    const bName = (billing.name || "N/A").trim();
    doc.setFont(fontName, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.TEXT_PRIMARY);
    const bNameLines = doc.splitTextToSize(bName, col1W);
    doc.text(bNameLines, col1X, y1);
    y1 += (bNameLines.length * 4.0) + 1.0;

    const bAddrParts = [
        billing.address1,
        billing.address2,
        [billing.state, billing.pinCode].filter(Boolean).join(" - ")
    ].filter(Boolean).join("\n");

    if (bAddrParts) {
        doc.setFont(fontName, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.TEXT_SECONDARY);
        const bAddrLines = doc.splitTextToSize(bAddrParts, col1W);
        doc.text(bAddrLines, col1X, y1);
        y1 += (bAddrLines.length * 3.6) + 1.0;
    }

    if (billing.phone) {
        doc.setFont(fontName, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.TEXT_SECONDARY);
        doc.text(`Phone: ${billing.phone}`, col1X, y1);
        y1 += 3.8;
    }

    if (billing.gst) {
        doc.setFont(fontName, "bold");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        doc.text(`GSTIN: ${billing.gst}`, col1X, y1);
        y1 += 4.0;
    }

    // --- 2. COLUMN 2: SHIP TO / DELIVERY ADDRESS ---
    const secondaryLabel = isQuotation ? "DELIVERY ADDRESS" : "SHIP TO";
    doc.setFont(fontName, "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(secondaryLabel, col2X, headerY);

    let y2 = headerY + 4.5;

    const sName = (shipping.name || billing.name || "N/A").trim();
    doc.setFont(fontName, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.TEXT_PRIMARY);
    const sNameLines = doc.splitTextToSize(sName, col2W);
    doc.text(sNameLines, col2X, y2);
    y2 += (sNameLines.length * 4.0) + 1.0;

    const sAddrParts = [
        shipping.address1 || billing.address1,
        shipping.address2 || billing.address2,
        [shipping.state || billing.state, shipping.pinCode || billing.pinCode].filter(Boolean).join(" - ")
    ].filter(Boolean).join("\n");

    if (sAddrParts) {
        doc.setFont(fontName, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.TEXT_SECONDARY);
        const sAddrLines = doc.splitTextToSize(sAddrParts, col2W);
        doc.text(sAddrLines, col2X, y2);
        y2 += (sAddrLines.length * 3.6) + 1.0;
    }

    const sPhone = shipping.phone || billing.phone;
    if (sPhone) {
        doc.setFont(fontName, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.TEXT_SECONDARY);
        doc.text(`Phone: ${sPhone}`, col2X, y2);
        y2 += 3.8;
    }

    const sGst = shipping.gst || billing.gst;
    if (sGst) {
        doc.setFont(fontName, "bold");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.TEXT_PRIMARY);
        doc.text(`GSTIN: ${sGst}`, col2X, y2);
        y2 += 4.0;
    }

    // --- 3. COLUMN 3: DOCUMENT DETAILS ---
    doc.setFont(fontName, "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(isQuotation ? "QUOTATION DETAILS" : "INVOICE DETAILS", col3X, headerY);

    let y3 = headerY + 4.5;

    const infoRows = isQuotation ? [
        { label: "Quotation No:", val: docData.quotationNo || "N/A", isBold: true },
        { label: "Date:", val: fmtDate(docData.date) },
        { label: "Offer Validity:", val: docData.validUntil ? fmtDate(docData.validUntil) : "Indefinite Offer" },
    ] : [
        { label: "Invoice No:", val: docData.invoiceNo || "N/A", isBold: true },
        { label: "Date:", val: fmtDate(docData.date) },
        { label: "E-Way Bill:", val: docData.ewayBill || "—" },
        { label: "Vehicle No:", val: docData.vehicleNo || "—" },
    ];

    const labelColW = 23.0;
    const valColW = col3W - labelColW;

    infoRows.forEach(row => {
        doc.setFont(fontName, "bold");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.TEXT_SECONDARY);
        doc.text(row.label, col3X, y3);

        const style = row.isBold ? "bold" : "normal";
        doc.setFont(fontName, style);
        doc.setTextColor(...(row.isBold ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY));
        const valLines = doc.splitTextToSize(row.val, valColW);
        doc.text(valLines, col3X + labelColW, y3);

        const rowH = Math.max(valLines.length * 3.6, 4.2);
        y3 += rowH;
    });

    const maxEndY = Math.max(y1, y2, y3);
    return maxEndY + 4.0;
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

        // Priority: Line Item Override -> Product Default -> System Default (true)
        const isItemPkgVisible = item.showPkgDetails !== undefined && item.showPkgDetails !== null
            ? Boolean(item.showPkgDetails)
            : (prod?.showPkgDetails !== undefined && prod?.showPkgDetails !== null
                ? Boolean(prod.showPkgDetails)
                : true);

        const pkgValue = isItemPkgVisible
            ? ((pkgCountStr > 0 && perBox > 0)
                ? `${pkgCountStr} ${pkgType}\nX ${perBox} ${item.unit || prod?.unit || "NOS"}`
                : (pkgCountStr > 0 ? `${pkgCountStr} ${pkgType}` : ""))
            : "";

        const pkgInDesc = (!showPkg && isItemPkgVisible && pkgCountStr > 0) ? `\nNo. & Kind of Pkgs: ${pkgValue}` : "";

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
        1: { halign: "center", cellWidth: 18, fontSize: TABLE_TOKENS.BODY_FONT_SIZE - 1.0, cellPadding: 1, overflow: 'linebreak' },
        2: { halign: "left" },
        3: { halign: "center", cellWidth: 20 },
        4: { halign: "center", cellWidth: 22 },
        5: { halign: "right", cellWidth: 20 },
        6: { halign: "center", cellWidth: 12 },
        7: { halign: "right", cellWidth: 28 },
    } : {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "left" },
        2: { halign: "center", cellWidth: 20 },
        3: { halign: "center", cellWidth: 22 },
        4: { halign: "right", cellWidth: 20 },
        5: { halign: "center", cellWidth: 12 },
        6: { halign: "right", cellWidth: 28 },
    };

    autoTable(doc, {
        startY: startY,
        head: tableHead,
        body: tableBody,
        theme: "plain",
        tableLineWidth: TABLE_TOKENS.TABLE_OUTER_BORDER_WIDTH,
        tableLineColor: TABLE_TOKENS.TABLE_OUTER_BORDER_COLOR,
        styles: {
            font: fontName,
            lineWidth: TABLE_TOKENS.TABLE_INNER_BORDER_WIDTH,
            lineColor: TABLE_TOKENS.TABLE_INNER_BORDER_COLOR,
        },
        headStyles: {
            fillColor: TABLE_TOKENS.TABLE_HEADER_FILL,
            textColor: COLORS.TEXT_PRIMARY,
            fontSize: TABLE_TOKENS.HEADER_FONT_SIZE,
            fontStyle: "bold",
            halign: "center",
            cellPadding: TABLE_TOKENS.HEADER_PADDING,
        },
        bodyStyles: {
            fontSize: TABLE_TOKENS.BODY_FONT_SIZE,
            textColor: COLORS.TEXT_SECONDARY,
            cellPadding: TABLE_TOKENS.CELL_PADDING,
            valign: "middle",
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
    const hsnTableHeight = (hsnBody.length + 1) * 8.0;
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
        tableLineWidth: TABLE_TOKENS.TABLE_OUTER_BORDER_WIDTH,
        tableLineColor: TABLE_TOKENS.TABLE_OUTER_BORDER_COLOR,
        styles: {
            font: fontName,
            lineWidth: TABLE_TOKENS.TABLE_INNER_BORDER_WIDTH,
            lineColor: TABLE_TOKENS.TABLE_INNER_BORDER_COLOR,
        },
        headStyles: {
            fillColor: TABLE_TOKENS.TABLE_HEADER_FILL,
            textColor: COLORS.TEXT_PRIMARY,
            fontSize: TABLE_TOKENS.HEADER_FONT_SIZE,
            fontStyle: "bold",
            halign: "center",
            cellPadding: TABLE_TOKENS.HEADER_PADDING,
        },
        bodyStyles: {
            fontSize: TABLE_TOKENS.BODY_FONT_SIZE,
            textColor: COLORS.TEXT_SECONDARY,
            cellPadding: TABLE_TOKENS.CELL_PADDING,
            halign: "right",
            valign: "middle",
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
export function drawGstDeclaration(
    doc: jsPDF,
    stateName: string,
    startY: number,
    declarationText?: string
): number {
    const dim = getDimensions(doc);
    const fontName = getFontName();

    doc.saveGraphicsState();
    doc.setFont(fontName, "italic");
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(...COLORS.TEXT_MUTED);
    const declText = declarationText || `Declaration: Place of supply is verified as state of ${stateName || "Karnataka"}. Taxes are computed accordingly.`;
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
            label: invoice.isFreightCollect ? "Freight (Collect)" : "Freight / Delivery Charges",
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

    // GRAND TOTAL Value: 14pt Heavy Display Dark
    doc.setFont(fontName, "bold");
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.TEXT_PRIMARY);
    doc.text(formatCurrency(rounded), totalsX, curY, { align: "right" });

    // Double hairline underline under GRAND TOTAL
    const divider2Y = curY + 3.0;
    drawDivider(doc, cardX, divider2Y, blockW, COLORS.BORDER_DARK, BORDERS.HAIRLINE);
    drawDivider(doc, cardX, divider2Y + 0.8, blockW, COLORS.BORDER_DARK, BORDERS.HAIRLINE);

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
 * Draws customer-facing terms & conditions or internal remarks cards with dynamic page-break support.
 */
export function drawRemarksSection(doc: jsPDF, notes: string | null, startY: number, title?: string): number {
    if (!notes || !notes.trim()) return startY;

    const dim = getDimensions(doc);
    const fontName = getFontName();

    const notesText = notes.trim();
    const innerW = dim.usableW - 14;
    const headerTitle = title || "REMARKS / INTERNAL NOTES";

    // Preserve exact paragraph structure and line breaks
    const rawParagraphs = notesText.split(/\r?\n/);
    const wrappedLines: string[] = [];
    doc.setFont(fontName, "normal");
    doc.setFontSize(FONT_SIZES.SMALL);

    for (const para of rawParagraphs) {
        if (para.trim() === "") {
            wrappedLines.push(""); // empty paragraph spacing line
        } else {
            const lines = doc.splitTextToSize(para, innerW);
            wrappedLines.push(...lines);
        }
    }

    const lineHeight = 4.2;
    const headerH = 8.5;
    const totalContentH = headerH + (wrappedLines.length * lineHeight) + 4;

    // Page height bounds check
    const maxY = dim.H - dim.bottomMargin - 40; // reserve space for bank/signature
    const availableH = maxY - startY;

    // If whole card fits on current page
    if (totalContentH <= availableH) {
        const y = checkAndAddPage(doc, startY, totalContentH);
        drawCard(doc, dim.leftMargin, y, dim.usableW, totalContentH);
        drawLeftAccentBar(doc, dim.leftMargin, y, totalContentH);

        doc.saveGraphicsState();
        doc.setFont(fontName, "bold");
        doc.setFontSize(FONT_SIZES.MEDIUM);
        doc.setTextColor(...COLORS.TEXT_SECONDARY);
        doc.text(headerTitle, dim.leftMargin + 6, y + 5.2);

        doc.setFont(fontName, "normal");
        doc.setFontSize(FONT_SIZES.SMALL);
        doc.setTextColor(...COLORS.TEXT_PRIMARY);

        let textY = y + 9.5;
        for (const line of wrappedLines) {
            if (line !== "") {
                doc.text(line, dim.leftMargin + 6, textY);
            }
            textY += lineHeight;
        }
        doc.restoreGraphicsState();

        return y + totalContentH + SPACING.ITEM_GAP;
    }

    // If card doesn't fit on current page, check if starting on a new page allows it to fit
    let y = checkAndAddPage(doc, startY, Math.min(totalContentH, 60));

    // Calculate how many lines fit on this page chunk
    const chunkAvailableH = (dim.H - dim.bottomMargin - 35) - y;
    const maxLinesThisPage = Math.max(2, Math.floor((chunkAvailableH - headerH - 4) / lineHeight));
    const linesThisPage = wrappedLines.slice(0, maxLinesThisPage);
    const remainingLines = wrappedLines.slice(maxLinesThisPage);

    const chunkH = headerH + (linesThisPage.length * lineHeight) + 4;
    drawCard(doc, dim.leftMargin, y, dim.usableW, chunkH);
    drawLeftAccentBar(doc, dim.leftMargin, y, chunkH);

    doc.saveGraphicsState();
    doc.setFont(fontName, "bold");
    doc.setFontSize(FONT_SIZES.MEDIUM);
    doc.setTextColor(...COLORS.TEXT_SECONDARY);
    doc.text(headerTitle, dim.leftMargin + 6, y + 5.2);

    doc.setFont(fontName, "normal");
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(...COLORS.TEXT_PRIMARY);

    let textY = y + 9.5;
    for (const line of linesThisPage) {
        if (line !== "") {
            doc.text(line, dim.leftMargin + 6, textY);
        }
        textY += lineHeight;
    }
    doc.restoreGraphicsState();

    // If remaining lines, continue onto next page
    if (remainingLines.length > 0) {
        doc.addPage();
        let nextY = dim.topMargin;
        const nextBoxH = headerH + (remainingLines.length * lineHeight) + 4;
        drawCard(doc, dim.leftMargin, nextY, dim.usableW, nextBoxH);
        drawLeftAccentBar(doc, dim.leftMargin, nextY, nextBoxH);

        doc.saveGraphicsState();
        doc.setFont(fontName, "bold");
        doc.setFontSize(FONT_SIZES.MEDIUM);
        doc.setTextColor(...COLORS.TEXT_SECONDARY);
        doc.text(`${headerTitle} (CONTINUED)`, dim.leftMargin + 6, nextY + 5.2);

        doc.setFont(fontName, "normal");
        doc.setFontSize(FONT_SIZES.SMALL);
        doc.setTextColor(...COLORS.TEXT_PRIMARY);

        let remTextY = nextY + 9.5;
        for (const line of remainingLines) {
            if (line !== "") {
                doc.text(line, dim.leftMargin + 6, remTextY);
            }
            remTextY += lineHeight;
        }
        doc.restoreGraphicsState();

        return nextY + nextBoxH + SPACING.ITEM_GAP;
    }

    return y + chunkH + SPACING.ITEM_GAP;
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
