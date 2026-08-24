"use client";

import React, { useState } from "react";
import { Modal } from "@/ui/core/Modal";
import { Input } from "@/ui/core/Input";
import { Button } from "@/ui/core/Button";
import { PackagePlus, Tag, Landmark, IndianRupee, Layers, Loader2 } from "lucide-react";
import { createProductAction } from "@/features/inventory/actions/productActions";
import { useToast } from "@/context/ToastContext";
import { Product } from "@/features/inventory/types";

interface QuickProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProductCreated: (product: Product, targetRowId?: string) => void;
    targetRowId?: string;
}

export function QuickProductModal({
    isOpen,
    onClose,
    onProductCreated,
    targetRowId
}: QuickProductModalProps) {
    const { success, error } = useToast();
    const [isPending, setIsPending] = useState(false);
    const [formData, setFormData] = useState({
        description: "",
        sku: "",
        hsn: "",
        sellingRate: "",
        purchaseRate: "0",
        gstRate: "18",
        unit: "NOS",
        pkgType: "BOX",
        qtyPerBox: "0",
        showPkgDetails: false,
        notes: ""
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description.trim()) {
            error("Product description is required.");
            return;
        }

        setIsPending(true);
        try {
            const data = new FormData();
            data.append("description", formData.description.trim());
            if (formData.sku.trim()) data.append("sku", formData.sku.trim().toUpperCase());
            if (formData.hsn.trim()) data.append("hsn", formData.hsn.trim());
            data.append("sellingRate", formData.sellingRate || "0");
            data.append("purchaseRate", formData.purchaseRate || "0");
            data.append("gstRate", formData.gstRate || "18");
            data.append("unit", formData.unit || "NOS");
            data.append("pkgType", formData.pkgType || "BOX");
            data.append("qtyPerBox", formData.qtyPerBox || "0");
            data.append("showPkgDetails", formData.showPkgDetails ? "true" : "false");
            if (formData.notes.trim()) data.append("notes", formData.notes.trim());

            const res: any = await createProductAction(data);
            if (res && "error" in res && res.error) {
                error(res.error);
                return;
            }

            if (res && res.success && res.product) {
                success(`Product "${res.product.description}" cataloged successfully.`);
                onProductCreated(res.product as Product, targetRowId);
                // Reset form
                setFormData({
                    description: "",
                    sku: "",
                    hsn: "",
                    sellingRate: "",
                    purchaseRate: "0",
                    gstRate: "18",
                    unit: "NOS",
                    pkgType: "BOX",
                    qtyPerBox: "0",
                    showPkgDetails: false,
                    notes: ""
                });
                onClose();
            } else {
                error("Failed to create product.");
            }
        } catch (err: any) {
            error(err.message || "An unexpected error occurred.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                        <PackagePlus size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 italic tracking-tight font-display uppercase">Quick Catalog Product</h3>
                        <p className="text-xs text-slate-500 font-medium">Add an item to the catalog and insert into the current line</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Primary Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                label="Item Description / Goods Specification *"
                                placeholder="e.g. Industrial Multi-Stage Pump Assembly"
                                value={formData.description}
                                onChange={e => handleChange("description", e.target.value)}
                                icon={<Tag size={16} />}
                                required
                            />
                        </div>
                        <Input
                            label="SKU / Catalog Code (Optional)"
                            placeholder="PRD-001"
                            value={formData.sku}
                            onChange={e => handleChange("sku", e.target.value)}
                            icon={<Tag size={16} />}
                            className="font-mono uppercase tracking-wider"
                        />
                        <Input
                            label="HSN / SAC Code (Optional)"
                            placeholder="84212190"
                            value={formData.hsn}
                            onChange={e => handleChange("hsn", e.target.value)}
                            icon={<Landmark size={16} />}
                            className="font-mono"
                        />
                    </div>

                    {/* Pricing & GST */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                        <Input
                            label="Selling Rate (₹) *"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={formData.sellingRate}
                            onChange={e => handleChange("sellingRate", e.target.value)}
                            icon={<IndianRupee size={16} />}
                            required
                        />
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">GST Rate (%) *</label>
                            <select
                                className="flex h-12 w-full rounded-2xl border-0 bg-slate-50 px-4 py-2 text-sm font-bold shadow-sm ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-primary-500/20 focus:outline-none hover:ring-slate-300"
                                value={formData.gstRate}
                                onChange={e => handleChange("gstRate", e.target.value)}
                            >
                                <option value="0">0% (Nil)</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Unit of Measure *</label>
                            <select
                                className="flex h-12 w-full rounded-2xl border-0 bg-slate-50 px-4 py-2 text-sm font-bold shadow-sm ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-primary-500/20 focus:outline-none hover:ring-slate-300"
                                value={formData.unit}
                                onChange={e => handleChange("unit", e.target.value)}
                            >
                                <option value="NOS">NOS (Numbers)</option>
                                <option value="SET">SET (Complete Set)</option>
                                <option value="KGS">KGS (Kilograms)</option>
                                <option value="PCS">PCS (Pieces)</option>
                                <option value="BOX">BOX (Boxes)</option>
                                <option value="MTR">MTR (Meters)</option>
                                <option value="PKT">PKT (Packets)</option>
                                <option value="DRM">DRM (Drums)</option>
                                <option value="BAG">BAG (Bags)</option>
                                <option value="UNT">UNT (Units)</option>
                            </select>
                        </div>
                    </div>

                    {/* Packaging Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Package Type (Default)</label>
                            <select
                                className="flex h-12 w-full rounded-2xl border-0 bg-slate-50 px-4 py-2 text-sm font-bold shadow-sm ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-primary-500/20 focus:outline-none hover:ring-slate-300"
                                value={formData.pkgType}
                                onChange={e => handleChange("pkgType", e.target.value)}
                            >
                                <option value="BOX">BOX</option>
                                <option value="BAG">BAG</option>
                                <option value="PKT">PACKET</option>
                                <option value="DRM">DRUM</option>
                                <option value="PCS">PIECES</option>
                                <option value="NOS">NOS</option>
                                <option value="ROLL">ROLL</option>
                                <option value="BDL">BUNDLE</option>
                            </select>
                        </div>
                        <Input
                            label="QTY Per Box / Package (Default)"
                            type="number"
                            step="0.001"
                            min="0"
                            placeholder="0"
                            value={formData.qtyPerBox}
                            onChange={e => handleChange("qtyPerBox", e.target.value)}
                            icon={<Layers size={16} />}
                        />
                    </div>

                    {/* Show Package Details Checkbox */}
                    <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                        <input
                            type="checkbox"
                            id="quick_showPkgDetails"
                            checked={formData.showPkgDetails}
                            onChange={e => handleChange("showPkgDetails", e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                        <label htmlFor="quick_showPkgDetails" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                            Show Package Details in Invoices / Quotations by default
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isPending}
                            className="rounded-xl px-5 h-11"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isPending}
                            className="rounded-xl px-6 h-11 font-black uppercase italic tracking-wider flex items-center gap-2"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Cataloging...
                                </>
                            ) : (
                                <>
                                    <PackagePlus className="w-4 h-4" /> Save & Select Product
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
