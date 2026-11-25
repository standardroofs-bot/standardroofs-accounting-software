"use client";

import React from "react";
import { X } from "lucide-react";

/* 1. TACTILE KPI CARD WITH TOP ACCENT BAR & PROGRESS METER */
interface TactileKpiCardProps {
  label: string;
  value: string;
  subtext?: string;
  accent?: "indigo" | "rose" | "emerald" | "amber";
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  progressPercent?: number;
}

export function TactileKpiCard({
  label,
  value,
  subtext,
  accent = "indigo",
  badge,
  icon,
  progressPercent = 72,
}: TactileKpiCardProps) {
  const accentMap = {
    indigo: {
      top: "border-t-[3.5px] border-t-indigo-600",
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
      bar: "bg-indigo-600",
    },
    rose: {
      top: "border-t-[3.5px] border-t-rose-500",
      iconBg: "bg-rose-50 text-rose-600 border-rose-100",
      bar: "bg-rose-500",
    },
    emerald: {
      top: "border-t-[3.5px] border-t-emerald-600",
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      bar: "bg-emerald-600",
    },
    amber: {
      top: "border-t-[3.5px] border-t-amber-500",
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
      bar: "bg-amber-500",
    },
  }[accent];

  const clamped = Math.max(4, Math.min(100, Math.round(progressPercent || 0)));

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 ${accentMap.top} shadow-[0_2px_10px_rgba(15,23,42,0.04)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.07)] transition-all p-4 flex flex-col justify-between`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            {label}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {badge}
            {icon && (
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${accentMap.iconBg}`}>
                {icon}
              </div>
            )}
          </div>
        </div>
        <div className="text-[26px] sm:text-[28px] font-extrabold text-[#0F172A] mt-2 tabular-nums leading-tight">
          {value}
        </div>
        {subtext && <p className="text-[11px] text-slate-600 mt-1">{subtext}</p>}
      </div>

      <div className="mt-3 pt-1">
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${accentMap.bar} transition-all duration-500`}
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* 2. DETERMINISTIC COLORED INITIALS AVATAR (36px) */
const AVATAR_PALETTES = [
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-sky-100 text-sky-700 border-sky-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-teal-100 text-teal-700 border-teal-200",
];

export function InitialsAvatar({ name }: { name: string }) {
  const clean = (name || "SR").trim();
  const parts = clean.split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : clean.slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
  return (
    <div
      className={`w-9 h-9 rounded-xl border font-bold text-xs flex items-center justify-center shrink-0 select-none ${palette}`}
    >
      {initials}
    </div>
  );
}

/* 3. COLOR-CODED PAYMENT CHANNEL / WALLET BADGE */
export function ChannelBadge({ channel }: { channel?: string | null }) {
  const c = (channel || "CASH").trim();
  const upper = c.toUpperCase();
  let cls = "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (upper.includes("ICICI")) {
    cls = "bg-sky-50 text-sky-700 border-sky-200";
  } else if (upper.includes("GPAY") || upper.includes("OFFICE_GPAY")) {
    cls = "bg-violet-50 text-violet-700 border-violet-200";
  } else if (upper.includes("AGENT")) {
    cls = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (upper.includes("RBL")) {
    cls = "bg-indigo-50 text-indigo-700 border-indigo-200";
  } else if (upper.includes("SUJI")) {
    cls = "bg-teal-50 text-teal-700 border-teal-200";
  }

  const label =
    upper === "OFFICE_GPAY"
      ? "Office GPay"
      : upper === "AGENT_ACCOUNT"
      ? "Agent Acct"
      : upper === "CASH"
      ? "Office Cash"
      : c;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

/* 4. SEMANTIC BALANCE BADGE */
export function BalanceBadge({ amount }: { amount: number }) {
  const rounded = Math.round(amount || 0);
  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.abs(rounded));

  if (Math.abs(rounded) < 1) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
        Settled
      </span>
    );
  }
  if (rounded > 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold tabular-nums">
        {fmt} Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold tabular-nums">
      {fmt} Advance
    </span>
  );
}

/* 5. STANDARD STICKY-FOOTER SLIDE-OVER DRAWER */
interface StickySlideOverDrawerProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  maxWidthClass?: string;
}

export function StickySlideOverDrawer({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidthClass = "max-w-md",
}: StickySlideOverDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/30 flex justify-end"
      onClick={onClose}
    >
      <div
        className={`bg-white w-full ${maxWidthClass} h-full shadow-2xl border-l border-slate-200 flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">{title}</div>
            {subtitle && (
              <div className="text-[11px] text-slate-600 font-mono truncate mt-0.5">
                {subtitle}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {children}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {footer}
        </div>
      </div>
    </div>
  );
}
