"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  FileSpreadsheet,
  Printer,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
} from "lucide-react";
import { ExcelImportModal } from "./ExcelImportModal";
import { downloadSampleExcel } from "@/lib/exportUtils";

export interface ChartMetric {
  label: string;
  value: string | number;
  sub?: string;
  trend?: string;
  isPositive?: boolean;
  color?: string;
}

export interface ViewFilterOption {
  id?: string;
  value?: string;
  label: string;
  count?: number;
}

export type SampleColumn = string | {
  header: string;
  example?: string | number;
};

export interface PrimaryActionConfig {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: any;
}

export interface ModuleHeaderWithAnalyticsProps {
  title: string;
  subtitle?: string;
  icon?: any;
  badge?: string;
  storageKey?: string;
  
  // Analytics
  analyticsPreset?: "sales" | "parties" | "purchases" | "banking" | "operations" | "hr";
  analyticsMetrics?: ChartMetric[];
  analyticsCards?: any[];
  chart1Title?: string;
  chart2Title?: string;
  chart1Data?: any[];
  chart2Data?: any[];
  customCharts?: React.ReactNode;
  defaultShowAnalytics?: boolean;
  
  // Search & Filters
  searchQuery?: string;
  searchValue?: string;
  onSearchChange?: (q: string) => void;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  viewOptions?: ViewFilterOption[];
  views?: ViewFilterOption[];
  activeView?: string;
  selectedView?: string;
  onViewChange?: (view: any) => void;
  
  // Import & Export
  sampleColumns?: SampleColumn[];
  sampleData?: any[];
  sampleFilename?: string;
  onImport?: (rows: any[]) => Promise<{ success: boolean; message?: string; count?: number }>;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  
  // Primary CTA & Custom Actions
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionHref?: string;
  primaryAction?: PrimaryActionConfig;
  customActions?: React.ReactNode;
  
  onRefresh?: () => void;
  extraControls?: React.ReactNode;

  // Convenience count & export props
  totalCount?: number;
  activeCount?: number;
  archivedCount?: number;
  charts?: any[];
  onImportExcel?: () => void;
  onPrintPDF?: () => void;
}

export function ModuleHeaderWithAnalytics({
  title,
  subtitle,
  icon: Icon,
  badge,
  analyticsPreset = "sales",
  analyticsMetrics,
  analyticsCards,
  chart1Title,
  chart2Title,
  chart1Data,
  chart2Data,
  customCharts,
  defaultShowAnalytics = true,
  searchQuery,
  searchValue,
  onSearchChange,
  onSearch,
  searchPlaceholder = "Search records...",
  viewOptions,
  views,
  activeView,
  selectedView,
  onViewChange,
  sampleColumns,
  sampleData,
  sampleFilename,
  onImport,
  onExportExcel,
  onExportPDF,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionHref,
  primaryAction,
  customActions,
  onRefresh,
  extraControls,
  storageKey,
}: ModuleHeaderWithAnalyticsProps) {
  const effectiveStorageKey =
    storageKey ||
    (title.toLowerCase().includes("attendance")
      ? "sr_attendance_show_analytics"
      : `sr_analytics_${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`);

  const [showAnalytics, setShowAnalytics] = useState(defaultShowAnalytics);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(effectiveStorageKey);
      if (saved !== null) {
        setShowAnalytics(saved === "true");
      }
    } catch (e) {}
  }, [effectiveStorageKey]);

  const toggleAnalytics = () => {
    setShowAnalytics((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(effectiveStorageKey, String(next));
      } catch (e) {}
      return next;
    });
  };

  const [showImportModal, setShowImportModal] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  // Harmonize alias props
  const effectiveSearch = searchValue !== undefined ? searchValue : searchQuery;
  const effectiveOnSearch = onSearchChange || onSearch;
  const effectiveViews = viewOptions || views || [];
  const effectiveActiveView = selectedView !== undefined ? selectedView : activeView;
  const effectivePrimaryLabel = primaryAction?.label || primaryActionLabel;
  const effectivePrimaryAction = primaryAction?.onClick || onPrimaryAction;
  const effectivePrimaryHref = primaryAction?.href || primaryActionHref;
  const PrimaryActionIcon = primaryAction?.icon || Plus;
  const effectiveExtraControls = customActions || extraControls;

  // Default Metrics if not provided or support analyticsCards
  const cardsToMetrics: ChartMetric[] = (analyticsCards && analyticsCards.length > 0)
    ? analyticsCards.map((c: any) => ({
        label: c.label || c.title || "",
        value: c.value || "",
        trend: c.trend || c.change || "",
        isPositive: c.isPositive !== false,
        sub: c.sub || "",
      }))
    : [];

  const metrics: ChartMetric[] = (analyticsMetrics && analyticsMetrics.length > 0)
    ? analyticsMetrics
    : cardsToMetrics.length > 0
    ? cardsToMetrics
    : [
        { label: "Active Volume", value: "₹ 15,48,200", trend: "+12.4%", isPositive: true, sub: "Current fiscal run-rate" },
        { label: "Pending Processing", value: "4 Records", trend: "On Schedule", isPositive: true, sub: "Awaiting next stage" },
        { label: "Completion Rate", value: "98.2%", trend: "+2.1%", isPositive: true, sub: "SLA compliance" },
        { label: "Audited Ledger Balance", value: "₹ 24,03,272", trend: "Reconciled", isPositive: true, sub: "ICICI & Cash Books" },
      ];

  const handleDownloadSample = () => {
    if (sampleColumns && sampleColumns.length > 0) {
      const normalized = sampleColumns.map((c) =>
        typeof c === "string" ? { header: c, example: `Sample ${c}` } : { header: c.header, example: c.example ?? "" }
      );
      downloadSampleExcel(normalized, sampleFilename || `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_sample_template`);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. SIGNATURE EXECUTIVE HERO COMMAND BANNER */}
      <div className="bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-900/10 border border-indigo-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          {Icon && (
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 flex items-center justify-center shrink-0 shadow-inner">
              <Icon size={22} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-extrabold text-white tracking-tight leading-tight">
                {title}
              </h1>
              {badge && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/25 text-indigo-100 border border-indigo-400/35 uppercase tracking-wide">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-[13px] text-indigo-200/85 mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Analytics Toggle */}
          <button
            type="button"
            onClick={toggleAnalytics}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              showAnalytics
                ? "bg-indigo-500/30 border-indigo-400/40 text-white"
                : "bg-white/10 hover:bg-white/15 border-white/15 text-white"
            }`}
            title="Toggle Visual Analytics Strip"
          >
            <BarChart3 size={14} className="text-indigo-200" />
            <span>{showAnalytics ? "Hide Analytics" : "Show Analytics"}</span>
            {showAnalytics ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {/* Import Excel */}
          {(onImport || sampleColumns) && (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Bulk Import Records from Excel / CSV"
            >
              <Upload size={13} className="text-indigo-200" />
              <span>Import Excel</span>
            </button>
          )}

          {/* Export Excel (.xlsx) */}
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Download Filtered Records as Excel (.xlsx)"
            >
              <FileSpreadsheet size={13} className="text-emerald-300" />
              <span>Export (.xlsx)</span>
            </button>
          )}

          {/* Print / PDF */}
          {onExportPDF && (
            <button
              type="button"
              onClick={onExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Generate Printable PDF Report (A4)"
            >
              <Printer size={13} className="text-indigo-200" />
              <span>Print / PDF</span>
            </button>
          )}

          {/* Primary CTA */}
          {effectivePrimaryLabel && (
            effectivePrimaryHref ? (
              <a
                href={effectivePrimaryHref}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 transition active:scale-95"
              >
                <PrimaryActionIcon size={14} />
                <span>{effectivePrimaryLabel}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={effectivePrimaryAction}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 transition active:scale-95 cursor-pointer"
              >
                <PrimaryActionIcon size={14} />
                <span>{effectivePrimaryLabel}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* 2. COLLAPSIBLE VISUAL ANALYTICS STRIP */}
      {showAnalytics && (
        <div className="space-y-3 p-4 bg-gradient-to-b from-slate-50/70 to-white dark:from-slate-900/60 dark:to-slate-900/30 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs transition animate-in fade-in duration-200">
          {/* Top 4 Mini KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.map((m, idx) => (
              <div
                key={idx}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    {m.label}
                  </span>
                  {m.trend && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                        m.isPositive !== false
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                      }`}
                    >
                      {m.isPositive !== false ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {m.trend}
                    </span>
                  )}
                </div>
                <div className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                  {m.value}
                </div>
                {m.sub && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                    {m.sub}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Side-by-Side Responsive Charts */}
          {customCharts ? (
            customCharts
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
              {/* Chart 1: Bar / Area Analytics */}
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    {chart1Title || getDefaultChart1Title(analyticsPreset)}
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    FY 2026-27 (Apr - Mar)
                  </span>
                </div>

                {/* SVG Bar Chart */}
                <div className="relative h-40 w-full flex items-end justify-between gap-1.5 pt-4 px-2 border-b border-slate-200 dark:border-slate-800">
                  {renderPresetBarChart(analyticsPreset, hoveredBar, setHoveredBar)}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 px-1">
                  <span>Apr</span>
                  <span>Jun</span>
                  <span>Aug</span>
                  <span>Oct</span>
                  <span>Dec</span>
                  <span>Feb</span>
                  <span>Mar</span>
                </div>
              </div>

              {/* Chart 2: Donut / Distribution Breakdown */}
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    {chart2Title || getDefaultChart2Title(analyticsPreset)}
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Distribution
                  </span>
                </div>

                {renderPresetDonutChart(analyticsPreset, hoveredSlice, setHoveredSlice)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. ZOHO MODULE TOOLBAR (Filter Dropdown, Instant Search & Refresh) */}
      {(effectiveViews.length > 0 || effectiveSearch !== undefined || onRefresh || effectiveExtraControls) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* View Filter Dropdown */}
            {effectiveViews.length > 0 && (
              <div className="relative shrink-0">
                <select
                  value={effectiveActiveView}
                  onChange={(e) => onViewChange?.(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-xs"
                >
                  {effectiveViews.map((opt, i) => {
                    const optVal = opt.value ?? opt.id ?? String(i);
                    return (
                      <option key={optVal} value={optVal}>
                        {opt.label} {opt.count !== undefined ? `(${opt.count})` : ""}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            )}

            {/* Instant Search Bar */}
            {effectiveSearch !== undefined && (
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={effectiveSearch}
                  onChange={(e) => effectiveOnSearch?.(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>
            )}

            {effectiveExtraControls}
          </div>

          {/* Right side controls */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Refresh List"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      )}

      {/* 4. TURNKEY EXCEL IMPORT MODAL */}
      {sampleColumns && (
        <ExcelImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title={`Bulk Import ${title}`}
          sampleColumns={sampleColumns}
          sampleFilename={sampleFilename || `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_sample`}
          onImport={onImport || (async () => ({ success: true }))}
        />
      )}
    </div>
  );
}

function getDefaultChart1Title(preset: string): string {
  switch (preset) {
    case "parties":
      return "Top 5 Party Volume & Exposure";
    case "purchases":
      return "Monthly Procurement Outflow";
    case "banking":
      return "Inflow vs. Outflow Cash Activity";
    case "operations":
      return "Site Budget vs. Actual Expenses";
    case "hr":
      return "Daily Shift Attendance & Muster";
    case "sales":
    default:
      return "Monthly Billed Volume & Pipeline";
  }
}

function getDefaultChart2Title(preset: string): string {
  switch (preset) {
    case "parties":
      return "Accounts Ageing Brackets";
    case "purchases":
      return "Vendor & Expense Category Share";
    case "banking":
      return "Liquidity & Bank Account Balances";
    case "operations":
      return "Asset & Inventory Utilization";
    case "hr":
      return "Monthly Payroll & Advance Trends";
    case "sales":
    default:
      return "Status & Settlement Distribution";
  }
}

function renderPresetBarChart(preset: string, hovered: number | null, setHovered: (i: number | null) => void) {
  const bars = [
    { label: "Apr", val1: 42, val2: 30, amount: "₹ 4,49,012" },
    { label: "May", val1: 58, val2: 44, amount: "₹ 5,82,400" },
    { label: "Jun", val1: 65, val2: 40, amount: "₹ 6,10,000" },
    { label: "Jul", val1: 48, val2: 52, amount: "₹ 4,90,500" },
    { label: "Aug", val1: 72, val2: 60, amount: "₹ 7,20,300" },
    { label: "Sep", val1: 85, val2: 55, amount: "₹ 8,45,000" },
    { label: "Oct", val1: 60, val2: 45, amount: "₹ 6,05,200" },
    { label: "Nov", val1: 78, val2: 62, amount: "₹ 7,80,000" },
    { label: "Dec", val1: 52, val2: 48, amount: "₹ 5,20,400" },
    { label: "Jan", val1: 68, val2: 50, amount: "₹ 6,75,000" },
    { label: "Feb", val1: 80, val2: 58, amount: "₹ 8,10,200" },
    { label: "Mar", val1: 94, val2: 70, amount: "₹ 9,40,000" },
  ];

  return bars.map((b, i) => (
    <div
      key={i}
      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
      onMouseEnter={() => setHovered(i)}
      onMouseLeave={() => setHovered(null)}
    >
      {hovered === i && (
        <div className="absolute -top-10 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-30 tabular-nums">
          <span className="font-bold">{b.label}:</span> {b.amount}
        </div>
      )}
      <div className="w-full max-w-[18px] flex items-end gap-0.5 h-full">
        <div
          style={{ height: `${b.val1}%` }}
          className={`w-full rounded-t-sm transition-all duration-200 ${
            hovered === i
              ? "bg-blue-600 dark:bg-blue-500 scale-y-105"
              : "bg-blue-500/80 dark:bg-blue-600/80 hover:bg-blue-600"
          }`}
        />
        {preset === "banking" && (
          <div
            style={{ height: `${b.val2}%` }}
            className={`w-full rounded-t-sm transition-all duration-200 ${
              hovered === i ? "bg-rose-500" : "bg-rose-400/80"
            }`}
          />
        )}
      </div>
    </div>
  ));
}

function renderPresetDonutChart(preset: string, hovered: number | null, setHovered: (i: number | null) => void) {
  let slices = [
    { label: "Paid / Settled", count: "₹ 11,20,000", pct: 62, color: "#10b981" },
    { label: "Unpaid / Active", count: "₹ 4,80,000", pct: 28, color: "#3b82f6" },
    { label: "Overdue / Follow-up", count: "₹ 1,12,000", pct: 7, color: "#f59e0b" },
    { label: "Archived / Draft", count: "₹ 45,000", pct: 3, color: "#94a3b8" },
  ];

  if (preset === "parties") {
    slices = [
      { label: "0-15 Days (Current)", count: "₹ 8,40,000", pct: 54, color: "#10b981" },
      { label: "16-30 Days (Normal)", count: "₹ 4,20,000", pct: 27, color: "#3b82f6" },
      { label: "31-60 Days (Action)", count: "₹ 2,10,000", pct: 14, color: "#f59e0b" },
      { label: "60+ Days (Critical)", count: "₹ 75,000", pct: 5, color: "#ef4444" },
    ];
  } else if (preset === "purchases") {
    slices = [
      { label: "Raw Steel & Trusses", count: "₹ 6,40,000", pct: 45, color: "#3b82f6" },
      { label: "Roofing Sheets & Purlins", count: "₹ 4,10,000", pct: 29, color: "#6366f1" },
      { label: "Hardware & Consumables", count: "₹ 2,20,000", pct: 16, color: "#14b8a6" },
      { label: "Crane & Transport Hire", count: "₹ 1,40,000", pct: 10, color: "#f59e0b" },
    ];
  } else if (preset === "banking") {
    slices = [
      { label: "ICICI Bank (A/C 3161)", count: "₹ 24,03,272", pct: 86, color: "#2563eb" },
      { label: "Main Office Petty Cash", count: "₹ 1,85,400", pct: 7, color: "#10b981" },
      { label: "Site Advance Float", count: "₹ 1,20,000", pct: 4, color: "#f59e0b" },
      { label: "Security Deposits", count: "₹ 85,000", pct: 3, color: "#64748b" },
    ];
  } else if (preset === "operations") {
    slices = [
      { label: "Active Roofing Sites", count: "12 Sites", pct: 55, color: "#3b82f6" },
      { label: "SRM Machine Assets", count: "35 Units", pct: 25, color: "#10b981" },
      { label: "Fleet in Transit", count: "2 Vehicles", pct: 12, color: "#f59e0b" },
      { label: "Yard Stock Inventory", count: "₹ 14,80,000", pct: 8, color: "#6366f1" },
    ];
  } else if (preset === "hr") {
    slices = [
      { label: "Full Day Present", count: "28 Staff", pct: 78, color: "#10b981" },
      { label: "Overtime Crews", count: "6 Crews", pct: 14, color: "#3b82f6" },
      { label: "Half Day Shift", count: "2 Staff", pct: 5, color: "#f59e0b" },
      { label: "On Leave / Absent", count: "1 Staff", pct: 3, color: "#ef4444" },
    ];
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
      {/* SVG Donut */}
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
          {(() => {
            let accumulatedPct = 0;
            return slices.map((s, idx) => {
              const dashLength = (s.pct / 100) * (2 * Math.PI * 38);
              const gapLength = 2 * Math.PI * 38 - dashLength;
              const strokeOffset = -(accumulatedPct / 100) * (2 * Math.PI * 38);
              accumulatedPct += s.pct;
              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke={s.color}
                  strokeWidth={hovered === idx ? 20 : 16}
                  strokeDasharray={`${dashLength} ${gapLength}`}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHovered(idx)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            });
          })()}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Total</span>
          <span className="text-xs font-black text-slate-800 dark:text-slate-100 tabular-nums">100%</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-1.5 flex-1 min-w-0 w-full">
        {slices.map((s, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition cursor-pointer ${
              hovered === idx ? "bg-slate-100 dark:bg-slate-800 font-bold" : ""
            }`}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-slate-700 dark:text-slate-300 truncate text-[11px]">{s.label}</span>
            </div>
            <div className="flex items-center gap-2 tabular-nums shrink-0">
              <span className="text-slate-900 dark:text-slate-100 font-bold text-[11px]">{s.count}</span>
              <span className="text-slate-400 text-[10px] w-8 text-right font-medium">{s.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ModuleHeaderWithAnalytics;
