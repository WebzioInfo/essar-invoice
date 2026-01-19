"use client"
import { Address } from '@/app/types/invoice';
import { FileText, User, Package, Truck, Download, CheckCircle } from 'lucide-react';
import ClientSelector from './ClientSelector';
import BillingForm from './BillingForm';
import ShippingForm from './ShippingForm';
import LogisticsForm from './LogisticsForm';
import ProductTable from './ProductTable';
import { generateInvoicePDF } from '@/app/lib/pdf/generateInvoicePDF';
import InvoicePreview from './InvoicePreview';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const emptyAddress: Address = {
  name: "",
  gst: "",
  phone: "",
  address1: "",
  address2: "",
  state: ""
};

export default function InvoiceForm() {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState("");
  const [gstType, setGstType] = useState<"cgst" | "igst" | "nogst">("cgst");
  const [products, setProducts] = useState([
    { description: "", hsn: "", qty: 1, rate: 0, gst: 18 }
  ]);

  const [billing, setBilling] = useState<Address>({ ...emptyAddress });
  const [shipping, setShipping] = useState<Address>({ ...emptyAddress });
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const [logistics, setLogistics] = useState({});

  const handleSameAsBilling = (checked: boolean) => {
    setSameAsBilling(checked);
    if (checked) {
      setShipping({
        name: billing.name,
        address1: billing.address1,
        address2: billing.address2,
        state: billing.state
      } as Address);
    }
  };

  useEffect(() => {
    if (billing.state && billing.state !== "Karnataka") {
      setGstType("igst");
    } else {
      setGstType("cgst");
    }
  }, [billing.state]);

  const invoice = {
    invoiceNo,
    date,
    gstType,
    billing,
    shipping,
    logistics,
    products
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto p-4 md:p-12">

        {/* HEADER */}
<div className="mb-10 border-b border-gray-200 pb-6">
  <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-4">

    {/* LEFT : LOGO + TITLE */}
    <div className="flex items-center gap-2">
      <Image
        src="/logopro.png"
        alt="Webzio International"
        width={220}
        height={20}
        priority
      />

      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Billing Software
        </h1>
        <p className="text-sm text-gray-500">
          A Webzio International Digital Billing Suite
        </p>
      </div>
    </div>

    {/* RIGHT : BRAND */}
    <div className="text-sm text-gray-500">
      Powered by{" "}
      <a
        href="https://www.webziointernational.in"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-gray-700 hover:underline"
      >
        Webzio International
      </a>
    </div>

  </div>
</div>


        <div className="space-y-6">


          {/* LEFT : FORM */}
          <div className="space-y-6">

            {/* INVOICE META */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Invoice Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Invoice No"
                    onChange={e => setInvoiceNo(e.target.value)}
                  />
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">
                    Invoice Number
                  </label>
                </div>

                <div className="relative">
                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    type="date"
                    onChange={e => setDate(e.target.value)}
                  />
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">
                    Date
                  </label>
                </div>

                <div className="relative">
                  <select
                    className="w-full appearance-none border border-gray-300 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white cursor-pointer"
                    value={gstType}
                    onChange={e => setGstType(e.target.value as any)}
                  >
                    <option value="cgst">CGST + SGST</option>
                    <option value="igst">IGST</option>
                    <option value="nogst">No GST</option>
                  </select>
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">
                    GST Type
                  </label>
                </div>
              </div>
            </div>

            {/* CLIENT */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Client Selection
                </h2>
              </div>

              <ClientSelector onSelect={(c: any) => {
                const filled = {
                  name: c.name,
                  gst: c.gst,
                  phone: c.phone,
                  address1: c.address1,
                  address2: c.address2,
                  state: c.state
                };
                setBilling(filled);
                if (sameAsBilling) setShipping(filled);
              }} />
            </div>

            {/* BILLING */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Billing Information
                </h2>
              </div>
              <BillingForm billing={billing} setBilling={setBilling} />
            </div>

            {/* SHIPPING */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Shipping Information
                </h2>
              </div>

              <div className="flex items-center gap-3 mb-5 p-3 bg-green-50 rounded-lg border border-green-200">
                <input
                  type="checkbox"
                  id="sameAsBilling"
                  checked={sameAsBilling}
                  onChange={e => handleSameAsBilling(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <label htmlFor="sameAsBilling" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Shipping same as Billing
                </label>
              </div>

              <ShippingForm shipping={shipping} setShipping={setShipping} />
            </div>

            {/* LOGISTICS */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-teal-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Logistics Information
                </h2>
              </div>
              <LogisticsForm logistics={logistics} setLogistics={setLogistics} />
            </div>

            {/* PRODUCTS */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Products
                </h2>
              </div>
              <ProductTable
                products={products}
                setProducts={setProducts}
                gstType={gstType}
              />
            </div>

            {/* GENERATE BUTTON */}
            <button
              className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all text-white p-4 rounded-xl font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-3 group"
              onClick={() => generateInvoicePDF(invoice)}
            >
              <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Generate Invoice PDF
            </button>


          </div>

          {/* RIGHT : PREVIEW */}
          <div
            className="transition-all duration-500 ease-in-out overflow-hidden "
          >
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live Invoice Preview
              </h2>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 overflow-auto">
                <InvoicePreview invoice={invoice} />
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}