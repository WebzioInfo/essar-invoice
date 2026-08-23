"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClientTable } from "@/features/clients/components/ClientTable";
import apiClient from "@/lib/apiClient";
import { TableSkeleton } from "@/ui/core/Skeleton";
import { toast } from "sonner";

export default function ClientsPage() {
    const searchParams = useSearchParams();
    const query = searchParams.get("q") || "";

    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get(`/api/clients/list?q=${query}`);
                setClients(res.data);
            } catch (error: any) {
                toast.error("Failed to sync client directory.");
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, [query]);

    if (loading && clients.length === 0) return <div className="p-8"><TableSkeleton /></div>;

    return (
        <div className="space-y-8 animate-fade-up pb-20">
            <ClientTable clients={clients} />
        </div>
    );
}
