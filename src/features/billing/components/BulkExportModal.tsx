"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, Download, FileText, Calendar, Filter,
  Loader2, CheckCircle2, Zap
} from "lucide-react";
import { Button } from "@/ui/core/Button";
import { Card } from "@/ui/core/Card";
import { useToast } from "@/context/ToastContext";
import apiClient from "@/lib/apiClient";
import { cn } from "@/utils/index";

interface BulkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 30 Days", value: "last30" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Custom Range", value: "custom" },
];

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
];

const FORMAT_OPTIONS = [
  { label: "Standard PDF", value: "ORIGINAL", icon: FileText, desc: "A4 Professional Layout" },
  { label: "Thermal Print", value: "THERMAL", icon: Zap, desc: "80mm POS Optimized" },
];

export function BulkExportModal({ isOpen, onClose }: BulkExportModalProps) {
  const [range, setRange] = useState("last30");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("");
  const [gstType, setGstType] = useState("");
  const [format, setFormat] = useState("ORIGINAL");

  const [clients, setClients] = useState<any[]>([]);
  const [preview, setPreview] = useState<{ 
    count: number; 
    estimatedSize: string; 
    invoices?: { id: string; invoiceNo: string; grandTotal: number | string; client?: { name: string } }[] 
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { success, error, info } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchPreview();
    }
  }, [range, startDate, endDate, clientId, status, gstType, isOpen]);

  const fetchClients = async () => {
    try {
      const res = await apiClient.get("/api/clients/list");
      setClients(res.data?.clients || res.data || []);
    } catch (err) {
      console.error("Failed to fetch clients", err);
    }
  };

  const fetchPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const params = new URLSearchParams({ range, clientId, status, gstType });
      if (range === "custom") {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }
      const res = await apiClient.get(`/api/invoices/export/preview?${params.toString()}`);
      setPreview(res.data);
    } catch (err) {
      console.error("Failed to fetch export preview", err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleExport = async () => {
    if (!preview || preview.count === 0) {
      error("No invoices available to export.");
      return;
    }

    setIsExporting(true);
    info("Preparing PDF generation and ZIP compression...");

    try {
      const res = await apiClient.post("/api/invoices/export", {
        range,
        startDate: range === "custom" ? startDate : undefined,
        endDate: range === "custom" ? endDate : undefined,
        clientId: clientId || undefined,
        status: status || undefined,
        gstType: gstType || undefined,
        format
      }, {
        responseType: 'blob'
      });

      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoices_Export_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      success("Bulk invoice ZIP archive downloaded successfully!");
      onClose();
    } catch (err: any) {
      console.error("[EXPORT_ERROR]", err);
      error(err.response?.data?.error || "Failed to generate export archive.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="w-full max-w-4xl bg-white border-0 shadow-2xl rounded-[2.5rem] overflow-hidden">
        {/* Modal Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter uppercase font-display">Bulk Invoice Export Protocol</h2>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Generate Batch PDFs & Stream Compressed ZIP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Filters */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Date Horizon Filter</label>
                <div className="grid grid-cols-2 gap-2">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRange(opt.value)}
                      className={cn(
                        "h-11 px-4 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between border",
                        range === opt.value
                          ? "bg-slate-900 text-white border-slate-900 shadow-md"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <span>{opt.label}</span>
                      {range === opt.value && <CheckCircle2 size={14} className="text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {range === "custom" && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Client Isolation</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">All Clients</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  >
                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">GST Type</label>
                  <select
                    value={gstType}
                    onChange={(e) => setGstType(e.target.value)}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="">All Types</option>
                    <option value="CGST_SGST">B2B (CGST/SGST)</option>
                    <option value="IGST">Inter-State (IGST)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column: Format & Preview */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Select Output Protocol</label>
                <div className="grid grid-cols-1 gap-3">
                  {FORMAT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = format === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setFormat(opt.value)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group",
                          isActive
                            ? "bg-indigo-50/50 border-indigo-500 shadow-lg shadow-indigo-500/10"
                            : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                        )}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <p className={cn("text-xs font-black uppercase tracking-widest", isActive ? "text-indigo-900" : "text-slate-700")}>{opt.label}</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview Stats */}
              <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-700" />

                <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Pre-Export Audit</p>
                    {isLoadingPreview ? (
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mt-2" />
                    ) : (
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-4xl font-black italic">{preview?.count || 0}</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">Documents</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Est. Size</p>
                    <p className="text-sm font-black italic mt-1">{preview?.estimatedSize || "0.00 MB"}</p>
                  </div>
                </div>

                {!isLoadingPreview && preview?.invoices && preview.invoices.length > 0 && (
                  <div className="mt-4 relative z-10 bg-slate-800/50 rounded-xl max-h-32 overflow-y-auto custom-scrollbar p-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Documents included ({preview.invoices.length}{preview.count > preview.invoices.length ? ` of ${preview.count}` : ''})</p>
                    <ul className="space-y-2">
                      {preview.invoices.map((inv) => (
                        <li key={inv.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium truncate w-1/3">{inv.invoiceNo}</span>
                          <span className="text-slate-400 truncate w-1/3 text-left text-[10px]">{inv.client?.name || "Unknown"}</span>
                          <span className="text-slate-300 font-bold text-right w-1/3">₹{Number(inv.grandTotal).toLocaleString('en-IN')}</span>
                        </li>
                      ))}
                    </ul>
                    {preview.count > preview.invoices.length && (
                      <p className="text-[9px] text-slate-500 mt-2 text-center italic">+ {preview.count - preview.invoices.length} more documents</p>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full w-fit relative z-10">
                  <CheckCircle2 size={10} />
                  Ready for Synchronized Compression
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              Cancel Protocol
            </button>
            <Button
              onClick={handleExport}
              disabled={isExporting || !preview || preview.count === 0}
              size="lg"
              className="h-14 px-10 italic rounded-2xl shadow-xl shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider group relative overflow-hidden"
            >
              {isExporting ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Archive...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                  Initiate ZIP Download
                </div>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>,
    document.body
  );
}
