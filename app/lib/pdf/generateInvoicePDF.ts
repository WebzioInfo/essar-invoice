//generateInvoicePDF.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { numberToWords } from "../utils/numberToWords";
import { formatDateDMY } from "../utils/date";
import { COMPANY } from "@/app/data/company";
import { Invoice } from "@/app/types/invoice";

export async function generateInvoicePDF(invoice: Invoice) {
    const doc = new jsPDF();

    /* LOGO */
    const logo = await fetch("/logo.png").then(r => r.blob()).then(b => URL.createObjectURL(b));
    doc.addImage(logo, "PNG", 10, 16, 40, 16);

    /* COMPANY HEADER */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ESSAR ENTERPRISES", 56, 16);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
        `SITE NO.9, SEEGAHALLI VILLAGE
KR PURAM HOBLI, BANGALORE - 560049
GSTIN: 29AOPPM7487J1ZV
Mobile: +91 85531 85300
Email: essarwater.info@gmail.com`,
        56, 22
    );

    doc.line(10, 45, 200, 45);

    /* INVOICE INFO */
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoice.invoiceNo}`, 10, 52);
    doc.text(`Date: ${formatDateDMY(invoice.date)}`, 150, 52);

    /* TRANSPORT DETAILS (OPTIONAL) */
    let transportY = 58;

    doc.setFontSize(9);

    if (invoice.logistics?.ewayBill) {
        doc.text(`E-Way Bill No: ${invoice.logistics?.ewayBill}`, 10, transportY);
        transportY += 5;
    }

    if (invoice.logistics?.vehicleNo) {
        doc.text(`Vehicle No: ${invoice.logistics?.vehicleNo}`, 10, transportY);
        transportY += 5;
    }

    if (invoice.logistics?.dispatchedThrough) {
        doc.text(`Dispatched Through: ${invoice.logistics?.dispatchedThrough}`, 10, transportY);
    }


    const ship = invoice.sameAsBilling ? invoice.billing : invoice.shipping;

    /* BILLING / SHIPPING */
    const addressStartY = transportY + 6;

    doc.setFont("helvetica", "bold");
    doc.text("Billing To:", 10, addressStartY);
    doc.text("Ship To:", 110, addressStartY +1);


    /* BILLING ADDRESS */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(invoice.billing.name, 10, addressStartY + 5);

    doc.setFont("helvetica", "normal");
    doc.text(
        `${invoice.billing.address1}
${invoice.billing.address2}
${invoice.gstType !== "nogst" && invoice.billing.gst
            ? `GSTIN: ${invoice.billing.gst}`
            : ""}
Phone: ${invoice.billing.phone}
State: ${invoice.billing.state}
`,
        10,
        addressStartY + 10
    );


    /* SHIPPING ADDRESS */
    doc.setFont("helvetica", "bold");
    doc.text(ship.name, 110, addressStartY + 5);

    doc.setFont("helvetica", "normal");
    doc.text(
        `${ship.address1}
${ship.address2}
State: ${ship.state}`,
        110,
        addressStartY + 10
    );


    /* PRODUCT TABLE */

    const showGST = invoice.gstType !== "nogst";

    const tableHead = showGST
        ? ["Sl", "Description of Goods", "HSN", "Qty", "Rate", "GST %", "Amount"]
        : ["Sl", "Description of Goods", "HSN", "Qty", "Rate", "Amount"];


    const tableBody = invoice.products.map((p, i) => {
        const amount = p.qty * p.rate;

        return showGST
            ? [
                i + 1,
                p.description,
                p.hsn,
                p.qty,
                `Rs. ${p.rate.toFixed(2)}`,
                `${p.gst}%`,
                `Rs. ${amount.toFixed(2)}`
            ]
            : [
                i + 1,
                p.description,
                p.hsn,
                p.qty,
                `Rs. ${p.rate.toFixed(2)}`,
                `Rs. ${amount.toFixed(2)}`
            ];
    });


    autoTable(doc, {
        startY: 105,
        head: [tableHead],
        body: tableBody,
        styles: { fontSize: 9, valign: "middle", halign: "center" },
        headStyles: { fillColor: [40, 40, 40], textColor: 255, valign: "middle" },
        columnStyles: {
            1: { halign: "left" },
            4: { halign: "right" },
            6: { halign: "right" }
        }
    });

    /* CALCULATIONS */
    const subTotal = invoice.products.reduce((s, p) => s + p.qty * p.rate, 0);
    const gstTotal =
        invoice.gstType === "nogst"
            ? 0
            : invoice.products.reduce(
                (s, p) => s + (p.qty * p.rate * p.gst) / 100,
                0
            );


    let cgst = 0, sgst = 0, igst = 0;
    if (invoice.gstType === "cgst") { cgst = gstTotal / 2; sgst = gstTotal / 2; }
    if (invoice.gstType === "igst") { igst = gstTotal; }

    const gross = subTotal + gstTotal;
    const rounded = Math.round(gross);
    const roundOff = rounded - gross;

    const y = (doc as any).lastAutoTable.finalY + 8;

    /* TOTALS */
    doc.setFontSize(10);
    doc.text("Subtotal", 130, y);
    doc.text(`Rs. ${subTotal.toFixed(2)}`, 195, y, { align: "right" });

    if (cgst) {
        doc.text("CGST", 130, y + 6);
        doc.text(`Rs. ${cgst.toFixed(2)}`, 195, y + 6, { align: "right" });
        doc.text("SGST", 130, y + 12);
        doc.text(`Rs. ${sgst.toFixed(2)}`, 195, y + 12, { align: "right" });
    }
    if (igst) {
        doc.text("IGST", 130, y + 6);
        doc.text(`Rs. ${igst.toFixed(2)}`, 195, y + 6, { align: "right" });
    }

    doc.text("Round Off", 130, y + 18);
    doc.text(`Rs. ${roundOff.toFixed(2)}`, 195, y + 18, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text("GRAND TOTAL", 130, y + 28);
    doc.text(`Rs. ${rounded.toFixed(2)}`, 195, y + 28, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Amount in Words: ${numberToWords(rounded)}`, 10, y + 41);

    /* BANK */
    /* BANK DETAILS SECTION */
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Bank Details", 10, y + 50);

    doc.setFont("helvetica", "normal");

    const bankY = y + 57;
    const labelX = 10;
    const valueX = 30;

    doc.text("A/C Name", labelX, bankY);
    doc.text(": ESSAR ENTERPRISES", valueX, bankY);

    doc.text("Bank", labelX, bankY + 6);
    doc.text(": FEDERAL BANK", valueX, bankY + 6);

    doc.text("Branch", labelX, bankY + 12);
    doc.text(": DOMMASANDRA", valueX, bankY + 12);

    doc.text("A/C No", labelX, bankY + 18);
    doc.text(": 21650200003173", valueX, bankY + 18);

    doc.text("IFSC", labelX, bankY + 24);
    doc.text(": FDRL0002165", valueX, bankY + 24);

    /* SIGNATURE */
    /* SIGNATURE SECTION */
    doc.setFont("helvetica", "bold");
    doc.text("For ESSAR ENTERPRISES", 150, bankY + 5);

    // const seal = await fetch("/sealdemo.png")
    //   .then(r => r.blob())
    //   .then(b => URL.createObjectURL(b));

    // doc.addImage(seal, "PNG", 148, bankY , 36, 35);

    doc.setFont("helvetica", "normal");
    doc.text("Authorised Signatory", 150, bankY + 22);

    doc.save(`Invoice-${invoice.invoiceNo}.pdf`);
}
