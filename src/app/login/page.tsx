"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  CheckCircle2,
  ArrowRight,
  Calculator,
  Wrench,
  FileCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();
      if (data.success) {
        const searchParams = new URLSearchParams(window.location.search);
        const from = searchParams.get("from") || "/";
        router.push(from);
        router.refresh();
      } else {
        setErrorMsg(data.error || "Invalid email or password. Please verify your credentials.");
      }
    } catch (err: any) {
      setErrorMsg("Network connection error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100">
      {/* Left Panel: Architectural Brand Showcase */}
      <div className="lg:w-7/12 relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Subtle geometric grid background pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Top Brand Identity */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-500/20">
            SR
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white block">
              Standard Roofs
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
              Books & Roofing ERP • Erode
            </span>
          </div>
        </div>

        {/* Central Value Proposition */}
        <div className="relative z-10 my-12 lg:my-0 space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Enterprise Financial & Asset Control System
          </div>

          <h1 className="text-3xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Centralized GST Accounting, Project Costing & Site Asset Control.
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Standard Roofs Books (SR-Books) integrates real-time double-entry bookkeeping,
            Tamil Nadu GST compliance (State Code 33), 15-day labour muster, and the official
            SRM01–SRM06 machine & tool custody system for our Erode headquarters.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs flex items-start gap-3">
              <Calculator className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Strict Double-Entry Engine</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Audited ledger balance with automatic journal reversals.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs flex items-start gap-3">
              <FileCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Continuous Invoicing</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Automated tax invoices continuing cleanly from invoice #33.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs flex items-start gap-3">
              <Wrench className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">SRM Tool & Machine Custody</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Live tracking for SRM01–06 welders, cut-off cutters & drills.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs flex items-start gap-3">
              <Building2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Granular Role Permissions</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Strict per-user access control protecting financial accounts.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
          <span>Standard Roofs • Erode - 638011, Tamil Nadu</span>
          <span>FY 2026-27 Active • GSTIN: 33AABCS1234F1Z5</span>
        </div>
      </div>

      {/* Right Panel: Clean Sign-In Form */}
      <div className="lg:w-5/12 flex flex-col justify-center items-center p-6 lg:p-12 bg-slate-900/40">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Sign in to your account</h2>
            <p className="text-xs text-slate-400">
              Enter your official Standard Roofs credentials to access the ERP & accounting portal.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@standardroofs.com"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-sm bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Keep me signed in</span>
              </label>
              <span className="text-[11px] text-slate-500">Contact admin for reset</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 text-center">
            <p className="text-[11px] text-slate-500">
              Protected by Standard Roofs Books Enterprise Security &middot; Encrypted Session
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
