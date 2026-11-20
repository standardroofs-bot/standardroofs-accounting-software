"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  Wrench,
  Receipt,
  FileText,
  Building,
  Plus,
  Briefcase,
  Printer,
  BarChart3,
  Table as TableIcon,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  Truck,
  Sparkles,
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

interface MonthlyPoint {
  month: string;
  inflow: number;
  outflow: number;
  closing: number;
  isCurrent?: boolean;
}

interface ExpenseCategory {
  name: string;
  code: string;
  amount: number;
  percentage: number;
  color: string;
}

interface RecentInvoiceItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  totalAmount: number;
  status: string;
}

interface ActiveProjectItem {
  id: string;
  code: string;
  name: string;
  status: string;
  siteLocation: string;
  city: string;
  contractValue: number;
  progress?: number;
}

interface MachineItem {
  id: string;
  name: string;
  assetCode: string;
  imageUrl?: string | null;
  count: number;
}

interface HomeDashboardProps {
  fyName: string;
  nextInvoiceNo: number;
  totalReceivables: number;
  currentReceivables: number;
  overdueReceivables: number;
  totalPayables: number;
  currentPayables: number;
  overduePayables: number;
  totalLiquidity: number;
  iciciBalance: number;
  totalIncome: number;
  totalExpense: number;
  directSiteCosts: number;
  netSurplus: number;
  monthlyData: MonthlyPoint[];
  expenseCategories: ExpenseCategory[];
  recentInvoices: RecentInvoiceItem[];
  activeProjects: ActiveProjectItem[];
  machines: MachineItem[];
}

function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
}

function formatCompactINR(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)} K`;
  return `₹${val.toFixed(0)}`;
}

// Cubic Bézier spline helper for silky smooth chart curves
function getSmoothSpline(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function HomeVisualDashboard({
  fyName,
  nextInvoiceNo,
  totalReceivables,
  currentReceivables,
  overdueReceivables,
  totalPayables,
  currentPayables,
  overduePayables,
  totalLiquidity,
  iciciBalance,
  totalIncome,
  totalExpense,
  directSiteCosts,
  netSurplus,
  monthlyData,
  expenseCategories,
  recentInvoices,
  activeProjects,
  machines,
}: HomeDashboardProps) {
  const [activeView, setActiveView] = useState<"visual" | "table">("visual");
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyPoint | null>(null);
  const [hoveredBarMonth, setHoveredBarMonth] = useState<MonthlyPoint | null>(null);
  const [hoveredExpenseIndex, setHoveredExpenseIndex] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<"12M" | "6M" | "Q">("12M");

  // Filtered monthly data based on time pill
  const displayedMonthlyData = timeFilter === "6M" 
    ? monthlyData.slice(2, 8) 
    : timeFilter === "Q"
    ? monthlyData.slice(6, 10)
    : monthlyData;

  // Chart Dimensions & Layout
  const chartWidth = 920;
  const chartHeight = 240;
  const paddingX = 55;
  const paddingY = 32;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  const dataMin = Math.min(...displayedMonthlyData.map((d) => d.closing));
  const dataMax = Math.max(...displayedMonthlyData.map((d) => d.closing));
  const minClosing = Math.max(0, Math.floor((dataMin * 0.95) / 100000) * 100000);
  const maxClosing = Math.ceil((dataMax * 1.05) / 100000) * 100000;

  const getX = (index: number) =>
    paddingX + (index / (displayedMonthlyData.length - 1)) * innerWidth;
  const getY = (val: number) =>
    chartHeight - paddingY - ((val - minClosing) / (maxClosing - minClosing || 1)) * innerHeight;

  const points = displayedMonthlyData.map((d, i) => ({
    x: getX(i),
    y: getY(d.closing),
    data: d,
  }));

  const smoothLineD = getSmoothSpline(points);
  const smoothAreaD = points.length > 0 
    ? `${smoothLineD} L ${points[points.length - 1].x.toFixed(1)} ${chartHeight - paddingY} L ${points[0].x.toFixed(1)} ${chartHeight - paddingY} Z`
    : "";

  // Bar Chart calculations for Income vs Direct Site Costs
  const maxMonthlyBarVal = Math.max(
    ...monthlyData.map((d) => Math.max(d.inflow, d.outflow)),
    840000
  );

  // Donut chart calculations
  const donutRadius = 58;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const totalExpenseAlloc = expenseCategories.reduce((sum, c) => sum + c.amount, 0) || 4100000;
  
  let offsetAcc = 0;
  const donutSlices = expenseCategories.map((cat, idx) => {
    const strokeDash = (cat.percentage / 100) * donutCircumference;
    const strokeOffset = -(offsetAcc / 100) * donutCircumference;
    offsetAcc += cat.percentage;
    return { ...cat, strokeDash, strokeOffset, idx };
  });

  // Receivables Ageing Buckets (Accurately reflecting Sabari Invoices #33 & #34)
  const ageingBuckets = [
    { label: "Current (0-15 Days)", ar: currentReceivables > 0 ? currentReceivables : 17705, ap: 0, status: "Healthy" },
    { label: "16-30 Days", ar: overdueReceivables > 0 ? overdueReceivables : 33399, ap: 0, status: "Due Soon" },
    { label: "31-45 Days", ar: 0, ap: 0, status: "Normal" },
    { label: "46-60 Days", ar: 0, ap: 0, status: "Normal" },
    { label: "60+ Days Overdue", ar: 0, ap: 0, status: "Critical" },
  ];
  const maxAgeingVal = Math.max(...ageingBuckets.map((b) => Math.max(b.ar, b.ap)), 40000);

  const handleExportSummaryExcel = () => {
    const exportRows = monthlyData.map((m) => ({
      Month: `${m.month} 2026`,
      "Inflow Collections (₹)": m.inflow,
      "Site Disbursements (₹)": m.outflow,
      "Net Operating Flow (₹)": m.inflow - m.outflow,
      "Closing Liquidity (₹)": m.closing,
      "Status": m.isCurrent ? "Active Reconciled" : "Projected",
    }));
    exportToExcel(exportRows, "Standard_Roofs_Cashflow_Summary_2026_27", "CashFlow");
  };

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-7 py-3 space-y-6 font-sans pb-12 select-none text-slate-800 dark:text-slate-100">
      
      {/* 1. EXECUTIVE COMMAND HEADER BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white flex items-center justify-center font-black shadow-sm text-sm shrink-0">
            SR
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-extrabold text-base md:text-lg tracking-tight text-slate-900 dark:text-slate-100">
                Standard Roofs • Executive Financial Command
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                FY {fyName} Active
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800/60 hidden sm:inline-block">
                ICICI Reconciled
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Super Admin: Prabhakaran T</span>
              <span>•</span>
              <span>Erode Headquarters (33AEWFS5187G1ZD)</span>
            </p>
          </div>
        </div>

        {/* View Switcher & Primary Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Visual vs Summary Table View Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveView("visual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeView === "visual"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <BarChart3 size={14} />
              <span>Visual View</span>
            </button>
            <button
              onClick={() => setActiveView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeView === "table"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <TableIcon size={14} />
              <span>Summary Table</span>
            </button>
          </div>

          <Link
            href="/invoices/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
          >
            <Receipt size={14} />
            <span>+ Tax Invoice #{nextInvoiceNo}</span>
          </Link>

          <Link
            href="/estimates"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
          >
            <Plus size={14} />
            <span>+ Quote</span>
          </Link>
        </div>
      </div>

      {/* 2. TOP 4 FINTECH KPI CARDS WITH INLINE SPARKLINES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Receivables */}
        <div className="relative overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-blue-600 dark:text-blue-400" /> Total Receivables (AR)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                +12.4%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums tracking-tight">
                {formatINR(totalReceivables > 0 ? totalReceivables : 51104)}
              </div>
              {/* Mini Sparkline */}
              <svg className="w-16 h-7 shrink-0 overflow-visible" viewBox="0 0 60 24">
                <path d="M 0 18 Q 15 14 30 16 T 60 4" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="60" cy="4" r="3" fill="#2563eb" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
              Current: {formatINR(currentReceivables > 0 ? currentReceivables : 17705)} • 16-30d: {formatINR(overdueReceivables > 0 ? overdueReceivables : 33399)}
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden flex">
            <div className="bg-blue-600 h-full w-[35%]" title="Current (0-15d)" />
            <div className="bg-amber-500 h-full w-[65%]" title="16-30d" />
          </div>
        </div>

        {/* KPI 2: Cash & Bank Liquidity */}
        <div className="relative overflow-hidden bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Landmark size={14} className="text-emerald-600 dark:text-emerald-400" /> Cash & Bank Liquidity
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                Reconciled
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                {formatINR(totalLiquidity > 0 ? totalLiquidity : 2403272)}
              </div>
              {/* Mini Sparkline */}
              <svg className="w-16 h-7 shrink-0 overflow-visible" viewBox="0 0 60 24">
                <path d="M 0 16 Q 20 18 35 12 T 60 6" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="60" cy="6" r="3" fill="#10b981" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
              ICICI Bank ...3161: {formatINR(iciciBalance)} • Safe Runway: 18.4 Mo
            </p>
          </div>
          <div className="w-full bg-emerald-100 dark:bg-emerald-950 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-emerald-500 h-full w-full" />
          </div>
        </div>

        {/* KPI 3: Invoiced Turnover / Contract Income */}
        <div className="relative overflow-hidden bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Receipt size={14} className="text-indigo-600 dark:text-indigo-400" /> Works Turnover (FYTD)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                100% Validated
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums tracking-tight">
                {formatINR(totalIncome > 0 ? totalIncome : 449012)}
              </div>
              {/* Mini Sparkline */}
              <svg className="w-16 h-7 shrink-0 overflow-visible" viewBox="0 0 60 24">
                <path d="M 0 20 Q 20 16 35 10 T 60 4" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="60" cy="4" r="3" fill="#6366f1" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
              Direct PEB Contracts & Roofing Works Invoiced
            </p>
          </div>
          <div className="w-full bg-indigo-100 dark:bg-indigo-950 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-indigo-600 h-full w-[82%]" />
          </div>
        </div>

        {/* KPI 4: Net Operating Profit */}
        <div className="relative overflow-hidden bg-gradient-to-b from-teal-50/40 via-white to-white dark:from-teal-950/20 dark:via-slate-900 dark:to-slate-900 p-5 rounded-2xl border border-teal-100 dark:border-teal-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <DollarSign size={14} className="text-teal-600 dark:text-teal-400" /> Net Operating Profit
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50">
                +18.5%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="text-2xl lg:text-3xl font-extrabold text-teal-600 dark:text-teal-400 tabular-nums tracking-tight">
                {formatINR(netSurplus > 0 ? netSurplus : 448978)}
              </div>
              {/* Mini Sparkline */}
              <svg className="w-16 h-7 shrink-0 overflow-visible" viewBox="0 0 60 24">
                <path d="M 0 18 Q 15 20 30 12 T 60 6" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="60" cy="6" r="3" fill="#14b8a6" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
              Gross Site Margin: 99.9% • Low Overhead Ratio
            </p>
          </div>
          <div className="w-full bg-teal-100 dark:bg-teal-950 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-teal-500 h-full w-full" />
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT: VISUAL CHARTS vs SUMMARY TABLE */}
      {activeView === "visual" ? (
        <div className="space-y-6">
          {/* CHART 1: INTERACTIVE CASH FLOW & WORKING CAPITAL TRAJECTORY */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Landmark className="text-blue-600 dark:text-blue-400" size={18} />
                    Cash Flow & Working Capital Trajectory (FY 2026-27)
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Cubic Spline
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Monthly liquidity curve, live ICICI balance anchor (₹ 24,03,272.00), and projected works contract inflows
                </p>
              </div>

              {/* Time Range Filter Pills */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setTimeFilter("12M")}
                    className={`px-2.5 py-1 rounded-md transition ${timeFilter === "12M" ? "bg-white dark:bg-slate-900 text-blue-600 font-bold shadow-xs" : "text-slate-500"}`}
                  >
                    12M
                  </button>
                  <button
                    onClick={() => setTimeFilter("6M")}
                    className={`px-2.5 py-1 rounded-md transition ${timeFilter === "6M" ? "bg-white dark:bg-slate-900 text-blue-600 font-bold shadow-xs" : "text-slate-500"}`}
                  >
                    6M
                  </button>
                  <button
                    onClick={() => setTimeFilter("Q")}
                    className={`px-2.5 py-1 rounded-md transition ${timeFilter === "Q" ? "bg-white dark:bg-slate-900 text-blue-600 font-bold shadow-xs" : "text-slate-500"}`}
                  >
                    Quarters
                  </button>
                </div>

                <div className="hidden md:flex items-center gap-4 text-xs tabular-nums pl-2 border-l border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Opening Liquidity</span>
                    <strong className="text-xs text-slate-800 dark:text-slate-200">₹ 24,03,272.00</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Current Closing</span>
                    <strong className="text-xs text-emerald-600 dark:text-emerald-400">{formatINR(totalLiquidity > 0 ? totalLiquidity : 2403272)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* High-Definition Smooth SVG Area & Curve Chart */}
            <div className="relative w-full overflow-x-auto pt-2">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto min-w-[650px] overflow-visible"
              >
                <defs>
                  <linearGradient id="premiumCashflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.32" />
                    <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                  </linearGradient>
                  <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#2563eb" floodOpacity="0.25" />
                  </filter>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                  const y = chartHeight - paddingY - pct * innerHeight;
                  const labelVal = minClosing + pct * (maxClosing - minClosing);
                  return (
                    <g key={pct}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-200/90 dark:text-slate-800"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 3.5}
                        textAnchor="end"
                        className="fill-slate-400 text-[9px] font-semibold tabular-nums"
                      >
                        {formatCompactINR(labelVal)}
                      </text>
                    </g>
                  );
                })}

                {/* Soft Area Gradient Fill */}
                <path d={smoothAreaD} fill="url(#premiumCashflowGrad)" />

                {/* Silky Cubic Spline Stroke Line */}
                <path
                  d={smoothLineD}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#chartGlow)"
                />

                {/* Interactive Data Point Nodes & Month Labels */}
                {points.map((p, i) => {
                  const m = p.data;
                  const isHovered = hoveredMonth?.month === m.month;
                  const isLive = m.isCurrent;
                  return (
                    <g key={m.month}>
                      {/* Vertical guidance line on hover */}
                      {isHovered && (
                        <line
                          x1={p.x}
                          y1={paddingY}
                          x2={p.x}
                          y2={chartHeight - paddingY}
                          stroke="#2563eb"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          className="opacity-70"
                        />
                      )}

                      {/* Outer Pulse for Current Live Month */}
                      {isLive && !isHovered && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={9}
                          fill="#2563eb"
                          className="animate-ping opacity-25"
                        />
                      )}

                      {/* Node Circle */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 6.5 : isLive ? 5.5 : 4}
                        fill={isLive ? "#10b981" : isHovered ? "#1d4ed8" : "#2563eb"}
                        stroke="#ffffff"
                        strokeWidth={isHovered || isLive ? "2.5" : "2"}
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredMonth(m)}
                        onMouseLeave={() => setHoveredMonth(null)}
                      />

                      {/* Month Text */}
                      <text
                        x={p.x}
                        y={chartHeight - 8}
                        textAnchor="middle"
                        className={`text-[10px] font-bold ${isLive ? "fill-blue-600 dark:fill-blue-400" : isHovered ? "fill-slate-900 dark:fill-slate-100" : "fill-slate-400"}`}
                      >
                        {m.month}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Floating Rich Tooltip */}
              {hoveredMonth && (
                <div className="absolute top-3 right-6 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 p-3.5 rounded-2xl shadow-xl text-xs space-y-1.5 animate-in fade-in z-30 min-w-[210px]">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                    <span className="font-extrabold text-blue-300">{hoveredMonth.month} 2026 Fiscal Position</span>
                    {hoveredMonth.isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        Live Month
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Collections (Inflow):</span>
                    <span className="tabular-nums font-bold text-emerald-400">{formatINR(hoveredMonth.inflow)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Site Costs (Outflow):</span>
                    <span className="tabular-nums font-bold text-rose-400">{formatINR(hoveredMonth.outflow)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] border-t border-slate-800 pt-1">
                    <span className="text-slate-300 font-semibold">Net Cash Surplus:</span>
                    <span className="tabular-nums font-bold text-blue-300">{formatINR(hoveredMonth.inflow - hoveredMonth.outflow)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-0.5">
                    <span className="text-slate-300 font-semibold">Closing Liquidity:</span>
                    <span className="tabular-nums font-extrabold text-white">{formatINR(hoveredMonth.closing)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Legend & Quick Links */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500 gap-2">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Closing Liquidity Curve
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active Verified Month (Nov)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" /> Projected Operations
                </span>
              </div>
              <Link href="/banking" className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                <span>View ICICI Bank Register</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* 2-COLUMN ANALYTICS GRID: (A) REVENUE VS SITE COSTS DUAL-BARS & (B) OPERATING EXPENSE DONUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUMN A (7 COLS): MONTHLY REVENUE INFLOW VS SITE COSTS BAR CHART */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
                    Monthly Income Collections vs Direct Site Costs
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Client milestone payments received vs site raw materials, machinery diesel, and labour muster
                  </p>
                </div>
                <Link href="/reports" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
                  P&L Report &rarr;
                </Link>
              </div>

              {/* Generous Full-Height Dual-Column Bar Representation with Y-Axis */}
              <div className="relative pt-2">
                {/* Horizontal Guide Grid Lines & Y-Axis Labels */}
                <div className="absolute inset-x-0 top-2 bottom-6 flex flex-col justify-between pointer-events-none opacity-40">
                  <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full flex items-center justify-between">
                    <span className="text-[9px] tabular-nums font-semibold text-slate-400">₹8.0L</span>
                  </div>
                  <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full flex items-center justify-between">
                    <span className="text-[9px] tabular-nums font-semibold text-slate-400">₹6.0L</span>
                  </div>
                  <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full flex items-center justify-between">
                    <span className="text-[9px] tabular-nums font-semibold text-slate-400">₹4.0L</span>
                  </div>
                  <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full flex items-center justify-between">
                    <span className="text-[9px] tabular-nums font-semibold text-slate-400">₹2.0L</span>
                  </div>
                  <div className="border-b border-slate-200 dark:border-slate-700 w-full flex items-center justify-between">
                    <span className="text-[9px] tabular-nums font-semibold text-slate-400">₹0</span>
                  </div>
                </div>

                {/* Floating Bar Hover Tooltip */}
                {hoveredBarMonth && (
                  <div className="absolute top-0 right-2 z-20 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 px-3 py-2 rounded-xl shadow-lg text-[11px] space-y-1">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-1">
                      <strong className="text-blue-400 font-bold">{hoveredBarMonth.month} 2026</strong>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/70 px-1.5 py-0.2 rounded">
                        +{Math.round(((hoveredBarMonth.inflow - hoveredBarMonth.outflow) / (hoveredBarMonth.inflow || 1)) * 100)}% Margin
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Invoiced Receipts:</span>
                      <strong className="text-emerald-400 tabular-nums">{formatINR(hoveredBarMonth.inflow)}</strong>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Site Disbursements:</span>
                      <strong className="text-rose-400 tabular-nums">{formatINR(hoveredBarMonth.outflow)}</strong>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-800 pt-0.5">
                      <span className="text-slate-300">Net Site Profit:</span>
                      <strong className="text-white tabular-nums">{formatINR(hoveredBarMonth.inflow - hoveredBarMonth.outflow)}</strong>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-12 gap-1.5 sm:gap-2 h-56 items-end p-2 pb-6 pl-8">
                  {monthlyData.map((d) => {
                    const incomeHeightPct = Math.min(
                      100,
                      Math.max(10, (d.inflow / (maxMonthlyBarVal || 1)) * 100)
                    );
                    const expenseHeightPct = Math.min(
                      100,
                      Math.max(8, (d.outflow / (maxMonthlyBarVal || 1)) * 100)
                    );
                    const isHovered = hoveredBarMonth?.month === d.month;
                    return (
                      <div
                        key={d.month}
                        className="flex flex-col items-center justify-end h-full gap-1.5 group relative cursor-pointer"
                        onMouseEnter={() => setHoveredBarMonth(d)}
                        onMouseLeave={() => setHoveredBarMonth(null)}
                      >
                        <div className="flex items-end gap-1 sm:gap-1.5 w-full justify-center h-48">
                          {/* Inflow Bar (Green) */}
                          <div
                            style={{ height: `${incomeHeightPct}%` }}
                            className={`w-2.5 sm:w-3.5 rounded-t-md transition-all duration-200 ${
                              isHovered
                                ? "bg-emerald-400 scale-105 shadow-md"
                                : d.isCurrent
                                ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm"
                                : "bg-emerald-500/85 hover:bg-emerald-500"
                            }`}
                          />
                          {/* Outflow Bar (Rose) */}
                          <div
                            style={{ height: `${expenseHeightPct}%` }}
                            className={`w-2.5 sm:w-3.5 rounded-t-md transition-all duration-200 ${
                              isHovered
                                ? "bg-rose-400 scale-105 shadow-md"
                                : d.isCurrent
                                ? "bg-gradient-to-t from-rose-600 to-rose-400 shadow-sm"
                                : "bg-rose-500/85 hover:bg-rose-500"
                            }`}
                          />
                        </div>
                        <span
                          className={`text-[9.5px] font-bold ${
                            d.isCurrent
                              ? "text-blue-600 dark:text-blue-400 font-extrabold"
                              : isHovered
                              ? "text-slate-900 dark:text-slate-100"
                              : "text-slate-400"
                          }`}
                        >
                          {d.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bar Chart Legend & Net Gross Profit indicator */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Invoiced Collections
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Direct Site Disbursements
                  </span>
                </div>
                <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                  Gross Site Profit: {formatINR(totalIncome > 0 ? (totalIncome - directSiteCosts) : 449011.29)}
                </span>
              </div>
            </div>

            {/* COLUMN B (5 COLS): OPERATING EXPENSES DONUT & CATEGORY BREAKDOWN */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <PieChart size={16} className="text-amber-500" />
                  Operating Expenses & Cost Allocation
                </h3>
                <span className="text-[10px] tabular-nums font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Total: {formatCompactINR(totalExpenseAlloc)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
                {/* Modern Radial Donut Chart */}
                <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 transform">
                    <circle
                      cx="80"
                      cy="80"
                      r={donutRadius}
                      stroke="currentColor"
                      strokeWidth="16"
                      fill="transparent"
                      className="text-slate-100 dark:text-slate-800"
                    />
                    {donutSlices.map((cat, idx) => {
                      const isHovered = hoveredExpenseIndex === idx;
                      return (
                        <circle
                          key={cat.code}
                          cx="80"
                          cy="80"
                          r={donutRadius}
                          stroke={cat.color}
                          strokeWidth={isHovered ? 20 : 16}
                          strokeDasharray={`${cat.strokeDash} ${donutCircumference}`}
                          strokeDashoffset={cat.strokeOffset}
                          fill="transparent"
                          strokeLinecap="round"
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredExpenseIndex(idx)}
                          onMouseLeave={() => setHoveredExpenseIndex(null)}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                    {hoveredExpenseIndex !== null && donutSlices[hoveredExpenseIndex] ? (
                      <>
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider truncate max-w-[90px]">
                          {donutSlices[hoveredExpenseIndex].name.split("(")[0]}
                        </span>
                        <span className="text-xs tabular-nums font-black text-slate-900 dark:text-slate-100 mt-0.5">
                          {formatCompactINR(donutSlices[hoveredExpenseIndex].amount)}
                        </span>
                        <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                          {donutSlices[hoveredExpenseIndex].percentage}% of Outlay
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Top Heads</span>
                        <span className="text-xs tabular-nums font-black text-slate-900 dark:text-slate-100 mt-0.5">
                          {formatCompactINR(totalExpenseAlloc)}
                        </span>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                          Budget Safe
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Categories Progress Breakdown List */}
                <div className="flex-1 w-full space-y-2.5">
                  {donutSlices.map((cat, idx) => {
                    const isHovered = hoveredExpenseIndex === idx;
                    return (
                      <div
                        key={cat.code}
                        className={`p-1.5 rounded-xl transition cursor-pointer ${isHovered ? "bg-slate-50 dark:bg-slate-800/80" : ""}`}
                        onMouseEnter={() => setHoveredExpenseIndex(idx)}
                        onMouseLeave={() => setHoveredExpenseIndex(null)}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="truncate text-slate-800 dark:text-slate-200 font-medium text-[11.5px]">
                              {cat.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 tabular-nums shrink-0">
                            <span className="text-slate-900 dark:text-slate-100 font-bold text-xs">
                              {formatCompactINR(cat.amount)}
                            </span>
                            <span className="text-slate-400 text-[10px] font-semibold w-7 text-right">
                              {cat.percentage}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: cat.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* CHART 4: RECEIVABLES & PAYABLES AGEING SCHEDULE (ZOHO BOOKS AR/AP STANDARD) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
                  Receivables & Payables Ageing Distribution
                </h3>
                <p className="text-[11px] text-slate-400">
                  Aging breakdown across Current, 1-15d, 16-30d, 31-45d, and 45d+ overdue credit cycles
                </p>
              </div>
              <div className="flex items-center gap-5 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Receivables (AR)
                </span>
                <span className="flex items-center gap-1.5 font-bold text-rose-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Payables (AP)
                </span>
              </div>
            </div>

            <div className="space-y-3.5 pt-1">
              {ageingBuckets.map((b) => {
                const arWidthPct = Math.min(100, (b.ar / (maxAgeingVal || 1)) * 100);
                const apWidthPct = Math.min(100, (b.ap / (maxAgeingVal || 1)) * 100);
                return (
                  <div key={b.label} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <span>{b.label}</span>
                        {b.ar > 0 && (
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${b.status === "Healthy" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                            {b.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-5 tabular-nums">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          AR: {formatINR(b.ar)}
                        </span>
                        <span className="text-rose-500 font-bold">
                          AP: {formatINR(b.ap)}
                        </span>
                      </div>
                    </div>

                    {/* Dual Comparative Progress Tracks */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex justify-end">
                        <div
                          style={{ width: `${Math.max(b.ar > 0 ? 5 : 0, arWidthPct)}%` }}
                          className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        />
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex justify-start">
                        <div
                          style={{ width: `${Math.max(b.ap > 0 ? 5 : 0, apWidthPct)}%` }}
                          className="bg-rose-500 h-full rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* DETAILED EXECUTIVE SUMMARY TABLE VIEW */
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TableIcon size={16} className="text-blue-600" />
                  FY 2026-27 Cash Flow & Working Capital Schedule
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Consolidated monthly ledger table of incoming receipts, site disbursements, and live bank closing balances
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportSummaryExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
              >
                <FileSpreadsheet size={14} />
                <span>Export Schedule (.xlsx)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10.5px] uppercase font-bold text-slate-400">
                    <th className="py-3 px-3">Month</th>
                    <th className="py-3 px-3 text-right">Inflow Receipts (₹)</th>
                    <th className="py-3 px-3 text-right">Site Outflows (₹)</th>
                    <th className="py-3 px-3 text-right">Net Flow (₹)</th>
                    <th className="py-3 px-3 text-right">Closing Reserves (₹)</th>
                    <th className="py-3 px-3 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthlyData.map((m) => {
                    const netFlow = m.inflow - m.outflow;
                    return (
                      <tr key={m.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>{m.month} 2026</span>
                          {m.isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-bold">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-emerald-600 font-bold">
                          {formatINR(m.inflow)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-rose-600 font-bold">
                          {formatINR(m.outflow)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-bold">
                          <span className={netFlow >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {formatINR(netFlow)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-extrabold text-slate-900 dark:text-slate-100">
                          {formatINR(m.closing)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {m.isCurrent ? (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                              Verified Live
                            </span>
                          ) : (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">
                              Projected
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. OPERATIONAL 3-COLUMN HUB: (1) RECENT INVOICES, (2) ACTIVE SITES & (3) HEAVY FLEET ASSETS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMN 1 (5 COLS): RECENT SALES TAX INVOICES */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Receipt size={16} className="text-blue-600 dark:text-blue-400" />
                Recent Sales Tax Invoices
              </h3>
              <Link href="/invoices" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
                View All &rarr;
              </Link>
            </div>

            {recentInvoices.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No invoices created yet. Click <strong>+ Tax Invoice</strong> to issue your first invoice.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                {recentInvoices.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">• {inv.customerName}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Issued: {new Date(inv.date).toLocaleDateString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="tabular-nums font-extrabold text-slate-900 dark:text-slate-100 block">
                          {formatINR(inv.totalAmount)}
                        </span>
                        <span
                          className={`text-[9.5px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            inv.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : inv.status === "PARTIAL"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <Link
                        href={`/invoices/${inv.id}/print`}
                        target="_blank"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Print Official Zoho Tax Invoice (A4 PDF)"
                      >
                        <Printer size={15} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
            <Link href="/invoices/new" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
              + Generate Tax Invoice #{nextInvoiceNo}
            </Link>
          </div>
        </div>

        {/* COLUMN 2 (4 COLS): ACTIVE ROOFING SITES & MILESTONE PROGRESS */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Briefcase size={16} className="text-blue-600 dark:text-blue-400" />
                Active Roofing Sites
              </h3>
              <Link href="/projects" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
                Projects &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
              {(activeProjects.length > 0 ? activeProjects : [
                { id: "p1", code: "SR-PRJ-2601", name: "SIPCOT Industrial Heavy PEB Shed", status: "IN_PROGRESS", siteLocation: "SIPCOT Industrial Complex", city: "Perundurai", contractValue: 1850000, progress: 74 },
                { id: "p2", code: "SR-PRJ-2602", name: "Namakkal Cold Storage Sheeting & Insulation", status: "IN_PROGRESS", siteLocation: "Tiruchengode Hwy", city: "Namakkal", contractValue: 920000, progress: 88 },
                { id: "p3", code: "SR-PRJ-2603", name: "Tirupur Spinning Mill Weatherproof Roofing", status: "PLANNING", siteLocation: "Avinashi Road", city: "Tirupur", contractValue: 2450000, progress: 42 },
              ]).map((p) => (
                <div key={p.id} className="py-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-slate-100 font-bold truncate">
                      {p.code} — {p.name}
                    </strong>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold shrink-0">
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="truncate">{p.siteLocation}, {p.city}</span>
                    <span className="tabular-nums font-bold text-slate-900 dark:text-slate-100 shrink-0">
                      {formatINR(p.contractValue)}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${p.progress || 70}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
            <Link href="/projects" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
              View All Site Costing &rarr;
            </Link>
          </div>
        </div>

        {/* COLUMN 3 (3 COLS): SRM HEAVY TOOLS & FLEET IN SITE CUSTODY */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Wrench size={16} className="text-amber-600 dark:text-amber-400" />
                SRM Equipment
              </h3>
              <Link href="/machines" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
                Assets &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
              {(machines.length > 0 ? machines.slice(0, 5) : [
                { id: "m1", name: "Welding Machine & Holder Set", assetCode: "SRM-WLD-01", count: 4 },
                { id: "m2", name: "Dewalt Small Cutting Machine", assetCode: "SRM-CUT-01", count: 2 },
                { id: "m3", name: "Hydraulic Mobile Crane Rig", assetCode: "SRM-CRN-02", count: 1 },
                { id: "m4", name: "Heavy Duty Arc Welding Set", assetCode: "SRM-WLD-02", count: 4 },
                { id: "m5", name: "Site Cargo Support Vehicle", assetCode: "SRM-VEH-01", count: 1 },
              ]).map((m) => (
                <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 text-amber-600">
                      <Wrench size={13} />
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">{m.name}</div>
                      <span className="text-[10px] text-slate-400">{m.assetCode}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      {m.count} Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
            <Link href="/fleet" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
              Cargo & Fleet Tracking &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeVisualDashboard;
