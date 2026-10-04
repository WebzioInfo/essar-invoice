"use client";

import React, { useState } from "react";
import { Plus, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/ui/core/Button";
import { BulkExportModal } from "./BulkExportModal";

export function InvoicesHeaderActions() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setIsExportModalOpen(true)}
          className="italic border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl font-black text-xs uppercase tracking-wider"
        >
          <Download className="w-4 h-4 mr-2 text-indigo-600" />
          Bulk Export
        </Button>

        <Link href="/invoices/new">
          <Button variant="secondary" size="lg" className="italic shadow-xl bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-black text-xs uppercase tracking-wider">
            <Plus className="w-5 h-5 mr-1" />
            Issue New Invoice
          </Button>
        </Link>
      </div>

      <BulkExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </>
  );
}
