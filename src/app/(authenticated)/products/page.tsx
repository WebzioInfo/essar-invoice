"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductTable } from "@/features/inventory/components/ProductTable";
import apiClient from "@/lib/apiClient";
import { TableSkeleton } from "@/ui/core/Skeleton";
import { toast } from "sonner";

export default function ProductsPage() {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("q") || "";

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const refresh = () => setRefreshTrigger(prev => prev + 1);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get(`/api/products/list?q=${searchQuery}`);
                setProducts(res.data);
            } catch (error: any) {
                toast.error("Failed to sync inventory master.");
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [searchQuery, refreshTrigger]);

    if (loading && products.length === 0) return <div className="p-8"><TableSkeleton /></div>;

    return (
        <div className="space-y-8 animate-fade-up pb-20">
            <ProductTable products={products} onSuccess={refresh} />
        </div>
    );
}
