import { verifySessionCookie } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { BillingEngine } from "@/features/billing/components/BillingEngine";
import { ClientService } from "@/features/clients/services/ClientService";
import { ProductService } from "@/features/inventory/services/ProductService";
import { db } from "@/db/prisma/client";
import { serializePrisma } from "@/utils/serialization";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditQuotationPage({ params }: PageProps) {
    const session = await verifySessionCookie();
    if (!session) redirect("/login");

    const { id } = await params;

    const quotation = await db.quotation.findUnique({
        where: { id, deletedAt: null },
        include: {
            client: true,
            lineItems: {
                orderBy: { id: "asc" },
                include: { product: true }
            }
        }
    });

    if (!quotation) notFound();

    if (quotation.status === "CONVERTED") {
        redirect(`/quotations/${id}?error=Cannot edit a converted quotation`);
    }

    const [clients, products] = await Promise.all([
        ClientService.getAllActive(),
        ProductService.getAllActive()
    ]);

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <Link 
                        href={`/quotations/${quotation.id}`}
                        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary-600 transition-colors mb-2"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Proposal Details
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 italic uppercase">
                        Edit Proposal <span className="text-primary-600">#{quotation.quotationNo}</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Modify the details, items, or pricing of this commercial proposal. Changes will update immediately after saving.
                    </p>
                </div>
            </div>

            <BillingEngine 
                clients={clients} 
                products={products} 
                mode="QUOTATION"
                initialData={serializePrisma(quotation)} 
            />
        </div>
    );
}
