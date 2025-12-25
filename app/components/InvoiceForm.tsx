"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useState } from "react";

/* ---------- TYPES ---------- */
type Product = {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  gst: number;
};

/* ---------- NUMBER TO WORDS ---------- */
const numberToWords = (num: number): string => {
  if (num === 0) return "Zero Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six",
    "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
    "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty",
    "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  const convertBelowThousand = (n: number): string => {
    let str = "";

    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }

    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }

    if (n > 0) {
      str += ones[n] + " ";
    }

    return str.trim();
  };

  let result = "";
  let crore = Math.floor(num / 10000000);
  let lakh = Math.floor((num % 10000000) / 100000);
  let thousand = Math.floor((num % 100000) / 1000);
  let remainder = num % 1000;

  if (crore > 0) result += convertBelowThousand(crore) + " Crore ";
  if (lakh > 0) result += convertBelowThousand(lakh) + " Lakh ";
  if (thousand > 0) result += convertBelowThousand(thousand) + " Thousand ";
  if (remainder > 0) result += convertBelowThousand(remainder);

  return result.trim() + " Only";
};


/* ---------- COMPONENT ---------- */
export default function InvoiceGenerator() {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [gstType, setGstType] = useState("cgst");
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [invoiceDate, setInvoiceDate] = useState(today);


  const [billing, setBilling] = useState({
    name: "",
    address1: "",
    address2: "",
    gst: "",
    phone: "",
    state: "",
  });

  const [shipping, setShipping] = useState({
    name: "",
    address1: "",
    address2: "",
    state: "",
  });

  const [logistics, setLogistics] = useState({
  ewayBill: "",
  vehicleNo: "",
  dispatchedThrough: "",
});


  const [products, setProducts] = useState<Product[]>([
    { description: "", hsn: "", qty: 1, rate: 0, gst: 18 },
  ]);

  const formatDateDMY = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};


  const addProduct = () =>
    setProducts([...products, { description: "", hsn: "", qty: 1, rate: 0, gst: 18 }]);

  /* ---------- PDF ---------- */
  const generatePDF = async () => {
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
    doc.text(`Invoice No: ${invoiceNo}`, 10, 52);
    doc.text(`Date: ${formatDateDMY(invoiceDate)}`, 150, 52);

    /* TRANSPORT DETAILS (OPTIONAL) */
let transportY = 58;

doc.setFontSize(9);

if (logistics.ewayBill) {
  doc.text(`E-Way Bill No: ${logistics.ewayBill}`, 10, transportY);
  transportY += 5;
}

if (logistics.vehicleNo) {
  doc.text(`Vehicle No: ${logistics.vehicleNo}`, 10, transportY);
  transportY += 5;
}

if (logistics.dispatchedThrough) {
  doc.text(`Dispatched Through: ${logistics.dispatchedThrough}`, 10, transportY);
}


    const ship = sameAsBilling ? billing : shipping;

    /* BILLING / SHIPPING */
    const addressStartY = transportY + 6;

doc.setFont("helvetica", "bold");
doc.text("Billing To:", 10, addressStartY);
doc.text("Ship To:", 110, addressStartY);


/* BILLING ADDRESS */
doc.setFont("helvetica", "bold");
doc.setFontSize(9);
doc.text(billing.name, 10, addressStartY + 5);

doc.setFont("helvetica", "normal");
doc.text(
`${billing.address1}
${billing.address2}
GSTIN: ${billing.gst}
Phone: ${billing.phone}
State: ${billing.state}`,
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
    const tableBody = products.map((p, i) => {
      const amount = p.qty * p.rate;
      return [
        i + 1,
        p.description,
        p.hsn,
        p.qty,
        `Rs. ${p.rate.toFixed(2)}`,
        `${p.gst}%`,
        `Rs. ${amount.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: 105,
      head: [["Sl", "Description of Goods", "HSN", "Qty", "Rate", "GST %", "Amount"]],
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
    const subTotal = products.reduce((s, p) => s + p.qty * p.rate, 0);
    const gstTotal = products.reduce((s, p) => s + (p.qty * p.rate * p.gst) / 100, 0);

    let cgst = 0, sgst = 0, igst = 0;
    if (gstType === "cgst") { cgst = gstTotal / 2; sgst = gstTotal / 2; }
    if (gstType === "igst") { igst = gstTotal; }

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
    const valueX = 40;

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

    const seal = await fetch("/sealdemo.png")
      .then(r => r.blob())
      .then(b => URL.createObjectURL(b));
    
    doc.addImage(seal, "PNG", 148, bankY , 36, 35);

    doc.setFont("helvetica", "normal");
    doc.text("Authorised Signatory", 150, bankY + 22);

    doc.save(`Invoice-${invoiceNo}.pdf`);
  };

  /* ---------- UI ---------- */
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow space-y-4">
      <h1 className="text-xl font-bold">ESSAR Invoice Generator</h1>

      <input className="border p-2 w-full" placeholder="Invoice No" onChange={e => setInvoiceNo(e.target.value)} />

      <input
  type="date"
  className="border p-2 w-full"
  value={invoiceDate}
  onChange={e => setInvoiceDate(e.target.value)}
/>
<p className="text-sm text-gray-500">
  Selected Date: {formatDateDMY(invoiceDate)}
</p>

      <select className="border p-2 w-full" onChange={e => setGstType(e.target.value)}>
        <option value="cgst">CGST + SGST</option>
        <option value="igst">IGST</option>
        <option value="nogst">No GST</option>
      </select>

<h2 className="font-semibold">Transport / Logistics (Optional)</h2>

<input
  className="border p-2 w-full"
  placeholder="E-Way Bill No"
  onChange={e => setLogistics({ ...logistics, ewayBill: e.target.value })}
/>

<input
  className="border p-2 w-full"
  placeholder="Vehicle No"
  onChange={e => setLogistics({ ...logistics, vehicleNo: e.target.value })}
/>

<input
  className="border p-2 w-full"
  placeholder="Dispatched Through (Transporter Name)"
  onChange={e => setLogistics({ ...logistics, dispatchedThrough: e.target.value })}
/>

      <h2 className="font-semibold">Billing Details</h2>
      {Object.keys(billing).map(k => (
        <input key={k} className="border p-2 w-full" placeholder={k.toUpperCase()}
          onChange={e => setBilling({ ...billing, [k]: e.target.value })} />
      ))}

      <label className="flex gap-2">
        <input type="checkbox" onChange={e => setSameAsBilling(e.target.checked)} />
        Ship To same as Billing
      </label>

      {!sameAsBilling && (
        <>
          <h2 className="font-semibold">Shipping Details</h2>
          {Object.keys(shipping).map(k => (
            <input key={k} className="border p-2 w-full" placeholder={k.toUpperCase()}
              onChange={e => setShipping({ ...shipping, [k]: e.target.value })} />
          ))}
        </>
      )}

      <h2 className="font-semibold">Products</h2>
      {products.map((p, i) => (
        <div key={i} className="grid grid-cols-6 gap-2">
          <input className="border p-1" placeholder="Description" onChange={e => p.description = e.target.value} />
          <input className="border p-1" placeholder="HSN" onChange={e => p.hsn = e.target.value} />
          <input type="number" className="border p-1" placeholder="Qty" onChange={e => p.qty = +e.target.value} />
          <input type="number" className="border p-1" placeholder="Rate" onChange={e => p.rate = +e.target.value} />
          <input type="number" className="border p-1" placeholder="GST %" onChange={e => p.gst = +e.target.value} />
        </div>
      ))}

      <button onClick={addProduct} className="border px-3 py-1">+ Add Product</button>

      <button onClick={generatePDF} className="bg-blue-600 text-white px-4 py-2 w-full">
        Generate Invoice PDF
      </button>
    </div>
  );
}
