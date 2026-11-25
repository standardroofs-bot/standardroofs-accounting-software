"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface HeroMoreAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

interface ModuleHeroBannerProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  statusBadge?: {
    label: string;
    tone?: "emerald" | "amber" | "indigo" | "rose";
  };
  primaryActions?: React.ReactNode;
  moreActions?: HeroMoreAction[];
}

export function ModuleHeroBanner({
  icon,
  title,
  subtitle,
  statusBadge,
  primaryActions,
  moreActions = [],
}: ModuleHeroBannerProps) {
  const [openMore, setOpenMore] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMore(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const badgeTone =
    statusBadge?.tone === "emerald"
      ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/30"
      : statusBadge?.tone === "amber"
      ? "bg-amber-500/20 text-amber-200 border-amber-400/30"
      : statusBadge?.tone === "rose"
      ? "bg-rose-500/20 text-rose-200 border-rose-400/30"
      : "bg-indigo-500/25 text-indigo-100 border-indigo-400/35";

  return (
    <div className="bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-900/10 border border-indigo-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 flex items-center justify-center shadow-inner shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold tracking-tight text-white leading-tight">
              {title}
            </h1>
            {statusBadge && (
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${badgeTone}`}>
                {statusBadge.label}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-[13px] text-indigo-200/85 mt-1 leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {primaryActions}

        {moreActions.length > 0 && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpenMore((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold transition cursor-pointer"
            >
              <span>More Actions</span>
              <ChevronDown size={14} className={`transition-transform ${openMore ? "rotate-180" : ""}`} />
            </button>

            {openMore && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white text-slate-800 border border-slate-200 shadow-2xl py-1.5 z-50 text-xs">
                {moreActions.map((act, idx) =>
                  act.href ? (
                    <a
                      key={idx}
                      href={act.href}
                      onClick={() => setOpenMore(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-indigo-50 hover:text-indigo-700 font-semibold transition"
                    >
                      {act.icon}
                      <span>{act.label}</span>
                    </a>
                  ) : (
                    <button
                      key={idx}
                      type="button"
                      disabled={act.disabled}
                      onClick={() => {
                        setOpenMore(false);
                        act.onClick?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-indigo-50 hover:text-indigo-700 font-semibold transition text-left cursor-pointer disabled:opacity-40"
                    >
                      {act.icon}
                      <span>{act.label}</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
