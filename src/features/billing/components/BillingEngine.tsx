"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Client } from "@/features/clients/types";
import { Product } from "@/features/inventory/types";
import { Button } from "@/ui/core/Button";
import { formatCurrency } from "@/utils/financials";
import { CheckCircle2, AlertCircle, ClipboardList, ArrowRight, Zap, Truck, FileText, CheckSquare, Square } from "lucide-react";
import { cn } from "@/utils";
import { useTransactionStore, useTransactionTotals } from "@/lib/store/transactionStore";
import { InvoiceDetailsCard } from "./InvoiceDetailsCard";
import { TransactionTable } from "@/ui/core/TransactionTable";
import { Card } from "@/ui/core/Card";
import { createInvoiceAction, updateInvoiceAction } from "@/features/billing/actions/billing";
import { createQuotationAction, updateQuotationAction } from "@/features/billing/actions/quotations";
import { QuickClientModal } from "@/features/clients/components/QuickClientModal";
import { QuickProductModal } from "@/features/inventory/components/QuickProductModal";

import { determinePlaceOfSupplyState, determineGstType } from "@/utils/gst";

interface BillingEngineProps {
    clients: Client[];
    products: Product[];
    mode?: "INVOICE" | "QUOTATION";
    initialData?: any;
}

export function BillingEngine({ clients, products, mode = "INVOICE", initialData }: BillingEngineProps) {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [enableFreight, setEnableFreight] = useState(false);
    const initialLoadedRef = useRef(false);

    // Dynamic state for clients and products supporting quick-create
    const [clientsList, setClientsList] = useState<Client[]>(clients);
    const [productsList, setProductsList] = useState<Product[]>(products);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [targetRowIdForProduct, setTargetRowIdForProduct] = useState<string | undefined>(undefined);

    useEffect(() => {
        setClientsList(clients);
    }, [clients]);

    useEffect(() => {
        setProductsList(products);
    }, [products]);

    const store = useTransactionStore();
    const totals = useTransactionTotals();

    const handleClientCreated = (newClient: Client) => {
        setClientsList(prev => [newClient, ...prev]);
        store.setEntityId(newClient.id);
        const address = {
            name: newClient.name,
            address1: newClient.address1,
            address2: newClient.address2 || "",
            state: newClient.state,
            pinCode: newClient.pinCode || "",
            phone: newClient.phone || "",
            gst: newClient.gst || ""
        };
        store.setField("billingAddress", address);
        if (store.shippingSameAsBilling) {
            store.setField("shippingAddress", address);
        }
        const posState = determinePlaceOfSupplyState({
            billingAddress: address,
            shippingAddress: store.shippingSameAsBilling ? address : store.shippingAddress,
            shippingSameAsBilling: store.shippingSameAsBilling,
            client: newClient
        });
        store.setField("gstType", determineGstType(posState));
    };

    const handleOpenQuickProduct = (targetRowId?: string) => {
        setTargetRowIdForProduct(targetRowId);
        setIsProductModalOpen(true);
    };

    const handleProductCreated = (newProduct: Product, targetRowId?: string) => {
        setProductsList(prev => [newProduct, ...prev]);
        if (targetRowId) {
            store.updateItem(targetRowId, {
                productId: newProduct.id,
                description: newProduct.description,
                hsn: newProduct.hsn || "",
                rate: Number(newProduct.sellingRate || newProduct.purchaseRate || 0),
                taxPercent: Number(newProduct.gstRate || 18),
                unit: newProduct.unit || "NOS",
                pkgType: newProduct.pkgType || "BOX",
                qtyPerBox: Number(newProduct.qtyPerBox || 0),
                showPkgDetails: newProduct.showPkgDetails !== undefined ? newProduct.showPkgDetails : true
            });
        } else if (store.items.length > 0) {
            const lastItem = store.items[store.items.length - 1];
            store.updateItem(lastItem.id, {
                productId: newProduct.id,
                description: newProduct.description,
                hsn: newProduct.hsn || "",
                rate: Number(newProduct.sellingRate || newProduct.purchaseRate || 0),
                taxPercent: Number(newProduct.gstRate || 18),
                unit: newProduct.unit || "NOS",
                pkgType: newProduct.pkgType || "BOX",
                qtyPerBox: Number(newProduct.qtyPerBox || 0),
                showPkgDetails: newProduct.showPkgDetails !== undefined ? newProduct.showPkgDetails : true
            });
        }
    };

    // Initialize store
    useEffect(() => {
        store.reset();
        store.setMode(mode);
        if (initialData) {
            store.initialize({ ...initialData, mode });
            initialLoadedRef.current = true;
            if (Number(initialData.freightAmount || 0) > 0 || initialData.isFreightCollect) {
                setEnableFreight(true);
            }
        } else {
            initialLoadedRef.current = false;
            setEnableFreight(false);
        }

        // AI Resell Workflow: Handle data from Procurement Page
        if (typeof window !== "undefined") {
            const resellData = sessionStorage.getItem("essar_resell_pack");
            if (resellData) {
                try {
                    const data = JSON.parse(resellData);
                    store.initialize({ ...data, mode: "INVOICE" });
                    sessionStorage.removeItem("essar_resell_pack");
                } catch (e) {
                    console.error("Failed to parse essar_resell_pack", e);
                }
            }
        }
    }, [mode, initialData]);

    // Auto-populate addresses when client changes (skipping initial edit load so saved snapshots are kept)
    useEffect(() => {
        if (!store.entityId) return;

        // If this is initialData load, do not overwrite snapshot addresses or saved gstType
        if (initialLoadedRef.current && initialData && initialData.clientId === store.entityId) {
            initialLoadedRef.current = false;
            return;
        }

        const client = clients.find(c => c.id === store.entityId);
        if (client) {
            const address = {
                name: client.name,
                address1: client.address1,
                address2: client.address2 || "",
                state: client.state,
                pinCode: client.pinCode || "",
                phone: client.phone || "",
                gst: client.gst || ""
            };
            store.setField("billingAddress", address);
            if (store.shippingSameAsBilling) {
                store.setField("shippingAddress", address);
            }

            // Automated GST Selection based on Place of Supply
            const posState = determinePlaceOfSupplyState({
                billingAddress: address,
                shippingAddress: store.shippingSameAsBilling ? address : store.shippingAddress,
                shippingSameAsBilling: store.shippingSameAsBilling,
                client
            });
            store.setField("gstType", determineGstType(posState));
        }
    }, [store.entityId, clients, store.shippingSameAsBilling]);

    // Re-evaluate GST type whenever the place of supply state changes in the address form
    const currentBillingState = store.billingAddress?.state;
    const currentShippingState = store.shippingAddress?.state;
    const isSameAsBilling = store.shippingSameAsBilling;

    useEffect(() => {
        // Skip on initial load so historical saved gstType is preserved
        if (initialLoadedRef.current) return;
        if (!store.entityId) return;

        const posState = determinePlaceOfSupplyState({
            billingAddress: store.billingAddress,
            shippingAddress: store.shippingAddress,
            shippingSameAsBilling: isSameAsBilling
        });
        const targetGst = determineGstType(posState);
        if (store.gstType !== targetGst && store.gstType !== "NONE") {
            store.setField("gstType", targetGst);
        }
    }, [currentBillingState, currentShippingState, isSameAsBilling, store.entityId]);

    const handleSubmit = async () => {
        setError(null);
        if (!store.entityId) {
            setError("Please select a client to proceed.");
            return;
        }
        if (store.items.length === 0) {
            setError("Add at least one item to the document.");
            return;
        }

        setIsPending(true);
        try {
            const effectiveFreight = enableFreight ? (store.freightAmount || 0) : 0;
            const effectiveFreightTax = enableFreight ? (store.freightTaxPercent || 0) : 0;

            const payload = {
                clientId: store.entityId,
                date: store.date,
                gstType: store.gstType,
                subTotal: totals.subTotal,
                taxTotal: totals.taxTotal,
                grandTotal: totals.grandTotal,
                invoiceNo: store.invoiceNo || undefined,
                quotationNo: store.invoiceNo || undefined,
                notes: store.notes ? store.notes.trim() : undefined,
                items: store.items,
                billingAddress: store.billingAddress,
                shippingAddress: store.shippingSameAsBilling ? store.billingAddress : store.shippingAddress,
                shippingSameAsBilling: store.shippingSameAsBilling,
                ...(mode === "INVOICE" && {
                    ewayBill: store.ewayBill || undefined,
                    ewayBillUrl: store.ewayBillUrl || undefined,
                    vehicleNo: store.vehicleNo || undefined,
                }),
                ...(mode === "QUOTATION" && {
                    validUntil: store.validUntil || undefined,
                }),
                isFreightCollect: enableFreight ? store.isFreightCollect : false,
                freightAmount: effectiveFreight,
                freightTaxPercent: effectiveFreightTax,
            };

            const isEditing = Boolean(initialData?.id);
            const res = isEditing
                ? (mode === "QUOTATION" 
                    ? await updateQuotationAction(initialData.id, payload)
                    : await updateInvoiceAction(initialData.id, payload))
                : (mode === "QUOTATION" 
                    ? await createQuotationAction(payload)
                    : await createInvoiceAction(payload));

            if ("error" in res) {
                setError(res.error as string);
            } else if (res.success) {
                const targetId = (res as any).quotationId || (res as any).invoiceId || initialData?.id;
                const path = mode === "QUOTATION" ? "/quotations" : "/invoices";
                router.push(`${path}/${targetId}`);
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsPending(false);
        }
    };

    const itemsSubTotal = totals.subTotal - (enableFreight ? (store.freightAmount || 0) : 0);

    return (
        <div className="space-y-12 max-w-7xl mx-auto pb-32">
            {/* Error Notifications */}
            {error && (
                <div className="flex items-start gap-3 rounded-4xl bg-red-50 p-6 text-sm text-red-700 border border-red-100 shadow-xl shadow-red-500/5 animate-in fade-in slide-in-from-top-4">
                    <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                    <div className="space-y-1">
                        <p className="font-black uppercase tracking-[0.2em] text-[10px] text-red-400">System Validation Error</p>
                        <p className="font-bold opacity-80">{error}</p>
                    </div>
                </div>
            )}

            {/* Step 1: Core Details */}
            <InvoiceDetailsCard
                clients={clientsList}
                onOpenQuickClient={() => setIsClientModalOpen(true)}
            />

            {/* Step 2: Line Items */}
            <TransactionTable
                products={productsList}
                onOpenQuickProduct={handleOpenQuickProduct}
            />

            {/* Step 3: Terms & Conditions / Commercial Notes */}
            <Card className="border-0 shadow-lg ring-1 ring-slate-200 overflow-hidden rounded-3xl bg-white">
                <div className="p-8 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner",
                                mode === "QUOTATION" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-700"
                            )}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 italic">
                                    {mode === "QUOTATION" ? "Terms & Conditions" : "Invoice Notes & Remarks"}
                                </h4>
                                <p className="text-xs text-slate-400 font-medium italic">
                                    {mode === "QUOTATION" 
                                        ? "Optional commercial terms, validity, warranty, delivery schedule or exclusions for this proposal."
                                        : "Optional customer-facing notes, terms of payment, or remarks."}
                                </p>
                            </div>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 self-start sm:self-auto">
                            Optional
                        </span>
                    </div>

                    <div className="space-y-2 pt-1">
                        <textarea
                            rows={4}
                            className="w-full rounded-2xl border-0 bg-slate-50 p-4 text-sm font-medium text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 placeholder:italic leading-relaxed resize-y"
                            placeholder={mode === "QUOTATION"
                                ? "Enter payment terms, delivery conditions, validity, warranty, exclusions or any other quotation-specific terms..."
                                : "Enter custom remarks, payment terms, or customer notes..."}
                            value={store.notes}
                            onChange={e => store.setField("notes", e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Step 4: Summaries & Global Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-4">

                {/* Totals & Submit */}
                <div className="lg:col-span-12 w-full">
                    <Card className="border-0 shadow-3xl ring-1 ring-slate-900/5 bg-white p-10 overflow-hidden rounded-[3rem]">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Financial Summary</h4>
                            <div className="flex h-3 w-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" />
                        </div>

                        <div className="space-y-6">
                            {/* Items Subtotal */}
                            <div className="flex justify-between items-center text-sm font-black text-slate-400">
                                <span className="uppercase tracking-[0.2em] text-[10px]">Supplied Items Subtotal</span>
                                <span className="tabular-nums text-slate-900 italic transform transition-all group-hover:scale-110">{formatCurrency(itemsSubTotal)}</span>
                            </div>

                            {/* Optional Freight Control Section */}
                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between gap-4 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextState = !enableFreight;
                                            setEnableFreight(nextState);
                                            if (!nextState) {
                                                store.setField("freightAmount", 0);
                                                store.setField("isFreightCollect", false);
                                            }
                                        }}
                                        className="flex items-center gap-2.5 group cursor-pointer"
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-lg border flex items-center justify-center transition-all",
                                            enableFreight ? "bg-primary-600 border-primary-600 text-white" : "bg-white border-slate-300 group-hover:border-slate-400"
                                        )}>
                                            {enableFreight ? <CheckSquare className="w-3.5 h-3.5" /> : null}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-4 h-4 text-slate-500" />
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-700">
                                                Freight / Delivery Charges
                                            </span>
                                        </div>
                                    </button>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                                        Optional
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium italic ml-7 mb-4">
                                    Enter delivery, transportation or freight charges for this {mode === "QUOTATION" ? "quotation" : "invoice"}.
                                </p>

                                {enableFreight && (
                                    <div className="ml-7 p-5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                    Freight Amount (excl. GST) ₹
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        className="w-full h-11 rounded-2xl border-0 bg-white pl-8 pr-4 text-right text-sm font-black text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:bg-white focus:outline-none transition-all tabular-nums"
                                                        value={store.freightAmount || ""}
                                                        onChange={e => store.setField("freightAmount", Math.max(0, parseFloat(e.target.value) || 0))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                    Applicable GST %
                                                </label>
                                                <select
                                                    className="w-full h-11 rounded-2xl border-0 bg-white px-4 text-sm font-black text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:bg-white focus:outline-none transition-all appearance-none"
                                                    value={store.freightTaxPercent || 0}
                                                    onChange={e => store.setField("freightTaxPercent", parseFloat(e.target.value) || 0)}
                                                >
                                                    {[0, 5, 12, 18, 28].map(v => <option key={v} value={v}>{v}% GST</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {(store.freightAmount || 0) > 0 && (
                                            <div className="flex justify-between items-center text-[11px] font-black text-slate-600 bg-white rounded-xl px-4 py-2.5 border border-slate-100">
                                                <span className="uppercase tracking-widest text-[9px] text-slate-400">Freight incl. GST</span>
                                                <span className="text-slate-900 tabular-nums">
                                                    {formatCurrency((store.freightAmount || 0) * (1 + (store.freightTaxPercent || 0) / 100))}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Tax Summary */}
                            <div className="flex justify-between items-center text-sm font-black text-slate-400 pt-2 border-t border-slate-100">
                                <span className="uppercase tracking-[0.2em] text-[10px]">Tax Contribution (GST)</span>
                                <span className="tabular-nums text-primary-600 italic">{formatCurrency(totals.taxTotal)}</span>
                            </div>

                            {/* Tax Breakdown */}
                            {totals.taxTotal > 0 && (
                                <div className="pl-4 space-y-1 border-l-2 border-slate-100 animate-in fade-in slide-in-from-left-2 duration-500">
                                    {store.gstType === "CGST_SGST" ? (
                                        <>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 italic">
                                                <span>CGST (Central)</span>
                                                <span>{formatCurrency(totals.taxTotal / 2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 italic">
                                                <span>SGST (State)</span>
                                                <span>{formatCurrency(totals.taxTotal / 2)}</span>
                                            </div>
                                        </>
                                    ) : store.gstType === "IGST" ? (
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 italic">
                                            <span>IGST (Integrated)</span>
                                            <span>{formatCurrency(totals.taxTotal)}</span>
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {/* Grand Total */}
                            <div className="pt-8 border-t border-slate-100 mt-6 relative">
                                <div className="flex justify-between items-end mb-10">
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary-600 italic">
                                            {mode === "QUOTATION" ? "Estimated Total" : "Total Payable"}
                                        </p>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter opacity-60 italic">INR (₹) Final Value</p>
                                    </div>
                                    <p className="text-6xl font-black tracking-tighter text-slate-900 italic animate-reveal">
                                        {formatCurrency(totals.grandTotal)}
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-20 w-20 flex-none rounded-3xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all group"
                                        onClick={() => router.back()}
                                        disabled={isPending}
                                    >
                                        <Zap className="w-6 h-6 rotate-180 group-hover:scale-125 transition-transform" />
                                    </Button>
                                    <Button
                                        className="flex-1 h-20 w-full text-2xl font-black gap-4 rounded-4xl shadow-3xl transition-all uppercase italic tracking-widest bg-primary-600 text-white hover:bg-primary-700 active:scale-95 group/submit overflow-hidden"
                                        onClick={handleSubmit}
                                        loading={isPending}
                                        variant="primary"
                                        disabled={isPending || store.items.length === 0 || !store.entityId}
                                    >
                                        <div className="group/submit absolute w-full inset-0 bg-linear-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover/submit:translate-x-full transition-transform duration-1000" />
                                        {initialData?.id ? (
                                            <><CheckCircle2 className="w-8 h-8" /> Update</>
                                        ) : mode === "QUOTATION" ? (
                                            <><ClipboardList className="w-8 h-8" /> Commit Proposal</>
                                        ) : (
                                            <><CheckCircle2 className="w-8 h-8" /> Deploy Invoice</>
                                        )}
                                        <ArrowRight size={24} className="ml-2 group-hover/submit:translate-x-2 transition-transform" />
                                    </Button>
                                </div>

                                <p className="text-center text-[9px] text-slate-300 mt-8 leading-relaxed font-black uppercase tracking-[0.5em] italic">
                                    Transaction Engine Secure Node v5
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Quick Creation Modals */}
            <QuickClientModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onClientCreated={handleClientCreated}
            />

            <QuickProductModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onProductCreated={handleProductCreated}
                targetRowId={targetRowIdForProduct}
            />
        </div>
    );
}
