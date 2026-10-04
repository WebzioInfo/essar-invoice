"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/ui/core/Modal";
import { Button } from "@/ui/core/Button";
import { useToast } from "@/context/ToastContext";
import { 
    MessageSquare, Mail, Download, ExternalLink, Send, Loader2, AlertCircle, FileText
} from "lucide-react";
import { prepareWhatsAppShareAction, sendInvoiceEmailAction, getInvoiceShareDataAction } from "../actions/shareActions";
import { getPartyAccountOverviewAction, prepareStatementWhatsAppAction, sendStatementEmailAction } from "../actions/accountActions";
import apiClient from "@/lib/apiClient";

import { 
    buildWhatsAppShareMessage, 
    buildWhatsAppFollowupMessage, 
    buildEmailShareContent, 
    buildEmailFollowupContent,
    buildWhatsAppStatementMessage,
    buildEmailStatementContent
} from "../utils/shareTemplates";

export interface InvoiceShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentType?: 'INVOICE' | 'CLIENT_STATEMENT' | 'VENDOR_STATEMENT';
    invoiceId?: string;
    partyId?: string;
    actionType: 'SHARE' | 'FOLLOWUP';
    channel: 'WHATSAPP' | 'EMAIL';
}

export function InvoiceShareModal({
    isOpen,
    onClose,
    documentType = 'INVOICE',
    invoiceId,
    partyId,
    actionType,
    channel
}: InvoiceShareModalProps) {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(false);
    const [actionPending, setActionPending] = useState(false);
    const [shareData, setShareData] = useState<any>(null);
    const [recipient, setRecipient] = useState("");
    const [messagePreview, setMessagePreview] = useState("");
    const [errMessage, setErrMessage] = useState<string | null>(null);

    const isStatement = documentType === 'CLIENT_STATEMENT' || documentType === 'VENDOR_STATEMENT';
    const effectiveInvoiceId = invoiceId || (!isStatement ? partyId : "") || "";
    const effectivePartyId = partyId || (isStatement ? invoiceId : "") || "";

    useEffect(() => {
        if (isOpen) {
            setErrMessage(null);
            if (isStatement) {
                if (effectivePartyId) {
                    loadStatementDetails(effectivePartyId, documentType === 'CLIENT_STATEMENT');
                } else {
                    setErrMessage("Party ID is required to generate account statement.");
                }
            } else {
                if (effectiveInvoiceId) {
                    loadInvoiceDetails(effectiveInvoiceId);
                } else {
                    setErrMessage("Invoice ID is missing.");
                }
            }
        }
    }, [isOpen, effectiveInvoiceId, effectivePartyId, actionType, channel, documentType]);

    const loadInvoiceDetails = async (id: string) => {
        setLoading(true);
        try {
            const res = await getInvoiceShareDataAction(id);
            if (!('data' in res) || !res.data) {
                setErrMessage(('error' in res && typeof res.error === 'string') ? res.error : "Failed to load invoice sharing information.");
                return;
            }
            setShareData(res.data);
            if (channel === 'WHATSAPP') {
                setRecipient(res.data.cleanPhone || res.data.customerPhone || "");
                const waMsg = actionType === 'SHARE' 
                    ? buildWhatsAppShareMessage(res.data)
                    : buildWhatsAppFollowupMessage(res.data);
                setMessagePreview(waMsg);
            } else {
                setRecipient(res.data.customerEmail || "");
                const emailContent = actionType === 'SHARE'
                    ? buildEmailShareContent(res.data)
                    : buildEmailFollowupContent(res.data);
                setMessagePreview(`SUBJECT: ${emailContent.subject}\n\n${emailContent.body}`);
            }
        } catch (err: any) {
            setErrMessage(err.message || "Failed to load invoice information.");
        } finally {
            setLoading(false);
        }
    };

    const loadStatementDetails = async (id: string, isClient: boolean) => {
        setLoading(true);
        try {
            const res = await getPartyAccountOverviewAction(id, isClient ? 'CLIENT' : 'SUPPLIER');
            if (!('data' in res) || !res.data) {
                setErrMessage(('error' in res && typeof res.error === 'string') ? res.error : "Failed to load statement details.");
                return;
            }
            const summary = res.data.summary;
            setShareData(summary);
            
            const companySetting = await apiClient.get('/api/settings').catch(() => null);
            const bankDetailsShort = companySetting?.data?.bankAccountNo 
                ? `${companySetting.data.bankName} A/C: ${companySetting.data.bankAccountNo} (IFSC: ${companySetting.data.bankIfsc})`
                : "Federal Bank A/C: 21650200003173 (IFSC: FDRL0002165)";

            const bankDetailsFull = companySetting?.data?.bankAccountNo
                ? `Bank: ${companySetting.data.bankName} (${companySetting.data.bankBranch})\nA/C Name: ${companySetting.data.bankAccountName}\nA/C No: ${companySetting.data.bankAccountNo}\nIFSC: ${companySetting.data.bankIfsc}`
                : "Bank: FEDERAL BANK (DOMMASANDRA)\nA/C Name: ESSAR ENTERPRISES\nA/C No: 21650200003173\nIFSC: FDRL0002165";

            if (channel === 'WHATSAPP') {
                setRecipient(summary.phone || "");
                const msg = buildWhatsAppStatementMessage(summary, isClient, bankDetailsShort);
                setMessagePreview(msg);
            } else {
                setRecipient(summary.email || "");
                const emailContent = buildEmailStatementContent(summary, isClient, bankDetailsFull);
                setMessagePreview(`SUBJECT: ${emailContent.subject}\n\n${emailContent.body}`);
            }
        } catch (err: any) {
            setErrMessage(err.message || "Failed to load statement details.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!recipient || !recipient.trim()) {
            error(`Please specify a valid ${channel === 'WHATSAPP' ? 'mobile number' : 'email address'}.`);
            return;
        }

        setActionPending(true);

        try {
            if (isStatement) {
                const isClient = documentType === 'CLIENT_STATEMENT';
                if (channel === 'WHATSAPP') {
                    const res = await prepareStatementWhatsAppAction(
                        effectivePartyId,
                        isClient ? 'CLIENT' : 'SUPPLIER',
                        recipient,
                        messagePreview
                    );
                    if ('whatsappUrl' in res && res.whatsappUrl) {
                        success("Opening WhatsApp Deep Link with Account Statement message...");
                        window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
                        const downloadUrl = `/api/statements/download?partyId=${effectivePartyId}&partyType=${isClient ? 'CLIENT' : 'SUPPLIER'}`;
                        window.open(downloadUrl, '_blank');
                        onClose();
                    } else {
                        error(('error' in res && typeof res.error === 'string') ? res.error : "Failed to generate WhatsApp statement link.");
                    }
                } else {
                    const parts = messagePreview.split("\n\n");
                    const subject = parts[0].replace("SUBJECT: ", "").trim();
                    const body = parts.slice(1).join("\n\n").trim();

                    const res = await sendStatementEmailAction(
                        effectivePartyId,
                        isClient ? 'CLIENT' : 'SUPPLIER',
                        recipient,
                        body,
                        subject
                    );
                    if ('recipient' in res) {
                        success(`Account Statement PDF email delivered successfully to ${recipient}!`);
                        onClose();
                    } else {
                        error(('error' in res && typeof res.error === 'string') ? res.error : "Failed to send email statement.");
                    }
                }
            } else {
                if (channel === 'WHATSAPP') {
                    const res = await prepareWhatsAppShareAction(
                        effectiveInvoiceId,
                        actionType,
                        recipient,
                        messagePreview
                    );
                    if ('whatsappUrl' in res && res.whatsappUrl) {
                        success("Opening WhatsApp Deep Link with invoice details...");
                        window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
                        onClose();
                    } else {
                        error(('error' in res && typeof res.error === 'string') ? res.error : "Failed to generate WhatsApp share link.");
                    }
                } else {
                    let customSubject: string | undefined;
                    let customBody: string | undefined;

                    if (messagePreview.startsWith("SUBJECT:")) {
                        const parts = messagePreview.split("\n\n");
                        customSubject = parts[0].replace("SUBJECT: ", "").trim();
                        customBody = parts.slice(1).join("\n\n").trim();
                    } else {
                        customBody = messagePreview;
                    }

                    const res = await sendInvoiceEmailAction(
                        effectiveInvoiceId,
                        actionType,
                        recipient,
                        customBody,
                        customSubject
                    );

                    if ('recipient' in res) {
                        success(`Invoice PDF email delivered successfully to ${recipient}!`);
                        onClose();
                    } else {
                        error(('error' in res && typeof res.error === 'string') ? res.error : "Failed to send email.");
                    }
                }
            }
        } catch (err: any) {
            error(err.message || "An error occurred during sharing.");
        } finally {
            setActionPending(false);
        }
    };

    const isWhatsApp = channel === 'WHATSAPP';
    const isShare = actionType === 'SHARE';
    const docName = isStatement 
        ? (documentType === 'CLIENT_STATEMENT' ? 'Customer Account Statement' : 'Vendor Account Statement')
        : 'Invoice';

    const modalTitle = isWhatsApp
        ? `${isShare ? 'Share' : 'Follow-Up'} ${docName} via WhatsApp`
        : `${isShare ? 'Share' : 'Follow-Up'} ${docName} via Email`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
            <div className="space-y-6">
                {/* Header Title */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                            isWhatsApp 
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-emerald-500/10' 
                                : 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 shadow-indigo-500/10'
                        }`}>
                            {isWhatsApp ? <MessageSquare className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">
                                {modalTitle}
                            </h2>
                            <p className="text-xs font-bold text-slate-500 mt-0.5">
                                {shareData?.invoiceNo 
                                    ? `Invoice #${shareData.invoiceNo} • ${shareData.customerName}` 
                                    : (shareData?.name ? `Account: ${shareData.name}` : 'Loading document details...')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sub Header Badge / Document Indicator */}
                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-black uppercase tracking-wider text-white truncate">
                            {isStatement 
                                ? 'Certified Account Statement Document' 
                                : (isShare ? 'Official Tax Invoice Document' : 'Payment Follow-Up Notice')}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                            Generated ERP PDF attachment included automatically
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Preparing document data & PDF...</p>
                    </div>
                ) : errMessage ? (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider mb-1">Notice</p>
                            <p className="text-xs font-medium leading-relaxed">{errMessage}</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Recipient Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                                {isWhatsApp ? 'Mobile / WhatsApp Number' : 'Email Address'}
                            </label>
                            <input
                                type={isWhatsApp ? "tel" : "email"}
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                placeholder={isWhatsApp ? "+91 98765 43210" : "client@company.com"}
                                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                            />
                            {!recipient && (
                                <p className="text-xs font-bold text-amber-600 flex items-center gap-1.5 pt-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    No saved {isWhatsApp ? 'phone number' : 'email'} found for this party. Please enter one above.
                                </p>
                            )}
                        </div>

                        {/* Message Preview */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                                    Generated Message & Subject Preview
                                </label>
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-full">
                                    Official ERP Template
                                </span>
                            </div>
                            <textarea
                                value={messagePreview}
                                onChange={(e) => setMessagePreview(e.target.value)}
                                rows={6}
                                className="w-full p-4 bg-slate-50/80 rounded-2xl border border-slate-200 text-xs font-mono text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-all custom-scrollbar shadow-inner"
                            />
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-100">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            >
                                Cancel
                            </Button>
                            
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={actionPending || !recipient.trim()}
                                className={`w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg text-white flex items-center justify-center gap-2 transition-all ${
                                    isWhatsApp ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                                }`}
                            >
                                {actionPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {isWhatsApp ? 'Opening WhatsApp...' : 'Sending Email...'}
                                    </>
                                ) : isWhatsApp ? (
                                    <>
                                        <ExternalLink className="w-4 h-4" />
                                        Open WhatsApp & Download PDF
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Send Email with Attached PDF
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
