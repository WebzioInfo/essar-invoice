"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, FileText, Users, Building2, Package, CreditCard, ShoppingCart } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { SearchResultItem } from "@/features/search/services/GlobalSearchService";

export function GlobalSearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query.trim());
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performSearch = async (searchTerm: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      if (res.data?.results) {
        setResults(res.data.results);
        setIsOpen(true);
      }
    } catch (err) {
      console.error("[GLOBAL_SEARCH_UI_ERROR]", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  const getItemIcon = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'CLIENT': return <Users className="w-4 h-4 text-blue-500" />;
      case 'VENDOR': return <Building2 className="w-4 h-4 text-purple-500" />;
      case 'INVOICE': return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'PURCHASE': return <ShoppingCart className="w-4 h-4 text-amber-500" />;
      case 'PRODUCT': return <Package className="w-4 h-4 text-indigo-500" />;
      case 'PAYMENT': return <CreditCard className="w-4 h-4 text-teal-500" />;
      default: return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder="Search invoices, clients, vendors, products..."
          className="w-full h-10 pl-10 pr-9 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
        />
        {loading && (
          <Loader2 className="absolute right-3 w-4 h-4 text-indigo-500 animate-spin" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
          {results.length === 0 ? (
            <div className="p-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
              No matching records found for "{query}"
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item.url)}
                  className="w-full p-3.5 text-left hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
                      {getItemIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] font-bold text-slate-400 truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  {item.amount && (
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-slate-900 italic tracking-tighter">
                        {item.amount}
                      </p>
                      {item.date && (
                        <p className="text-[10px] font-bold text-slate-400">
                          {item.date}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
