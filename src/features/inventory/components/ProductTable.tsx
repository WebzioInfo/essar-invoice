"use client";

import React, { useState, useTransition } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/ui/core/Table";
import {
    Trash2, Loader2, Package, Tag, Landmark, AlertTriangle,
    Edit3, Plus
} from "lucide-react";
import { Button } from "@/ui/core/Button";
import { Card, CardContent } from "@/ui/core/Card";
import { deleteProductAction } from "@/features/inventory/actions/productActions";
import { useToast } from "@/context/ToastContext";
import { formatCurrency } from "@/utils/financials";
import { ProductForm } from "./ProductForm";
import { LiveSearch } from "@/components/common/LiveSearch";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Modal } from "@/ui/core/Modal";

interface Product {
    id: string;
    description: string;
    sku: string | null;
    hsn: string | null;
    purchaseRate: any; // Prisma Decimal
    sellingRate: any; // Prisma Decimal
    gstRate: any; // Prisma Decimal
    unit: string;
    notes?: string | null;
    currentStock: number;
}

interface ProductTableProps {
    products: Product[];
    onSuccess?: () => void;
}

const ProductTableRow = ({
    product,
    onEdit,
    onSuccess,
}: {
    product: Product;
    onEdit: (product: Product) => void;
    onSuccess?: () => void;
}) => {
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);
    const { success, error } = useToast();

    const handleDelete = () => {
        startTransition(async () => {
            const res = await deleteProductAction(product.id);
            if (res && "success" in res) {
                success("Catalog item removed successfully.");
                setShowConfirm(false);
                if (onSuccess) onSuccess();
            } else if (res && "error" in res) {
                error(res.error || "Failed to delete item.");
            }
        });
    };

    return (
        <TableRow className="hover:bg-slate-50/80 transition-all group">
            <TableCell className="px-8 py-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
                        <Package className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-extrabold text-slate-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight truncate">
                            {product.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center px-2 py-0.5 bg-primary-50 rounded-lg text-[9px] font-black text-primary-600 tracking-widest uppercase">
                                {product.unit}
                            </span>
                            {product.sku && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded-lg text-[10px] font-mono font-bold text-slate-500">
                                    <Tag className="w-3 h-3 text-slate-400" /> {product.sku}
                                </span>
                            )}
                            {product.hsn && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded-lg text-[10px] font-mono font-bold text-slate-500">
                                    <Landmark className="w-3 h-3 text-slate-400" /> {product.hsn}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="px-8 py-6">
                <div className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-black text-slate-900 italic tracking-tight tabular-nums">
                        {formatCurrency(Number(product.sellingRate))}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Cost: {formatCurrency(Number(product.purchaseRate))}
                    </span>
                </div>
            </TableCell>
            <TableCell className="px-8 py-6">
                <div className="flex flex-col items-start gap-1">
                    <span className={`text-base font-black italic tabular-nums tracking-tighter ${product.currentStock <= 0 ? "text-rose-600" : "text-slate-900"}`}>
                        {product.currentStock}
                    </span>
                    {product.currentStock <= 0 ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 rounded-lg text-[8px] font-black text-rose-600 uppercase tracking-widest border border-rose-100">
                            <AlertTriangle className="w-2.5 h-2.5" /> OUT OF STOCK
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In Reserve</span>
                    )}
                </div>
            </TableCell>
            <TableCell className="px-8 py-6">
                <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {Number(product.gstRate)}% GST
                    </span>
                </div>
            </TableCell>
            <TableCell className="text-right px-8 py-6">
                <div className="flex items-center justify-end gap-2">
                    {!showConfirm ? (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(product)}
                                className="h-9 w-9 p-0 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl"
                            >
                                <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowConfirm(true)}
                                className="h-9 w-9 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3 rounded-lg text-[10px] font-black uppercase"
                                onClick={() => setShowConfirm(false)}
                                disabled={isPending}
                            >
                                No
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                className="h-8 px-4 rounded-lg text-[10px] font-black uppercase shadow-lg shadow-red-500/20"
                                onClick={handleDelete}
                                disabled={isPending}
                            >
                                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "YES"}
                            </Button>
                        </div>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
};

export function ProductTable({ products, onSuccess }: ProductTableProps) {
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    return (
        <div className="space-y-8 animate-fade-up">
            {/* Unified Modal Overlay */}
            <Modal
                isOpen={!!editingProduct || isAdding}
                onClose={() => {
                    setEditingProduct(null);
                    setIsAdding(false);
                }}
            >
                <ProductForm
                    key={editingProduct?.id || (isAdding ? "new" : "empty")}
                    product={editingProduct || undefined}
                    onSuccess={() => {
                        setEditingProduct(null);
                        setIsAdding(false);
                        if (onSuccess) onSuccess();
                    }}
                    onCancel={() => {
                        setEditingProduct(null);
                        setIsAdding(false);
                    }}
                />
            </Modal>

            {/* ── Search & Filter Controls ── */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200/60 overflow-hidden rounded-[2.5rem] animate-in stagger-2">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <LiveSearch
                            placeholder="Search Products by SKU, HSN, or Description..."
                            className="flex-1 w-full"
                        />

                        <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            onClick={() => setIsAdding(true)}
                            className="w-full sm:w-auto italic shadow-xl shadow-accent-500/20 whitespace-nowrap flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5 mr-1" />
                            <span>Add Product</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ── Product Table Content ── */}
            <ErrorBoundary name="Product Catalog">
                <Card className="border-0 shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-[2.5rem] animate-in stagger-3">
                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-slate-400 bg-slate-50/30">
                            <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-xl shadow-slate-200/50 mb-6">
                                <Package className="w-10 h-10 opacity-20" />
                            </div>
                            <p className="font-black text-slate-900 text-xl italic uppercase tracking-tight">Zero Records Found</p>
                            <p className="text-xs text-slate-500 mt-2 mb-10 font-bold uppercase tracking-widest italic opacity-60">
                                Begin by creating your first product in the inventory
                            </p>
                            <Button
                                variant="primary"
                                size="lg"
                                className="italic px-8"
                                onClick={() => setIsAdding(true)}
                            >
                                <Plus className="w-5 h-5 mr-1" />
                                Add First Product
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="w-full">
                                <TableHeader className="bg-slate-900">
                                    <TableRow>
                                        <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Product & Identifiers</TableHead>
                                        <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pricing & Rates</TableHead>
                                        <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Stock Reserve</TableHead>
                                        <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tax Bracket</TableHead>
                                        <TableHead className="text-right px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Execution</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100">
                                    {products.map((product) => (
                                        <ProductTableRow
                                            key={product.id}
                                            product={product}
                                            onEdit={setEditingProduct}
                                            onSuccess={onSuccess}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </Card>
            </ErrorBoundary>
        </div>
    );
}
