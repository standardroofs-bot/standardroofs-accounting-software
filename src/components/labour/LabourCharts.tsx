"use client";

import React from "react";
import { Users2, Clock, DollarSign, Calendar, TrendingUp } from "lucide-react";

interface AttendanceChartProps {
  totalStaff: number;
  totalLabour: number;
}

export function AttendanceDistributionChart({
  totalStaff,
  totalLabour,
}: AttendanceChartProps) {
  const totalWorkforce = Math.max(totalStaff + totalLabour, 1);
  const presentPct = 85;
  const onSitePct = 70;
  const leavePct = 15;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" /> Daily Attendance & Shift Distribution
          </h3>
          <p className="text-[11px] text-slate-400">
            Real-time workforce deployment across Erode yard and active roofing sites
          </p>
        </div>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {presentPct}% Present Today
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* On Site */}
        <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Site Roofing Crew</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">{onSitePct}%</span>
          </div>
          <div className="w-full bg-blue-200/50 dark:bg-blue-900/40 h-2 rounded-full overflow-hidden">
            <div style={{ width: `${onSitePct}%` }} className="bg-blue-600 h-full rounded-full" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Deployed across project sites</span>
        </div>

        {/* Yard & Fabrication */}
        <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/50 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Yard & Operations</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">15%</span>
          </div>
          <div className="w-full bg-emerald-200/50 dark:bg-emerald-900/40 h-2 rounded-full overflow-hidden">
            <div style={{ width: "15%" }} className="bg-emerald-500 h-full rounded-full" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Erode yard machinery & inventory</span>
        </div>

        {/* Leave / Off */}
        <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/50 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Off / Rest Day</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{leavePct}%</span>
          </div>
          <div className="w-full bg-amber-200/50 dark:bg-amber-900/40 h-2 rounded-full overflow-hidden">
            <div style={{ width: `${leavePct}%` }} className="bg-amber-500 h-full rounded-full" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Scheduled rest and approved leave</span>
        </div>
      </div>
    </div>
  );
}

interface PayrollChartProps {
  grossSalary: number;
  advancesDeducted: number;
  netDisbursed: number;
}

export function MonthlyPayrollTrendChart({
  grossSalary,
  advancesDeducted,
  netDisbursed,
}: PayrollChartProps) {
  const maxVal = Math.max(grossSalary, 100000);
  const grossPct = Math.min(100, (grossSalary / maxVal) * 100);
  const netPct = Math.min(100, (netDisbursed / maxVal) * 100);
  const advPct = Math.min(100, (advancesDeducted / maxVal) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-600" /> Monthly Payroll & Cash Advances Visual Trend
          </h3>
          <p className="text-[11px] text-slate-400">
            Salaries committed, cash advances deducted, and final bank net disbursements
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Bank Payout</span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            ₹ {netDisbursed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">1. Total Gross Salaries & Wages</span>
            <span className="text-blue-600 dark:text-blue-400 tabular-nums font-bold">
              ₹ {grossSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div style={{ width: `${Math.max(6, grossPct)}%` }} className="bg-blue-600 h-full rounded-full" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">2. Advances Adjusted / Deducted</span>
            <span className="text-amber-500 tabular-nums font-bold">
              ₹ {advancesDeducted.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div style={{ width: `${Math.max(4, advPct)}%` }} className="bg-amber-500 h-full rounded-full" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-900 dark:text-slate-100">3. Net Disbursed Payout</span>
            <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
              ₹ {netDisbursed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div style={{ width: `${Math.max(6, netPct)}%` }} className="bg-emerald-500 h-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
