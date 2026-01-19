import { formatDateDMY } from '@/app/lib/utils/date';
import { numberToWords } from '@/app/lib/utils/numberToWords';
import { Invoice } from '@/app/types/invoice';
import React from 'react';


interface Props {
  invoice: Invoice;
}


export default function InvoicePreview({ invoice }: Props) {
  const showGST = invoice.gstType !== "nogst";

  const subTotal = invoice.products.reduce(
    (s, p) => s + p.qty * p.rate,
    0
  );

  const gstTotal = showGST
    ? invoice.products.reduce(
        (s, p) => s + (p.qty * p.rate * p.gst) / 100,
        0
      )
    : 0;

  let cgst = 0,
    sgst = 0,
    igst = 0;

  if (invoice.gstType === "cgst") {
    cgst = gstTotal / 2;
    sgst = gstTotal / 2;
  }

  if (invoice.gstType === "igst") {
    igst = gstTotal;
  }

  const gross = subTotal + gstTotal;
  const rounded = Math.round(gross);
  const roundOff = rounded - gross;

  const ship = invoice.sameAsBilling ? invoice.billing : invoice.shipping;

  return (
    <div className="bg-white p-8 text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER WITH LOGO */}
      <div className="flex items-start gap-4 mb-6">
        <img 
          src="/logo.png" 
          alt="Company Logo" 
          className="w-32 h-16 object-contain"
        />
        <div>
          <h2 className="text-xl font-bold mb-1">ESSAR ENTERPRISES</h2>
          <p className="text-xs leading-relaxed">
            SITE NO.9, SEEGAHALLI VILLAGE<br />
            KR PURAM HOBLI, BANGALORE - 560049<br />
            GSTIN: 29AOPPM7487J1ZV<br />
            Mobile: +91 85531 85300<br />
            Email: essarwater.info@gmail.com
          </p>
        </div>
      </div>

      <div className="border-t-2 border-gray-800 mb-4"></div>

      {/* INVOICE INFO */}
      <div className="flex justify-between mb-4 text-xs">
        <div><strong>Invoice No:</strong> {invoice.invoiceNo}</div>
        <div><strong>Date:</strong> {formatDateDMY(invoice.date)}</div>
      </div>

      {/* TRANSPORT DETAILS */}
      {(invoice.logistics?.ewayBill || invoice.logistics?.vehicleNo || invoice.logistics?.dispatchedThrough) && (
        <div className="mb-4 text-xs space-y-1">
          {invoice.logistics?.ewayBill && (
            <div>E-Way Bill No: {invoice.logistics.ewayBill}</div>
          )}
          {invoice.logistics?.vehicleNo && (
            <div>Vehicle No: {invoice.logistics.vehicleNo}</div>
          )}
          {invoice.logistics?.dispatchedThrough && (
            <div>Dispatched Through: {invoice.logistics.dispatchedThrough}</div>
          )}
        </div>
      )}

      {/* ADDRESSES */}
      <div className="grid grid-cols-2 gap-8 mb-6 text-xs">
        <div>
          <h3 className="font-bold mb-2">Billing To:</h3>
          <div className="font-bold mb-1">{invoice.billing.name}</div>
          <p className="leading-relaxed">
            {invoice.billing.address1}<br />
            {invoice.billing.address2}<br />
            {showGST && invoice.billing.gst && (
              <>GSTIN: {invoice.billing.gst}<br /></>
            )}
            Phone: {invoice.billing.phone}<br />
            State: {invoice.billing.state}
          </p>
        </div>

        <div>
          <h3 className="font-bold mb-2">Ship To:</h3>
          <div className="font-bold mb-1">{ship.name}</div>
          <p className="leading-relaxed">
            {ship.address1}<br />
            {ship.address2}<br />
            State: {ship.state}
          </p>
        </div>
      </div>

      {/* PRODUCT TABLE */}
      <table className="w-full border-collapse mb-6 text-xs">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-800 p-2 text-center">Sl</th>
            <th className="border border-gray-800 p-2 text-left">Description of Goods</th>
            <th className="border border-gray-800 p-2 text-center">HSN</th>
            <th className="border border-gray-800 p-2 text-center">Qty</th>
            <th className="border border-gray-800 p-2 text-right">Rate</th>
            {showGST && <th className="border border-gray-800 p-2 text-center">GST %</th>}
            <th className="border border-gray-800 p-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.products.map((p, i) => (
            <tr key={i} className="border">
              <td className="border border-gray-300 p-2 text-center">{i + 1}</td>
              <td className="border border-gray-300 p-2">{p.description}</td>
              <td className="border border-gray-300 p-2 text-center">{p.hsn}</td>
              <td className="border border-gray-300 p-2 text-center">{p.qty}</td>
              <td className="border border-gray-300 p-2 text-right">Rs. {p.rate.toFixed(2)}</td>
              {showGST && (
                <td className="border border-gray-300 p-2 text-center">{p.gst}%</td>
              )}
              <td className="border border-gray-300 p-2 text-right">
                Rs. {(p.qty * p.rate).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTALS */}
      <div className="flex justify-end mb-6">
        <div className="w-64 text-xs space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Rs. {subTotal.toFixed(2)}</span>
          </div>

          {cgst > 0 && (
            <>
              <div className="flex justify-between">
                <span>CGST</span>
                <span>Rs. {cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST</span>
                <span>Rs. {sgst.toFixed(2)}</span>
              </div>
            </>
          )}

          {igst > 0 && (
            <div className="flex justify-between">
              <span>IGST</span>
              <span>Rs. {igst.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Round Off</span>
            <span>Rs. {roundOff.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-bold text-sm border-t pt-2">
            <span>GRAND TOTAL</span>
            <span>Rs. {rounded.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* AMOUNT IN WORDS */}
      <p className="text-xs mb-6">
        <strong>Amount in Words:</strong> {numberToWords(rounded)}
      </p>

      {/* BANK DETAILS & SIGNATURE */}
      <div className="grid grid-cols-2 gap-8 text-xs">
        <div>
          <h3 className="font-bold mb-3">Bank Details</h3>
          <div className="space-y-1">
            <div className="flex">
              <span className="w-20">A/C Name</span>
              <span>: ESSAR ENTERPRISES</span>
            </div>
            <div className="flex">
              <span className="w-20">Bank</span>
              <span>: FEDERAL BANK</span>
            </div>
            <div className="flex">
              <span className="w-20">Branch</span>
              <span>: DOMMASANDRA</span>
            </div>
            <div className="flex">
              <span className="w-20">A/C No</span>
              <span>: 21650200003173</span>
            </div>
            <div className="flex">
              <span className="w-20">IFSC</span>
              <span>: FDRL0002165</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="font-bold mb-2">For ESSAR ENTERPRISES</div>
          <div className="h-24 flex items-center justify-center">
            {/* Seal/Signature space */}
          </div>
          <div className="mt-2">Authorised Signatory</div>
        </div>
      </div>
    </div>
  );
}
