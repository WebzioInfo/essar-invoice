"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Filter, ChevronDown } from "lucide-react";
import { cn } from "@/utils/index";

export interface StatusOption {
  label: string;
  value: string;
  count?: number;
}

interface StatusDropdownProps {
  options: StatusOption[];
  paramName?: string;
  className?: string;
}

export function StatusDropdown({
  options,
  paramName = "status",
  className,
}: StatusDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentVal = searchParams.get(paramName) || "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    if (val) {
      current.set(paramName, val);
    } else {
      current.delete(paramName);
    }

    // Reset pagination to page 1 on filter change
    current.delete("page");

    const query = current.toString() ? `?${current.toString()}` : "";
    router.push(`${pathname}${query}`);
  };

  return (
    <div className={cn("relative min-w-[220px] w-full sm:w-auto", className)}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <Filter className="w-4 h-4" />
      </div>
      <select
        value={currentVal}
        onChange={handleChange}
        className="w-full appearance-none pl-11 pr-10 py-3 bg-slate-50 hover:bg-slate-100 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-500 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-800 transition-all cursor-pointer shadow-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-slate-900 font-bold">
            {opt.label} {opt.count !== undefined ? `(${opt.count})` : ""}
          </option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );
}
