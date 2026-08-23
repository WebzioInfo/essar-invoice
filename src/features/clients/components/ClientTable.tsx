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
    Mail, Trash2, Loader2, Building2, UserMinus, AlertTriangle,
    Edit3, MapPin, Phone, ShieldCheck, Plus, UserPlus
} from "lucide-react";
import { Button } from "@/ui/core/Button";
import { Card, CardContent } from "@/ui/core/Card";
import { deleteClientAction } from "@/features/clients/actions/clientActions";
import { useToast } from "@/context/ToastContext";
import { ClientForm } from "./ClientForm";
import { LiveSearch } from "@/components/common/LiveSearch";
import type { Client } from "@/features/clients/types";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Modal } from "@/ui/core/Modal";

interface ClientTableProps {
    clients: Client[];
}

const ClientTableRow = ({ client, onEdit }: { client: Client; onEdit: (client: Client) => void }) => {
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);
    const { success, error } = useToast();

    const handleDelete = () => {
        startTransition(async () => {
            const res = await deleteClientAction(client.id);
            if (res && "success" in res) {
                success("Client removed from directory successfully.");
                setShowConfirm(false);
            } else if (res && "error" in res) {
                error(res.error || "Failed to delete client.");
            } else {
                error("Failed to delete client.");
            }
        });
    };

    return (
        <TableRow className="hover:bg-slate-50/80 transition-all group">
            <TableCell className="px-8 py-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
                        <Building2 className="w-5 h-5 text-slate-400 group-hover:text-primary-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-extrabold text-slate-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight truncate">
                            {client.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            ID: {client.id.slice(-8)}
                        </p>
                    </div>
                </div>
            </TableCell>
            <TableCell className="px-8 py-6">
                <div className="flex flex-col gap-1">
                    {client.email ? (
                        <span className="flex items-center gap-1.5 text-xs text-slate-700 font-bold group-hover:text-slate-900 transition-colors">
                            <Mail className="h-3.5 w-3.5 text-primary-500 shrink-0" /> {client.email}
                        </span>
                    ) : (
                        <span className="text-slate-300 italic text-[10px] font-bold uppercase tracking-widest">No Email</span>
                    )}
                    {client.phone && (
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold tracking-wider">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" /> {client.phone}
                        </span>
                    )}
                </div>
            </TableCell>
            <TableCell className="px-8 py-6">
                <div className="flex flex-col gap-1">
                    {client.gst ? (
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-[10px] font-black tracking-wider shadow-sm w-fit">
                            {client.gst}
                        </span>
                    ) : (
                        <span className="text-slate-300 italic text-xs font-bold uppercase tracking-wider">Unregistered</span>
                    )}
                </div>
            </TableCell>
            <TableCell className="px-8 py-6">
                <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary-50 text-primary-700 border border-primary-100">
                        {client.state}
                    </span>
                    {client.pinCode && (
                        <span className="text-[10px] font-bold text-slate-400 ml-1 tracking-wider">PIN {client.pinCode}</span>
                    )}
                </div>
            </TableCell>
            <TableCell className="text-right px-8 py-6">
                <div className="flex items-center justify-end gap-2">
                    {!showConfirm ? (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(client)}
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

export function ClientTable({ clients }: ClientTableProps) {
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    return (
        <div className="space-y-8 animate-fade-up">
            {/* Unified Modal Overlay */}
            <Modal
                isOpen={!!editingClient || isAdding}
                onClose={() => {
                    setEditingClient(null);
                    setIsAdding(false);
                }}
            >
                <ClientForm
                    client={editingClient || undefined}
                    onSuccess={() => {
                        setEditingClient(null);
                        setIsAdding(false);
                    }}
                    onCancel={() => {
                        setEditingClient(null);
                        setIsAdding(false);
                    }}
                />
            </Modal>

            {/* ── Search & Filter Controls ── */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200/60 overflow-hidden rounded-[2.5rem] animate-in stagger-2">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <LiveSearch
                            placeholder="Search by Client Name, Email, Phone, GST..."
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
                            <span>Add Client</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ── Client Table Content ── */}
            <ErrorBoundary name="Client Directory">
                <Card className="border-0 shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-[2.5rem] animate-in stagger-3">
                    {clients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-slate-400 bg-slate-50/30">
                            <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-xl shadow-slate-200/50 mb-6">
                                <Building2 className="w-10 h-10 opacity-20" />
                            </div>
                            <p className="font-black text-slate-900 text-xl italic uppercase tracking-tight">Zero Records Found</p>
                            <p className="text-xs text-slate-500 mt-2 mb-10 font-bold uppercase tracking-widest italic opacity-60">
                                Begin by onboarding your first client
                            </p>
                            <Button
                                variant="primary"
                                size="lg"
                                className="italic px-8"
                                onClick={() => setIsAdding(true)}
                            >
                                <Plus className="w-5 h-5 mr-1" />
                                Add First Client
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="w-full">
                                <TableHeader className="bg-slate-900">
                                    <TableRow>
                                        <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Legal Identity</TableHead>
                                        <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Communications</TableHead>
                                        <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tax Code (GSTIN)</TableHead>
                                        <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Location</TableHead>
                                        <TableHead className="text-right px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Execution</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100">
                                    {clients.map((client) => (
                                        <ClientTableRow
                                            key={client.id}
                                            client={client}
                                            onEdit={setEditingClient}
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
