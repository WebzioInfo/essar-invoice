"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VendorTable } from "@/features/procurement/components/VendorTable";
import apiClient from "@/lib/apiClient";
import { TableSkeleton } from "@/ui/core/Skeleton";
import { toast } from "sonner";

export default function VendorsPage() {
    const searchParams = useSearchParams();
    const query = searchParams.get("q") || "";

    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get(`/api/vendors/list${query ? `?q=${query}` : ""}`);
                setVendors(res.data);
            } catch (error: any) {
                toast.error("Failed to sync vendor directory.");
            } finally {
                setLoading(false);
            }
        };
        fetchVendors();
    }, [query]);

    if (loading && vendors.length === 0) return <div className="p-8"><TableSkeleton /></div>;

    return (
        <div className="space-y-8 animate-fade-up pb-20">
            <VendorTable vendors={vendors} />
        </div>
    );
}
