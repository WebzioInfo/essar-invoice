"use client";

import React, { useState } from "react";
import { Modal } from "@/ui/core/Modal";
import { Input } from "@/ui/core/Input";
import { Button } from "@/ui/core/Button";
import { Building2, UserPlus, MapPin, Mail, Phone, Hash, Loader2 } from "lucide-react";
import { createClientAction } from "@/features/clients/actions/clientActions";
import { useToast } from "@/context/ToastContext";
import { Client } from "@/features/clients/types";
import { INDIAN_STATES } from "@/utils/gst";

interface QuickClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClientCreated: (client: Client) => void;
}

export function QuickClientModal({ isOpen, onClose, onClientCreated }: QuickClientModalProps) {
    const { success, error } = useToast();
    const [isPending, setIsPending] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        gst: "",
        email: "",
        phone: "",
        address1: "",
        address2: "",
        state: "Karnataka",
        pinCode: ""
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            error("Client name is required.");
            return;
        }
        if (!formData.address1.trim()) {
            error("Address Line 1 is required.");
            return;
        }
        if (!formData.state.trim()) {
            error("State is required.");
            return;
        }

        setIsPending(true);
        try {
            const data = new FormData();
            data.append("name", formData.name.trim());
            if (formData.gst.trim()) data.append("gst", formData.gst.trim().toUpperCase());
            if (formData.email.trim()) data.append("email", formData.email.trim());
            if (formData.phone.trim()) data.append("phone", formData.phone.trim());
            data.append("address1", formData.address1.trim());
            if (formData.address2.trim()) data.append("address2", formData.address2.trim());
            data.append("state", formData.state.trim());
            if (formData.pinCode.trim()) data.append("pinCode", formData.pinCode.trim());

            const res: any = await createClientAction(data);
            if (res && "error" in res && res.error) {
                error(res.error);
                return;
            }

            if (res && res.success && res.client) {
                success(`Client "${res.client.name}" registered successfully.`);
                onClientCreated(res.client as Client);
                // Reset form
                setFormData({
                    name: "",
                    gst: "",
                    email: "",
                    phone: "",
                    address1: "",
                    address2: "",
                    state: "Karnataka",
                    pinCode: ""
                });
                onClose();
            } else {
                error("Failed to create client.");
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
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100 shadow-sm">
                        <UserPlus size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 italic tracking-tight font-display uppercase">Quick Register Client</h3>
                        <p className="text-xs text-slate-500 font-medium">Add a new party without leaving the transaction</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Primary Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                label="Client / Company Name *"
                                placeholder="e.g. Varuna Aqua Products"
                                value={formData.name}
                                onChange={e => handleChange("name", e.target.value)}
                                icon={<Building2 size={16} />}
                                required
                            />
                        </div>
                        <Input
                            label="GSTIN (Optional)"
                            placeholder="29AAAAA0000A1Z5"
                            value={formData.gst}
                            onChange={e => handleChange("gst", e.target.value)}
                            icon={<Hash size={16} />}
                            className="font-mono uppercase tracking-wider"
                        />
                        <Input
                            label="Phone Number (Optional)"
                            placeholder="+91 98765 43210"
                            value={formData.phone}
                            onChange={e => handleChange("phone", e.target.value)}
                            icon={<Phone size={16} />}
                        />
                        <div className="md:col-span-2">
                            <Input
                                label="Email Address (Optional)"
                                type="email"
                                placeholder="billing@client.com"
                                value={formData.email}
                                onChange={e => handleChange("email", e.target.value)}
                                icon={<Mail size={16} />}
                            />
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="space-y-4 pt-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Billing Address Details
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Input
                                    label="Address Line 1 *"
                                    placeholder="Street address, building, or plot number"
                                    value={formData.address1}
                                    onChange={e => handleChange("address1", e.target.value)}
                                    icon={<MapPin size={16} />}
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Input
                                    label="Address Line 2 (Optional)"
                                    placeholder="Area, landmark, or industrial zone"
                                    value={formData.address2}
                                    onChange={e => handleChange("address2", e.target.value)}
                                    icon={<MapPin size={16} />}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">State *</label>
                                <select
                                    className="flex h-12 w-full rounded-2xl border-0 bg-slate-50 px-4 py-2 text-sm font-bold shadow-sm ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-primary-500/20 focus:outline-none hover:ring-slate-300"
                                    value={formData.state}
                                    onChange={e => handleChange("state", e.target.value)}
                                    required
                                >
                                    {INDIAN_STATES.map((s) => (
                                        <option key={s.canonicalName} value={s.canonicalName}>
                                            {s.canonicalName} ({s.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Input
                                label="PIN Code (Optional)"
                                placeholder="560001"
                                value={formData.pinCode}
                                onChange={e => handleChange("pinCode", e.target.value)}
                                maxLength={6}
                                className="font-mono text-center"
                            />
                        </div>
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
                                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" /> Save & Select Client
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
