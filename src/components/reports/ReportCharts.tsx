"use client";

import React from "react";
import { TrendingUp, Receipt, Building, CheckCircle2, DollarSign, Scale } from "lucide-react";

interface PnLChartProps {
  totalRevenue: number;
  directCosts: number;
  grossProfit: number;
  officeOverheads: number;
  netProfit: number;
  grossMarginPct: number | string;
  netMarginPct: number | string;
}

export function PnLRevenueCostChart({
  totalRevenue,
  directCosts,
  grossProfit,
  officeOverheads,
  netProfit,
  grossMarginPct,
  netMarginPct,
}: PnLChartProps) {
  const maxVal = Math.max(totalRevenue, directCosts + officeOverheads, 1);
  const revPct = Math.min(100, (totalRevenue / maxVal) * 100);
  const costPct = Math.min(100, (directCosts / maxVal) * 100);
  const overheadPct = Math.min(100, (officeOverheads / maxVal) * 100);
  const profitPct = Math.min(100, (Math.max(0, netProfit) / maxVal) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4 font-sans print:hidden">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" /> P&L Revenue vs. Direct Cost Breakdown (Visual Analytics)
          </h3>
          <p className="text-[11px] text-slate-400">
            Real-time visual comparison of project revenues against execution costs and company net surplus
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Profit Margin</span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {netMarginPct}% Net Operating
          </span>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {/* Revenue */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">Total Operating Site Revenue</span>
            <span className="text-blue-600 dark:text-blue-400 tabular-nums font-bold">
              ₹ {totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.max(4, revPct)}%` }}
              className="bg-blue-600 h-full rounded-full transition-all"
            />
          </div>
        </div>

        {/* Direct Costs */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">Direct Site Costs (Raw Material, Labour, Freight)</span>
            <span className="text-rose-500 tabular-nums font-bold">
              ₹ {directCosts.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.max(4, costPct)}%` }}
              className="bg-rose-500 h-full rounded-full transition-all"
            />
          </div>
        </div>

        {/* Office Overheads */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">Office Overheads (Admin, Rent, Electricity)</span>
            <span className="text-amber-500 tabular-nums font-bold">
              ₹ {officeOverheads.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.max(4, overheadPct)}%` }}
              className="bg-amber-500 h-full rounded-full transition-all"
            />
          </div>
        </div>

        {/* Net Profit */}
        <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-900 dark:text-slate-100">Net Operating Surplus (Profit)</span>
            <span className={`tabular-nums ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              ₹ {netProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({grossMarginPct}% Gross Site Margin)
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.max(4, profitPct)}%` }}
              className="bg-emerald-500 h-full rounded-full transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface GstChartProps {
  outwardTaxable: number;
  outputGst: number;
  inwardTaxable: number;
  inputItc: number;
  netPayable: number;
}

export function GstComparisonChart({
  outwardTaxable,
  outputGst,
  inwardTaxable,
  inputItc,
  netPayable,
}: GstChartProps) {
  const maxTax = Math.max(outputGst, inputItc, 1000);
  const outPct = Math.min(100, (outputGst / maxTax) * 100);
  const itcPct = Math.min(100, (inputItc / maxTax) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4 font-sans print:hidden">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Receipt size={16} className="text-blue-600" /> GSTR-1 Output Tax vs. GSTR-3B Input ITC (Visual Balance)
          </h3>
          <p className="text-[11px] text-slate-400">
            GST liability on sales invoices versus input tax credit available on purchase bills
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Cash GST Payable</span>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">
            ₹ {Math.max(0, netPayable).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outward Sales Tax */}
        <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-blue-900 dark:text-blue-200">GSTR-1 Output Tax Liability</span>
            <span className="font-bold tabular-nums text-blue-700 dark:text-blue-300">
              ₹ {outputGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-full bg-blue-200/50 dark:bg-blue-900/40 h-2 rounded-full overflow-hidden">
            <div style={{ width: `${Math.max(6, outPct)}%` }} className="bg-blue-600 h-full rounded-full" />
          </div>
          <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 block">
            Taxable Supplies: ₹ {outwardTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Inward Purchases ITC */}
        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/60 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-emerald-900 dark:text-emerald-200">GSTR-3B Input ITC Credit</span>
            <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              ₹ {inputItc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-full bg-emerald-200/50 dark:bg-emerald-900/40 h-2 rounded-full overflow-hidden">
            <div style={{ width: `${Math.max(6, itcPct)}%` }} className="bg-emerald-500 h-full rounded-full" />
          </div>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block">
            Eligible Purchases: ₹ {inwardTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ProjectMarginProps {
  projects: {
    id: string;
    code: string;
    name: string;
    contractValue: number;
    incurredCost: number;
    profit: number;
    marginPct: number;
  }[];
}

export function ProjectSiteMarginChart({ projects }: ProjectMarginProps) {
  if (!projects || projects.length === 0) return null;

  const maxVal = Math.max(...projects.map((p) => p.contractValue), 100000);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4 font-sans print:hidden">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Building size={16} className="text-blue-600" /> Roofing Project Site Margin Comparison
          </h3>
          <p className="text-[11px] text-slate-400">
            Contract value vs. direct site expenditure and realized gross margin per site
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <span className="w-2.5 h-2.5 rounded bg-blue-600" /> Contract Value
          </span>
          <span className="flex items-center gap-1.5 text-rose-500">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Incurred Cost
          </span>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {projects.slice(0, 6).map((p) => {
          const contractPct = Math.min(100, (p.contractValue / maxVal) * 100);
          const costPct = Math.min(100, (p.incurredCost / maxVal) * 100);

          return (
            <div key={p.id} className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-[11px] font-semibold">
                <span className="text-slate-800 dark:text-slate-200 truncate">
                  {p.code} — {p.name}
                </span>
                <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                  {p.marginPct}% Margin (₹ {p.profit.toLocaleString("en-IN")})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex justify-end">
                  <div
                    style={{ width: `${Math.max(4, contractPct)}%` }}
                    className="bg-blue-600 h-full rounded-full transition-all"
                  />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex justify-start">
                  <div
                    style={{ width: `${Math.max(4, costPct)}%` }}
                    className="bg-rose-500 h-full rounded-full transition-all"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
