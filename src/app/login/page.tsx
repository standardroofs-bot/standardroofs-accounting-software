"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  Calculator,
  FileCheck,
  Wrench,
  Users,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Smartphone,
} from "lucide-react";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [logoSrc, setLogoSrc] = useState("/logo.png");
  const [logoFailed, setLogoFailed] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginId, password, rememberMe }),
      });

      const data = await res.json();
      if (data.success) {
        const searchParams = new URLSearchParams(window.location.search);
        const from = searchParams.get("from");
        if (from && from !== "/login" && from !== "/") {
          router.push(from);
        } else if (data.user?.role === "EMPLOYEE") {
          router.push("/my-attendance");
        } else if (data.user?.role === "HR_MANAGER") {
          router.push("/attendance");
        } else {
          router.push("/");
        }
        router.refresh();
      } else {
        setErrorMsg(data.error || "Invalid Employee ID or password. Please verify credentials.");
      }
    } catch (err: any) {
      setErrorMsg("Network connection error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          LEFT BRAND PANEL: Refined Light ERP Architectural Showcase
          ───────────────────────────────────────────────────────────── */}
      <div className="lg:w-7/12 relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30 p-8 lg:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/90 shadow-xs">
        {/* Subtle geometric dot grid pattern */}
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#1e40af_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        {/* Top Brand Identity */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-14 px-3.5 py-2 bg-white rounded-2xl shadow-xs border border-slate-200/90 flex items-center justify-center shrink-0">
            {!logoFailed ? (
              <img
                src={logoSrc}
                alt="Standard Roofs"
                className="h-10 w-auto max-w-[170px] object-contain transition-all"
                onError={() => {
                  if (logoSrc === "/logo.png") {
                    setLogoSrc("/images/standard-roofs-logo.png");
                  } else {
                    setLogoFailed(true);
                  }
                }}
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
                  SR
                </div>
                <div className="text-left">
                  <div className="text-xs font-black tracking-tight text-slate-900 leading-tight">STANDARD ROOFS</div>
                  <div className="text-[9px] font-bold text-blue-600 tracking-wider">BOOKS ERP</div>
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-slate-900">
                Standard Roofs
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100/80 text-blue-800 border border-blue-200/60">
                Enterprise ERP
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-500 block">
              Books, Roofing Assets & People Command • Erode
            </span>
          </div>
        </div>

        {/* Central Value Proposition */}
        <div className="relative z-10 my-10 lg:my-6 space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white/90 text-blue-800 border border-blue-200/80 shadow-xs backdrop-blur-xs">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Workspace 1–4 Integrated Enterprise Operating System</span>
          </div>

          <h1 className="text-3xl lg:text-4.5xl font-black tracking-tight text-slate-900 leading-[1.18]">
            Unified Finance, Site Operations &amp; People Command.
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed font-normal">
            Standard Roofs Books integrates double-entry GST financial accounting,
            Tamil Nadu State Code 33 compliance, 6-day workforce muster and mobile ESS,
            site deployment logs, and SRM01–06 tool custody into one single source of truth.
          </p>

          {/* 4 Light Subtle ERP Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Standard Finance &amp; GST</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                  Strict double-entry journal, B2B invoicing, and auto reconciliation.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Standard People &amp; Muster</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                  6-day muster matrix, 1-hr permissions, OT tracking &amp; mobile ESS.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Standard Sites &amp; Fleet</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                  Live project deployment, vehicle fuel logs, and SRM machine custody.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">4-Tier Role Security</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                  Super Admin, HR Dept, Accountant &amp; Employee granular access.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 pt-6 border-t border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2 font-medium">
          <span>Standard Roofs • 144, Vellakkal Medu, Nasiyanur Post, Erode - 638107</span>
          <span className="font-mono text-[11px] font-semibold text-slate-600">
            FY 2026-27 Active • GSTIN: 33AEWFS5187G1ZD
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL: Spacious Executive Light Sign-In Card
          ───────────────────────────────────────────────────────────── */}
      <div className="lg:w-5/12 flex flex-col justify-center items-center p-6 lg:p-12 bg-white relative">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header (visible on < lg) */}
          <div className="flex items-center gap-3 lg:hidden pb-2">
            <div className="h-12 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
              <img
                src={logoSrc}
                alt="Standard Roofs"
                className="h-8 w-auto object-contain"
                onError={() => setLogoFailed(true)}
              />
            </div>
            <div>
              <div className="text-base font-extrabold text-slate-900 leading-tight">Standard Roofs</div>
              <div className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">Books &amp; ERP</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Secure Single Sign-On</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">
              Sign in to your account
            </h2>
            <p className="text-xs text-slate-500 leading-normal">
              Enter your official Standard Roofs Employee ID or Email address to access your workspace.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4.5 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Employee ID or Email Address
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="Enter Employee ID (e.g. SR001) or Email"
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition font-medium"
                />
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1 pl-1">
                E.g. <span className="font-mono text-slate-600 font-semibold">SR001</span>, <span className="font-mono text-slate-600 font-semibold">SR002</span>, or <span className="font-mono text-slate-600 font-semibold">admin@standardroofs.com</span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Password</label>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your confidential password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-medium">Keep me signed in</span>
              </label>
              <span className="text-[11px] text-slate-400">Contact admin for reset</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
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

          {/* Mobile App & Enterprise Security Section */}
          <div className="pt-3 text-center space-y-3.5 border-t border-slate-100">
            <div className="flex justify-center">
              <PwaInstallPrompt variant="compact" label="Install Mobile App (Android / iOS)" />
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Protected by Standard Roofs Books Enterprise Security &bull; 256-Bit Encrypted Session</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
