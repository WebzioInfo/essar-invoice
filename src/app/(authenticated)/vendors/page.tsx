"use client";

import React, { useEffect, useState } from "react";
import { VendorTable } from "@/features/procurement/components/VendorTable";
import { Building2 } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { TableSkeleton } from "@/ui/core/Skeleton";
import { toast } from "sonner";

export default function VendorsPage() {
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get("/api/vendors/list");
                setVendors(res.data);
            } catch (error: any) {
                toast.error("Failed to sync vendor directory.");
            } finally {
                setLoading(false);
            }
        };
        fetchVendors();
    }, []);

    if (loading && vendors.length === 0) return <div className="p-8"><TableSkeleton /></div>;

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20">
            {/* Page Header (Informational) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="max-w-2xl">
                    <h1 className="text-5xl font-black tracking-tight text-slate-900 font-display italic">
                        Supply <span className="text-primary-600">Chain</span>
                    </h1>
                    <p className="text-slate-500 mt-4 text-lg font-medium leading-relaxed italic uppercase tracking-tighter">
                        Enterprise-grade directory for managing vendor identities, inward procurement, and input taxation endpoints.
                    </p>
                </div>

                <div className="hidden lg:flex items-center gap-6 bg-white px-8 py-6 rounded-[2.5rem] border border-slate-200/40 shadow-2xl transition-all hover:border-primary-100/50">
                    <div className="w-16 h-16 bg-primary-50 rounded-3xl flex items-center justify-center shadow-inner">
                        <Building2 className="h-8 w-8 text-primary-600" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Supplier Density</div>
                        <div className="text-3xl font-black text-slate-900 leading-none tracking-tighter italic">{vendors.length} <span className="text-sm font-bold text-slate-300 not-italic uppercase tracking-widest ml-1">Nodes</span></div>
                    </div>
                </div>
            </div>

            {/* Main Listing Area */}
            <div className="w-full">
                <VendorTable vendors={vendors} />
            </div>
        </div>
    );
}
