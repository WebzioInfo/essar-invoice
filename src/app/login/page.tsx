"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/features/auth/actions/auth";
import { Loader2, Lock, Mail, Building2, AlertCircle, ShieldCheck, ChevronRight, Droplets } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const res = await loginAction(formData);
      if (res && 'error' in res) return { error: res.error };
      if (res && 'success' in res) {
        window.location.href = "/dashboard";
        return { success: true };
      }
      return prevState;
    },
    null
  );

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-[#020617]">
      {/* ── Dynamic Background ── */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-600/10 blur-[100px] rounded-full" />
      </div>

      {/* ── Grid Pattern Watermark ── */}
      <div className="absolute inset-0 z-1 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-0 overflow-hidden bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[2.5rem]">
        
        {/* Left Panel — Brand Experience */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600/10 to-transparent border-r border-white/5">
          <div>
            <div className="flex items-center gap-4 mb-16">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                <Droplets className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-0.5">
                <div className="text-white font-black text-2xl tracking-tighter leading-none">ESSAR</div>
                <div className="text-[10px] font-bold tracking-[0.4em] text-blue-400 uppercase">Enterprises</div>
              </div>
            </div>

            <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight mb-8">
              Precision <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Operations.</span>
            </h1>
            
            <div className="space-y-6 max-w-sm">
              <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Secure Terminal</h3>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">End-to-end encrypted session for fiscal management and audit logs.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Enterprise Core</h3>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">Unified ledger for invoicing, procurement, and GST reconciliation.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Headquarters</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-black text-white text-lg">ESSAR Enterprises</p>
              <p className="text-slate-400 font-medium">Site No.9, Seegahalli Village</p>
              <p className="text-slate-400 font-medium">KR Puram Hobli, Bangalore - 560049</p>
              <div className="pt-3 flex items-center gap-4">
                <span className="text-[11px] font-black text-white/50 bg-white/5 px-2 py-1 rounded-md border border-white/5">GSTIN 29AOPPM7487J1ZV</span>
                <span className="text-[11px] font-black text-white/50 bg-white/5 px-2 py-1 rounded-md border border-white/5">KARNATAKA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel — Auth Terminal */}
        <div className="flex flex-col justify-center p-8 lg:p-16 bg-white/5 backdrop-blur-md">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-12">
              <h2 className="text-4xl font-black text-white font-display tracking-tight mb-2">Sign In.</h2>
              <p className="text-slate-400 font-medium">Access the ESSAR Internal Terminal</p>
            </div>

            {state?.error && (
              <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-black text-red-300 uppercase tracking-widest mb-1">Authorization Error</p>
                  <p className="text-sm text-red-200/80 font-medium leading-relaxed">{state.error}</p>
                </div>
              </div>
            )}

            <form action={formAction} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1" htmlFor="email">Identity Index (Email)</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-colors group-focus-within:text-blue-400">
                    <Mail className="w-full h-full" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@essar.com"
                    required
                    className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1" htmlFor="password">Security Protocol (Password)</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-colors group-focus-within:text-blue-400">
                    <Lock className="w-full h-full" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••••••"
                    required
                    className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full h-16 rounded-[1.25rem] bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black italic tracking-widest uppercase flex items-center justify-center gap-3 shadow-[0_8px_24px_-8px_rgba(37,99,235,0.5)] hover:shadow-[0_12px_32px_-8px_rgba(37,99,235,0.7)] group transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {pending ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <span>Initialize Terminal</span>
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform opacity-50" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-12 text-center">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4">Powered by Webzio International</p>
              <div className="flex items-center justify-center gap-6">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
