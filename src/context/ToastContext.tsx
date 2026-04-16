"use client";

import React, { createContext, useContext, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { useToastStore, ToastType } from '@/hooks/useToastStore';
import { cn } from '@/utils';

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, addToast, removeToast, success, error, info, warning } = useToastStore();

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, warning }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 p-4 rounded-2xl shadow-2xl border-2 pointer-events-auto",
              "animate-in slide-in-from-right-10 fade-in duration-300 min-w-[320px] max-w-md",
              "bg-white/80 backdrop-blur-xl border-white/40",
              t.type === 'success' && "bg-emerald-50/90 border-emerald-100 text-emerald-900",
              t.type === 'error' && "bg-red-50/90 border-red-100 text-red-900",
              t.type === 'info' && "bg-blue-50/90 border-blue-100 text-blue-900",
              t.type === 'warning' && "bg-amber-50/90 border-amber-100 text-amber-900"
            )}
          >
            <div className={cn(
              "shrink-0 mt-0.5",
              t.type === 'success' && "text-emerald-500",
              t.type === 'error' && "text-red-500",
              t.type === 'info' && "text-blue-500",
              t.type === 'warning' && "text-amber-500"
            )}>
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {t.type === 'info' && <Info className="w-5 h-5" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
            </div>
            
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5 leading-none">{t.type}</p>
              <p className="text-sm font-bold leading-tight">{t.message}</p>
            </div>

            <button 
              onClick={() => removeToast(t.id)} 
              className="shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 opacity-40" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
