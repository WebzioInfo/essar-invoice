import { db } from "@/db/prisma/client";
import { verifySessionCookie } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/utils/financials";
import {
  ArrowLeft, CheckCircle2,
  Clock, Building2, Phone, MapPin,
  Hash, Calendar, Truck, CreditCard,
  ShieldCheck, ArrowUpRight, Landmark, Info, AlertCircle
} from "lucide-react";
import { InvoiceActions, StatusBadge, PDFPreview } from "@/features/billing/components";
import { cn } from "@/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

function StatSmall({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn(
      "p-4 rounded-3xl border border-slate-100 shadow-sm",
      highlight ? "bg-red-50 ring-1 ring-red-200" : "bg-white"
    )}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 whitespace-nowrap">{label}</p>
      <p className={cn(
        "text-sm font-black italic",
        highlight ? "text-red-700" : "text-slate-900"
      )}>{value}</p>
    </div>
  );
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const session = await verifySessionCookie();
  if (!session) redirect("/login");

  const { id } = await params;

  // Use findFirst because deletingAt: null is not a unique constraint field,
  // which causes findUnique to lose type inference for relations in some Prisma versions.
  const invoice = await db.invoice.findFirst({
    where: { id },
    select: {
      id: true,
      invoiceNo: true,
      deletedAt: true,
      date: true,
      gstType: true,
      subTotal: true,
      taxTotal: true,
      grandTotal: true,
      status: true,
      ewayBill: true,
      vehicleNo: true,
      dispatchedThrough: true,
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
      shippingSameAsBilling: true,
      client: true,
      lineItems: { orderBy: { id: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });

  if (!invoice) notFound();

  const grandTotal = invoice.grandTotal.toNumber();
  const totalPaid = invoice.payments.reduce((sum: number, p: any) => sum + p.amount.toNumber(), 0);
  const balanceDue = grandTotal - totalPaid;

  return (
    <div className="space-y-8 animate-fade-up max-w-6xl mx-auto pb-24">
      {/* ── Back + Actions Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <Link
          href="/invoices"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-all font-black uppercase tracking-widest group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Exit to Terminal
        </Link>
        
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} isDeleted={!!invoice.deletedAt} />
      </div>

      {invoice.deletedAt && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem] flex items-center gap-4 text-red-900 shadow-xl shadow-red-500/5 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="font-black uppercase tracking-tight italic">Document archived in Trash</p>
            <p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-widest">
              This invoice was moved to trash on {new Intl.DateTimeFormat("en-IN", { dateStyle: 'full', timeStyle: 'short' }).format(new Date(invoice.deletedAt))}. Restore it to enable further operations.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
         {/* ── PDF Document Preview ── */}
         <div className="card border-0 shadow-2xl ring-1 ring-slate-900/5 p-0 overflow-hidden rounded-4xl bg-slate-100/50">
            <PDFPreview invoiceId={id} />
         </div>

         {/* ── Quick Stats Footer (Optional but helpful) ── */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatSmall label="Status" value={<StatusBadge status={invoice.status} />} />
            <StatSmall label="Total Amount" value={formatCurrency(grandTotal)} />
            <StatSmall label="Amount Paid" value={formatCurrency(totalPaid)} />
            <StatSmall label="Balance Due" value={formatCurrency(balanceDue)} highlight={balanceDue > 0} />
         </div>
      </div>
    </div>
  );
}
