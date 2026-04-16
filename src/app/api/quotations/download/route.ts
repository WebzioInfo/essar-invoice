import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import { db } from "@/db/prisma/client";
import { numberToWords } from "@/utils/financials";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

// Helpers for consistent layout
const LEFT_MARGIN = 15;
const RIGHT_MARGIN = 15;
const TEXT_GRAY = [80, 80, 80] as [number, number, number];
const TEXT_BLACK = [0, 0, 0] as [number, number, number];

function fmt(n: number) {
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date | string | null) {
    if (!d) return "N/A";
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(d));
}

export async function POST(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { quotationId } = body;

        if (!quotationId) {
            return NextResponse.json({ error: "quotationId is required" }, { status: 400 });
        }

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
                client: true,
                lineItems: {
                    orderBy: { id: "asc" }
                },
            },
        });

        if (!quotation) {
            return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
        }

        const settings = await db.companySetting.findFirst() || {
            companyName: "ESSAR ENTERPRISES",
            gstin: "29AOPPM7487J1ZV",
            address1: "SITE NO.9, SEEGAHALLI VILLAGE",
            address2: "KR PURAM HOBLI",
            city: "BANGALORE",
            pincode: "560049",
            state: "Karnataka"
        };

        const gstType = quotation.gstType || "CGST_SGST";
        const subTotal = quotation.subTotal.toNumber();
        const taxVal = quotation.taxTotal.toNumber();
        let cgst = 0, sgst = 0, igst = 0;
        if (gstType === "CGST_SGST") {
            cgst = taxVal / 2;
            sgst = taxVal / 2;
        } else {
            igst = taxVal;
        }
        const grandTotalRaw = quotation.grandTotal.toNumber();
        const rounded = Math.round(grandTotalRaw);
        const roundOff = rounded - grandTotalRaw;

        // Init PDF
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const W = doc.internal.pageSize.getWidth();
        let y = 15;

        // --- LOGO & HEADER ---
        try {
            const logoPath = path.join(process.cwd(), "public", "logo.png");
            if (fs.existsSync(logoPath)) {
                const logoBase64 = fs.readFileSync(logoPath).toString("base64");
                doc.addImage(`data:image/png;base64,${logoBase64}`, "PNG", LEFT_MARGIN, 12, 40, 20);
            }
        } catch (err) {}

        const headerX = 58;
        doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...TEXT_BLACK);
        doc.text(settings.companyName.toUpperCase(), headerX, 16);
        doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...TEXT_GRAY);
        doc.text([
            `${settings.address1}, ${settings.address2 || ""}`,
            `${settings.city} - ${settings.pincode}, ${settings.state.toUpperCase()}`,
            `GSTIN: ${settings.gstin}`
        ], headerX, 20);

        doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(...TEXT_BLACK);
        doc.text("QUOTATION", W - RIGHT_MARGIN, 20, { align: "right" });

        doc.setDrawColor(220, 220, 220).line(LEFT_MARGIN, 42, W - RIGHT_MARGIN, 42);
        y = 50;

        // --- INFO & ADDRESSES ---
        let infoY = y;
        const infoX = W - RIGHT_MARGIN;
        doc.setFont("helvetica", "bold").setFontSize(9).text("Quotation No:", infoX - 50);
        doc.setFont("helvetica", "normal").text(quotation.quotationNo, infoX, infoY, { align: "right" });
        infoY += 6;
        doc.setFont("helvetica", "bold").text("Date:", infoX - 50);
        doc.setFont("helvetica", "normal").text(fmtDate(quotation.date), infoX, infoY, { align: "right" });
        infoY += 6;
        if (quotation.validUntil) {
            doc.setFont("helvetica", "bold").text("Valid Until:", infoX - 50);
            doc.setFont("helvetica", "normal").text(fmtDate(quotation.validUntil), infoX, infoY, { align: "right" });
            infoY += 6;
        }

        doc.setFont("helvetica", "bold").setFontSize(9).text("BILL TO", LEFT_MARGIN, y);
        const bill = {
            name: quotation.billingName || quotation.client?.name,
            address1: quotation.billingAddress1 || quotation.client?.address1,
            address2: quotation.billingAddress2 || quotation.client?.address2,
            pinCode: quotation.billingPinCode || quotation.client?.pinCode,
            gst: quotation.billingGst || quotation.client?.gst
        };
        let bY = y + 6;
        doc.setFont("helvetica", "bold").setFontSize(10).text(bill.name || "N/A", LEFT_MARGIN, bY); bY += 5;
        doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...TEXT_GRAY);
        if (bill.address1) { doc.text(bill.address1, LEFT_MARGIN, bY); bY += 4.5; }
        if (bill.address2 || bill.pinCode) { doc.text(`${bill.address2 || ""}${bill.address2 && bill.pinCode ? ", " : ""}${bill.pinCode || ""}`, LEFT_MARGIN, bY); bY += 4.5; }
        if (bill.gst) { doc.text(`GSTIN: ${bill.gst}`, LEFT_MARGIN, bY); bY += 4.5; }

        y = Math.max(infoY, bY) + 10;

        // --- LINE ITEMS ---
        const tableBody = quotation.lineItems.map((item: any, i: number) => [
            String(i + 1),
            item.description.toUpperCase(),
            item.hsn || "-",
            `${item.qty} ${item.unit || "NOS"}`,
            fmt(item.rate.toNumber()),
            item.unit || "NOS",
            fmt(item.qty * item.rate.toNumber())
        ]);

        autoTable(doc, {
            startY: y,
            head: [["Sl No", "Description", "HSN", "Quantity", "Rate", "per", "Amount"]],
            body: tableBody,
            theme: "grid",
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8, halign: "center" },
            bodyStyles: { fontSize: 7.5, halign: "right" },
            columnStyles: { 0: { halign: "center", cellWidth: 10 }, 1: { halign: "left" } },
            margin: { left: LEFT_MARGIN, right: RIGHT_MARGIN }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 10;

        // --- TOTALS ---
        const drawTotal = (label: string, val: string, isBold = false) => {
            doc.setFont("helvetica", isBold ? "bold" : "normal").setFontSize(isBold ? 11 : 9).setTextColor(...TEXT_BLACK);
            doc.text(label, W - RIGHT_MARGIN - 60, y);
            doc.text(val, W - RIGHT_MARGIN, y, { align: "right" });
            y += 6;
        };

        drawTotal("Sub-Total:", fmt(subTotal));
        if (cgst > 0) drawTotal("CGST:", fmt(cgst));
        if (sgst > 0) drawTotal("SGST:", fmt(sgst));
        if (igst > 0) drawTotal("IGST:", fmt(igst));
        if (Math.abs(roundOff) > 0) drawTotal("Round Off:", (roundOff > 0 ? "+" : "") + fmt(roundOff));
        y += 2;
        drawTotal("GRAND TOTAL:", `Rs. ${fmt(rounded)}`, true);

        // Footer
        y += 20;
        doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...TEXT_GRAY);
        doc.text("Notes/Terms:", LEFT_MARGIN, y);
        y += 5;
        doc.text(quotation.notes || "Standard terms apply.", LEFT_MARGIN, y, { maxWidth: W - 30 });

        const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

        // Naming logic consistent with user request: JEZZY_01_ESSAR.pdf
        const billingName = quotation.billingName || quotation.client?.name || "CLIENT";
        const firstName = billingName.split(" ")[0].toUpperCase().replace(/[^A-Z0-9]/g, "");
        const quoParts = quotation.quotationNo.split("-");
        const lastNo = quoParts[quoParts.length - 1] || "00";
        const safeFileName = `${firstName}_${lastNo}_ESSAR.pdf`;

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${safeFileName}"`,
                "Content-Length": String(pdfBuffer.length),
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
