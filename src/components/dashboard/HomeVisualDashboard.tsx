"use client";

import { useState } from "react";
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
  Info,
} from "lucide-react";

interface MonthlyPoint {
  month: string;
  inflow: number;
  outflow: number;
  closing: number;
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

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
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

  // SVG Chart Dimensions & Calculation
  const chartWidth = 900;
  const chartHeight = 240;
  const paddingX = 40;
  const paddingY = 30;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  const maxClosing = Math.max(
    ...monthlyData.map((d) => d.closing),
    3000000
  );
  const minClosing = 0;

  const getX = (index: number) =>
    paddingX + (index / (monthlyData.length - 1)) * innerWidth;
  const getY = (val: number) =>
    chartHeight - paddingY - (val / (maxClosing || 1)) * innerHeight;

  // Path generator for Area & Line
  const points = monthlyData.map((d, i) => ({
    x: getX(i),
    y: getY(d.closing),
  }));

  const linePath = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ""
  );

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    chartHeight - paddingY
  } L ${points[0].x} ${chartHeight - paddingY} Z`;

  // Bar Chart calculations
  const maxMonthlyCash = Math.max(
    ...monthlyData.map((d) => Math.max(d.inflow, d.outflow)),
    500000
  );

  // Donut chart calculations
  const totalDonutAmount = expenseCategories.reduce((sum, c) => sum + c.amount, 0) || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="space-y-6 font-sans pb-12 select-none">
      {/* Executive Command & Quick Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20 text-sm">
            SR
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Standard Roofs • Executive Command
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                FY {fyName} Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Super Admin: Prabhakaran T • Erode Headquarters • GSTIN: 33AEWFS5187G1ZD
            </p>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Visual vs Detailed Table View Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setActiveView("visual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeView === "visual"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
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
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <TableIcon size={14} />
              <span>Summary Table</span>
            </button>
          </div>

          <Link
            href="/invoices/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Receipt size={14} />
            <span>+ Tax Invoice #{nextInvoiceNo}</span>
          </Link>

          <Link
            href="/estimates"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Plus size={14} />
            <span>+ Quote</span>
          </Link>
        </div>
      </div>

      {/* 4 Core Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receivables */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-blue-600" /> Total Receivables
              </span>
              <Link href="/invoices" className="text-xs text-blue-600 font-bold hover:underline">
                Invoices &rarr;
              </Link>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-2">
              {formatCurrency(totalReceivables)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Current: {formatCurrency(currentReceivables)} • Overdue: {formatCurrency(overdueReceivables)}
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full"
              style={{
                width: totalReceivables === 0 ? "100%" : `${(currentReceivables / (totalReceivables || 1)) * 100}%`,
              }}
            />
            <div
              className="bg-amber-500 h-full"
              style={{
                width: totalReceivables === 0 ? "0%" : `${(overdueReceivables / (totalReceivables || 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Total Payables */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <TrendingDown size={14} className="text-rose-500" /> Total Payables
              </span>
              <Link href="/bills" className="text-xs text-blue-600 font-bold hover:underline">
                Bills &rarr;
              </Link>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-2">
              {formatCurrency(totalPayables)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Current: {formatCurrency(currentPayables)} • Overdue: {formatCurrency(overduePayables)}
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden flex">
            <div
              className="bg-blue-500 h-full"
              style={{
                width: totalPayables === 0 ? "100%" : `${(currentPayables / (totalPayables || 1)) * 100}%`,
              }}
            />
            <div
              className="bg-rose-500 h-full"
              style={{
                width: totalPayables === 0 ? "0%" : `${(overduePayables / (totalPayables || 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Cash & Bank Liquidity */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Landmark size={14} className="text-emerald-600" /> Cash & Bank Liquidity
              </span>
              <Link href="/banking" className="text-xs text-blue-600 font-bold hover:underline">
                ICICI &rarr;
              </Link>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">
              {formatCurrency(totalLiquidity)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              ICICI Bank ...3161: {formatCurrency(iciciBalance)}
            </p>
          </div>
          <div className="w-full bg-emerald-500/20 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-emerald-500 h-full w-full" />
          </div>
        </div>

        {/* Net Operating Profit */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <DollarSign size={14} className="text-teal-600" /> Net Operating Profit
              </span>
              <Link href="/reports" className="text-xs text-blue-600 font-bold hover:underline">
                P&L &rarr;
              </Link>
            </div>
            <div className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono mt-2">
              {formatCurrency(netSurplus)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Income: {formatCurrency(totalIncome)} • Exp: {formatCurrency(totalExpense)}
            </p>
          </div>
          <div className="w-full bg-teal-500/20 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-teal-500 h-full w-full" />
          </div>
        </div>
      </div>

      {/* Main View: Visual Charts vs Detailed Summary Table */}
      {activeView === "visual" ? (
        <div className="space-y-6">
          {/* Chart 1: Interactive SVG Cash Flow Trajectory */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Landmark className="text-blue-600" size={18} /> Cash Flow Trajectory (Fiscal Year Apr 2026 – Mar 2027)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Monthly closing liquidity curve, net working capital, and opening liquidity anchor
                </p>
              </div>

              <div className="flex items-center gap-5 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Opening ICICI Balance</span>
                  <strong className="text-sm text-slate-900 dark:text-slate-100">₹ 24,03,272.00</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Live Closing Liquidity</span>
                  <strong className="text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(totalLiquidity)}</strong>
                </div>
              </div>
            </div>

            {/* Interactive SVG Area/Line Chart */}
            <div className="relative w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto min-w-[650px] overflow-visible"
              >
                <defs>
                  <linearGradient id="cashflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                  const y = chartHeight - paddingY - pct * innerHeight;
                  const labelVal = pct * maxClosing;
                  return (
                    <g key={pct}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingX - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-400 text-[9px] font-mono"
                      >
                        {labelVal >= 100000 ? `₹${(labelVal / 100000).toFixed(1)}L` : `₹${labelVal}`}
                      </text>
                    </g>
                  );
                })}

                {/* Area Fill */}
                <path d={areaPath} fill="url(#cashflowGrad)" />

                {/* Stroke Line */}
                <path
                  d={linePath}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {points.map((p, i) => {
                  const m = monthlyData[i];
                  const isHovered = hoveredMonth?.month === m.month;
                  return (
                    <g key={m.month}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 6 : 4}
                        fill={isHovered ? "#1d4ed8" : "#2563eb"}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setHoveredMonth(m)}
                        onMouseLeave={() => setHoveredMonth(null)}
                      />
                      <text
                        x={p.x}
                        y={chartHeight - 8}
                        textAnchor="middle"
                        className="fill-slate-400 text-[10px] font-bold"
                      >
                        {m.month}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip Overlay */}
              {hoveredMonth && (
                <div className="absolute top-2 right-4 bg-slate-900 text-white border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1 animate-in fade-in z-20">
                  <div className="font-bold text-blue-300">{hoveredMonth.month} 2026 Status</div>
                  <div>Inflow: <span className="font-mono text-emerald-400 font-bold">{formatCurrency(hoveredMonth.inflow)}</span></div>
                  <div>Outflow: <span className="font-mono text-rose-400 font-bold">{formatCurrency(hoveredMonth.outflow)}</span></div>
                  <div className="border-t border-slate-800 pt-1">
                    Closing Liquidity: <span className="font-mono text-white font-bold">{formatCurrency(hoveredMonth.closing)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Net Closing Balance
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Incoming Collections
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Outgoing Expenses
                </span>
              </div>
              <Link href="/banking" className="text-blue-600 font-bold hover:underline">
                Reconcile ICICI Bank Statement &rarr;
              </Link>
            </div>
          </div>

          {/* 2-Column Grid: Income vs Direct Site Expenses & Operating Expenses Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart 2: Income vs Direct Site Expenses Monthly Bar Chart */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-600" /> Monthly Income vs Direct Site Costs
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Collections generated vs site raw materials, machinery diesel, and labour muster
                  </p>
                </div>
                <Link href="/reports" className="text-xs text-blue-600 font-bold hover:underline">
                  P&L &rarr;
                </Link>
              </div>

              {/* Bar Chart Representation */}
              <div className="grid grid-cols-12 gap-1.5 h-36 items-end bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
                {monthlyData.map((d, idx) => {
                  const incomeHeightPct = Math.min(
                    100,
                    Math.max(6, (d.inflow / (maxMonthlyCash || 1)) * 100)
                  );
                  const expenseHeightPct = Math.min(
                    100,
                    Math.max(6, (d.outflow / (maxMonthlyCash || 1)) * 100)
                  );
                  return (
                    <div
                      key={d.month}
                      className="flex flex-col items-center justify-end h-full gap-1 group relative cursor-pointer"
                      title={`${d.month}: Inflow ${formatCurrency(d.inflow)}, Outflow ${formatCurrency(d.outflow)}`}
                    >
                      <div className="flex items-end gap-0.5 w-full justify-center h-28">
                        {/* Inflow bar */}
                        <div
                          style={{ height: `${incomeHeightPct}%` }}
                          className={`w-2.5 sm:w-3.5 rounded-t transition-all ${
                            d.inflow > 0 ? "bg-emerald-500 hover:bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"
                          }`}
                        />
                        {/* Outflow bar */}
                        <div
                          style={{ height: `${expenseHeightPct}%` }}
                          className={`w-2.5 sm:w-3.5 rounded-t transition-all ${
                            d.outflow > 0 ? "bg-rose-500 hover:bg-rose-400" : "bg-slate-200 dark:bg-slate-700"
                          }`}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">{d.month}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Income Collections
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Direct Site Expenses
                  </span>
                </div>
                <span className="font-mono text-emerald-600 font-bold">
                  Gross Site Profit: {formatCurrency(totalIncome - directSiteCosts)}
                </span>
              </div>
            </div>

            {/* Chart 3: Operating Expenses Breakdown Donut & Progress bars */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <PieChart size={16} className="text-amber-500" /> Top Expenses Breakdown
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Total: {formatCurrency(totalExpense)}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* SVG Donut Chart */}
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 transform">
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke="currentColor"
                      strokeWidth="18"
                      fill="transparent"
                      className="text-slate-100 dark:text-slate-800"
                    />
                    {expenseCategories.map((cat, idx) => {
                      const strokeDash = (cat.percentage / 100) * circumference;
                      const strokeOffset = -(accumulatedPercent / 100) * circumference;
                      accumulatedPercent += cat.percentage;
                      return (
                        <circle
                          key={cat.code}
                          cx="80"
                          cy="80"
                          r={radius}
                          stroke={cat.color}
                          strokeWidth="18"
                          strokeDasharray={`${strokeDash} ${circumference}`}
                          strokeDashoffset={strokeOffset}
                          fill="transparent"
                          className="transition-all hover:opacity-85"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Top 5</span>
                    <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-100 leading-none mt-1">
                      {formatCurrency(totalExpense)}
                    </span>
                  </div>
                </div>

                {/* Categories Progress list */}
                <div className="flex-1 w-full space-y-2">
                  {expenseCategories.map((cat) => (
                    <div key={cat.code} className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="truncate text-slate-800 dark:text-slate-200 font-medium">
                            {cat.name}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 shrink-0">
                          {formatCurrency(cat.amount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(5, cat.percentage)}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Detailed Summary Table View */
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TableIcon size={16} className="text-blue-600" /> FY 2026-27 Cash Flow & Liquidity Summary Schedule
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Consolidated monthly ledger table of incoming receipts, site disbursements, and live bank closing balances
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                12 Months Projected & Actuals
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3 text-right">Inflow Receipts (₹)</th>
                    <th className="py-2.5 px-3 text-right">Outflow Expenses (₹)</th>
                    <th className="py-2.5 px-3 text-right">Net Flow (₹)</th>
                    <th className="py-2.5 px-3 text-right">Closing Liquidity (₹)</th>
                    <th className="py-2.5 px-3 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthlyData.map((m, idx) => {
                    const netFlow = m.inflow - m.outflow;
                    return (
                      <tr key={m.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {m.month} 2026
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                          {formatCurrency(m.inflow)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">
                          {formatCurrency(m.outflow)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={netFlow >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {formatCurrency(netFlow)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                          {formatCurrency(m.closing)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {idx === 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                              Verified
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">
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

      {/* Operational 2-Column Grid: Recent Invoices & Roofing Projects / SRM Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Recent Invoices */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Receipt size={16} className="text-blue-600" /> Recent Sales Tax Invoices
            </h3>
            <Link href="/invoices" className="text-xs text-blue-600 font-bold hover:underline">
              View All Invoices &rarr;
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              No invoices created yet. Click <strong>+ Tax Invoice</strong> to issue your first invoice.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                      <span className="text-slate-500 font-medium">• {inv.customerName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Issued: {new Date(inv.date).toLocaleDateString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
                        {formatCurrency(inv.totalAmount)}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          inv.status === "PAID"
                            ? "text-emerald-600"
                            : inv.status === "PARTIAL"
                            ? "text-blue-600"
                            : "text-amber-600"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <Link
                      href={`/invoices/${inv.id}/print`}
                      target="_blank"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Print Official Zoho Tax Invoice"
                    >
                      <Printer size={15} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Active Roofing Sites & SRM Machine Custody */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Roofing Projects */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Briefcase size={16} className="text-blue-600" /> Active Roofing Sites
              </h3>
              <Link href="/projects" className="text-xs text-blue-600 font-bold hover:underline">
                All Projects &rarr;
              </Link>
            </div>

            {activeProjects.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No active projects found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeProjects.map((p) => (
                  <div key={p.id} className="py-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 dark:text-slate-100">{p.code} — {p.name}</strong>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>{p.siteLocation}, {p.city}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(p.contractValue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SRM Machine Custody Strip */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Wrench size={16} className="text-amber-600" /> SRM Tools in Site Custody
              </h3>
              <Link href="/machines" className="text-xs text-blue-600 font-bold hover:underline">
                View All Assets &rarr;
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {machines.map((m) => (
                <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt={m.name} className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Wrench size={12} className="text-slate-400" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{m.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{m.assetCode}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Working: {m.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
