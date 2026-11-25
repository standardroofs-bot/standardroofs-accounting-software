"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Coins,
  Users,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
  X,
  Search,
  Landmark,
  Wallet,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  Lock,
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

interface PayrollItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  category: string;
  company: string;
  totalWorkingDays: number;
  daysPresent: number;
  baseRate: number;
  grossSalary: number;
  otAndIncentive: number;
  nightDutyAmount: number;
  lastMonthBalance: number;
  advanceDeduction: number;
  expenseBalanceDeduction: number;
  netSalary: number;
  paidCash: number;
  paidBankOrGpay: number;
  paymentChannel: string;
  carryForwardBalance: number;
  isCleared: boolean;
  notes: string | null;
}

interface PayrollRun {
  id: string;
  cycleType: "MONTHLY_OFFICE" | "BI_MONTHLY_TAMIL" | "BI_MONTHLY_HINDI";
  month: string;
  halfPeriod: "FULL" | "FIRST_HALF" | "SECOND_HALF";
  companyFilter: string;
  status: "DRAFT" | "APPROVED" | "PAID";
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  paidCash: number;
  paidBank: number;
  approvedBy: string | null;
  approvedAt: string | null;
  items: PayrollItem[];
}

interface AvailableRunSummary {
  id: string;
  month: string;
  halfPeriod: string;
  status: string;
  totalNet: number;
  _count: { items: number };
}

const MONTHS_LIST = [
  "2026-12", "2026-11", "2026-10", "2026-09", "2026-08", "2026-07",
  "2026-06", "2026-05", "2026-04", "2026-03", "2026-02", "2026-01",
  "2025-12", "2025-11",
];

function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(val || 0));
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(m) - 1] || m} ${y}`;
}

export default function StandardPayrollPage() {
  const [cycleType, setCycleType] = useState<"MONTHLY_OFFICE" | "BI_MONTHLY_TAMIL" | "BI_MONTHLY_HINDI">("MONTHLY_OFFICE");
  const [month, setMonth] = useState("2026-10");
  const [halfPeriod, setHalfPeriod] = useState<"FULL" | "FIRST_HALF" | "SECOND_HALF">("FULL");
  const [companyFilter, setCompanyFilter] = useState<"ALL" | "STANDARD_ROOFS" | "INVI_CREATION">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [availableRuns, setAvailableRuns] = useState<AvailableRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [payslipItem, setPayslipItem] = useState<PayrollItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const effectiveHalf = cycleType === "MONTHLY_OFFICE" ? "FULL" : halfPeriod === "FULL" ? "FIRST_HALF" : halfPeriod;
      const params = new URLSearchParams({
        cycleType,
        month,
        halfPeriod: effectiveHalf,
        companyFilter,
      });
      const res = await fetch(`/api/payroll?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setRun(data.run);
        setAvailableRuns(data.availableRuns || []);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load payroll data", "error");
    } finally {
      setLoading(false);
    }
  }, [cycleType, month, halfPeriod, companyFilter]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  const handleTabChange = (nextCycle: "MONTHLY_OFFICE" | "BI_MONTHLY_TAMIL" | "BI_MONTHLY_HINDI") => {
    setCycleType(nextCycle);
    if (nextCycle === "MONTHLY_OFFICE") {
      setHalfPeriod("FULL");
      setMonth("2026-10");
    } else if (nextCycle === "BI_MONTHLY_TAMIL") {
      setHalfPeriod("FIRST_HALF");
      setMonth("2026-11");
    } else {
      setHalfPeriod("SECOND_HALF");
      setMonth("2026-09");
    }
  };

  const handleSyncFromAttendance = async () => {
    setSyncing(true);
    try {
      const effectiveHalf = cycleType === "MONTHLY_OFFICE" ? "FULL" : halfPeriod === "FULL" ? "FIRST_HALF" : halfPeriod;
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleType, month, halfPeriod: effectiveHalf }),
      });
      const data = await res.json();
      if (data.success) {
        setRun(data.run);
        showToast(`Synced ${data.syncedEmployees} personnel from Standard Attendance`);
        loadPayroll();
      } else {
        showToast(data.error || "Sync failed", "error");
      }
    } catch (err) {
      showToast("Network error while syncing attendance", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/payroll/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Imported ${data.runsImported} runs (${data.itemsImported} rows) from Excel`);
        loadPayroll();
      } else {
        showToast(data.error || "Import failed", "error");
      }
    } catch (err) {
      showToast("Error uploading Excel file", "error");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApproveRun = async () => {
    if (!run) return;
    setApproving(true);
    try {
      const res = await fetch("/api/payroll/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payrollRunId: run.id }),
      });
      const data = await res.json();
      if (data.success) {
        setRun(data.run);
        showToast(
          data.postedVoucher
            ? `Payroll marked PAID & posted to Ledger (${data.postedVoucher})`
            : "Payroll Run approved & marked PAID"
        );
      } else {
        showToast(data.error || "Approval failed", "error");
      }
    } catch (err) {
      showToast("Error approving payroll run", "error");
    } finally {
      setApproving(false);
    }
  };

  const handleInlinePatch = async (itemId: string, patch: Partial<PayrollItem>) => {
    try {
      const res = await fetch(`/api/payroll/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success && run) {
        setRun({
          ...run,
          ...data.run,
          items: run.items.map((it) => (it.id === itemId ? data.item : it)),
        });
        showToast(`Updated ${data.item.employeeName}`);
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch (err) {
      showToast("Failed to save inline edit", "error");
    }
  };

  const handleExportExcel = () => {
    if (!run || run.items.length === 0) return;
    const rows = run.items.map((it, idx) => ({
      "#": idx + 1,
      Code: it.employeeCode,
      Name: it.employeeName,
      Company: it.company,
      "Working Days": it.totalWorkingDays,
      "Days Present": it.daysPresent,
      "Base Rate (₹)": it.baseRate,
      "Gross Salary (₹)": it.grossSalary,
      "OT / Incentive (₹)": it.otAndIncentive,
      "Night Duty (₹)": it.nightDutyAmount,
      "Prev Balance (₹)": it.lastMonthBalance,
      "Advance Ded (₹)": it.advanceDeduction,
      "Expense Ded (₹)": it.expenseBalanceDeduction,
      "Net Salary (₹)": it.netSalary,
      "Paid Cash (₹)": it.paidCash,
      "Paid Bank/GPay (₹)": it.paidBankOrGpay,
      Channel: it.paymentChannel,
      "Carry Fwd Bal (₹)": it.carryForwardBalance,
      Cleared: it.isCleared ? "YES" : "NO",
      Notes: it.notes || "",
    }));
    exportToExcel(rows, `SR_Payroll_${cycleType}_${month}_${halfPeriod}`, "Payroll");
  };

  const visibleItems = (run?.items || []).filter((it) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      it.employeeName.toLowerCase().includes(q) ||
      it.employeeCode.toLowerCase().includes(q) ||
      (it.notes || "").toLowerCase().includes(q)
    );
  });

  const displayGross = visibleItems.reduce((s, it) => s + it.grossSalary, 0);
  const displayDeductions = visibleItems.reduce((s, it) => s + it.advanceDeduction + it.expenseBalanceDeduction, 0);
  const displayNet = visibleItems.reduce((s, it) => s + it.netSalary, 0);
  const displayCash = visibleItems.reduce((s, it) => s + it.paidCash, 0);
  const displayBank = visibleItems.reduce((s, it) => s + it.paidBankOrGpay, 0);
  const displayCarryForward = visibleItems.reduce((s, it) => s + it.carryForwardBalance, 0);

  return (
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-2 space-y-5 font-sans pb-16 text-slate-800">
      {/* 1. PAGE HEADER */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Coins size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                Standard Payroll & Wage Disbursement
              </h1>
              {run && (
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    run.status === "PAID"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {run.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Monthly Office Salary, 15-Day Tamil Labours & Hindi Crew Wages synced with Standard Attendance & General Ledger
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <Upload size={14} className="text-indigo-600" />
            <span>{importing ? "Importing..." : "Import Excel (.xlsx)"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!run || visibleItems.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleSyncFromAttendance}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            <span>{syncing ? "Syncing..." : "Sync from Attendance"}</span>
          </button>

          <button
            type="button"
            onClick={handleApproveRun}
            disabled={!run || approving || run.status === "PAID"}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {run?.status === "PAID" ? <Lock size={14} /> : <CheckCircle2 size={14} />}
            <span>
              {approving
                ? "Posting..."
                : run?.status === "PAID"
                ? "Posted to Accounts"
                : "Approve & Post to Accounts"}
            </span>
          </button>
        </div>
      </div>

      {/* 2. 3 SEGMENT TABS + PERIOD & COMPANY CONTROLS */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Segment Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleTabChange("MONTHLY_OFFICE")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              cycleType === "MONTHLY_OFFICE"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Office Staff (Monthly Salary)
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("BI_MONTHLY_TAMIL")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              cycleType === "BI_MONTHLY_TAMIL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tamil Labours (1–15 & 16–30 Wages)
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("BI_MONTHLY_HINDI")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              cycleType === "BI_MONTHLY_HINDI"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Hindi Crew (1–15 & 16–30 Wages)
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <Calendar size={13} className="text-indigo-600" />
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {MONTHS_LIST.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Half-Period Selector */}
          {cycleType !== "MONTHLY_OFFICE" && (
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setHalfPeriod("FIRST_HALF")}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  halfPeriod === "FIRST_HALF"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1st – 15th
              </button>
              <button
                type="button"
                onClick={() => setHalfPeriod("SECOND_HALF")}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  halfPeriod === "SECOND_HALF"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                16th – 30th
              </button>
            </div>
          )}

          {/* Company Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <Building2 size={13} className="text-slate-500" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Companies</option>
              <option value="STANDARD_ROOFS">Standard Roofs</option>
              <option value="INVI_CREATION">Invi Creation</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, code, notes..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* 3. 4 CLEAN EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Gross Payroll
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              {visibleItems.length} Personnel
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
            {formatINR(displayGross)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Earned base wages before deductions
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Deductions
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80">
              Advances + Exp
            </span>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2 tabular-nums">
            {formatINR(displayDeductions)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Mid-cycle cash advances & expense balances
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Net Payable
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              {formatMonthLabel(month)}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-2 tabular-nums">
            {formatINR(displayNet)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Includes OT, Night Duty & Prior Balances
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Disbursed & Balance
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Bal: {formatINR(displayCarryForward)}
            </span>
          </div>
          <div className="flex items-baseline gap-3 mt-2 tabular-nums">
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Cash</div>
              <div className="text-lg font-extrabold text-slate-900">{formatINR(displayCash)}</div>
            </div>
            <div className="text-slate-300">/</div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Bank / GPay</div>
              <div className="text-lg font-extrabold text-emerald-700">{formatINR(displayBank)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. INLINE-EDITABLE PAYROLL LEDGER TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Payroll Register — {formatMonthLabel(month)} (
              {cycleType === "MONTHLY_OFFICE"
                ? "Full Month"
                : halfPeriod === "FIRST_HALF"
                ? "1st to 15th"
                : "16th to End"}
              )
            </h2>
          </div>
          <div className="text-[11px] text-slate-500">
            Click any highlighted numeric cell to edit inline — Net Salary & Carry-Forward auto-recalculate
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading payroll register...</div>
        ) : visibleItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle size={32} className="mx-auto text-slate-400" />
            <div className="text-sm font-bold text-slate-700">
              No payroll run recorded for {formatMonthLabel(month)} ({halfPeriod})
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Click <strong>Sync from Attendance</strong> to automatically pull payable days, OT hours, and prior balances from Standard Attendance, or choose a historical period below.
            </p>
            {availableRuns.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                {availableRuns.slice(0, 8).map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => {
                      setMonth(ar.month);
                      setHalfPeriod(ar.halfPeriod as any);
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
                  >
                    {formatMonthLabel(ar.month)} {ar.halfPeriod !== "FULL" ? `(${ar.halfPeriod === "FIRST_HALF" ? "1-15" : "16-30"})` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-2 text-right">Days</th>
                  <th className="py-3 px-2 text-right">Rate (₹)</th>
                  <th className="py-3 px-2 text-right">Gross (₹)</th>
                  <th className="py-3 px-2 text-right">+ OT / Night / Prev</th>
                  <th className="py-3 px-2 text-right">- Adv / Exp</th>
                  <th className="py-3 px-2 text-right text-indigo-700">Net Salary</th>
                  <th className="py-3 px-2 text-right">Paid Cash</th>
                  <th className="py-3 px-2 text-right">Bank / GPay</th>
                  <th className="py-3 px-2">Channel</th>
                  <th className="py-3 px-2 text-right">Balance</th>
                  <th className="py-3 px-2">Notes</th>
                  <th className="py-3 px-3 text-center">Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item) => (
                  <PayrollTableRow
                    key={item.id}
                    item={item}
                    locked={run?.status === "PAID"}
                    onPatch={handleInlinePatch}
                    onPrint={() => setPayslipItem(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. PRINTABLE PAYSLIP MODAL */}
      {payslipItem && run && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  Standard Roofs • Payslip
                </div>
                <div className="text-[11px] text-slate-500">
                  {formatMonthLabel(run.month)} ({run.halfPeriod}) • {payslipItem.company}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayslipItem(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <div className="text-base font-extrabold text-slate-900">
                    {payslipItem.employeeName}
                  </div>
                  <div className="text-slate-500 font-mono">{payslipItem.employeeCode}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500">Attendance</div>
                  <div className="font-bold text-slate-900 tabular-nums">
                    {payslipItem.daysPresent} / {payslipItem.totalWorkingDays} Days
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Earnings</div>
                  <div className="flex justify-between">
                    <span>Gross Pay</span>
                    <span className="font-bold tabular-nums">{formatINR(payslipItem.grossSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OT / Incentive</span>
                    <span className="font-bold tabular-nums">{formatINR(payslipItem.otAndIncentive)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Night Duty</span>
                    <span className="font-bold tabular-nums">{formatINR(payslipItem.nightDutyAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prior Balance</span>
                    <span className="font-bold tabular-nums">{formatINR(payslipItem.lastMonthBalance)}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Deductions</div>
                  <div className="flex justify-between text-rose-600">
                    <span>Advance Deducted</span>
                    <span className="font-bold tabular-nums">-{formatINR(payslipItem.advanceDeduction)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Expense Balance</span>
                    <span className="font-bold tabular-nums">-{formatINR(payslipItem.expenseBalanceDeduction)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-indigo-700">Net Payable</div>
                  <div className="text-xl font-extrabold text-indigo-900 tabular-nums">
                    {formatINR(payslipItem.netSalary)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-slate-500">
                    Paid ({payslipItem.paymentChannel})
                  </div>
                  <div className="text-sm font-bold text-emerald-700 tabular-nums">
                    {formatINR(payslipItem.paidCash + payslipItem.paidBankOrGpay)}
                  </div>
                  <div className="text-[10px] text-slate-500 tabular-nums">
                    Carry Fwd: {formatINR(payslipItem.carryForwardBalance)}
                  </div>
                </div>
              </div>

              {payslipItem.notes && (
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <strong>Notes:</strong> {payslipItem.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold text-white flex items-center gap-2 ${
            toast.type === "error" ? "bg-rose-600" : "bg-indigo-600"
          }`}
        >
          <CheckCircle2 size={15} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

function PayrollTableRow({
  item,
  locked,
  onPatch,
  onPrint,
}: {
  item: PayrollItem;
  locked: boolean;
  onPatch: (id: string, patch: Partial<PayrollItem>) => void;
  onPrint: () => void;
}) {
  const [daysPresent, setDaysPresent] = useState(String(item.daysPresent));
  const [baseRate, setBaseRate] = useState(String(item.baseRate));
  const [otPlus, setOtPlus] = useState(String(item.otAndIncentive + item.nightDutyAmount + item.lastMonthBalance));
  const [advDed, setAdvDed] = useState(String(item.advanceDeduction + item.expenseBalanceDeduction));
  const [paidCash, setPaidCash] = useState(String(item.paidCash));
  const [paidBank, setPaidBank] = useState(String(item.paidBankOrGpay));
  const [notes, setNotes] = useState(item.notes || "");

  useEffect(() => {
    setDaysPresent(String(item.daysPresent));
    setBaseRate(String(item.baseRate));
    setOtPlus(String(item.otAndIncentive + item.nightDutyAmount + item.lastMonthBalance));
    setAdvDed(String(item.advanceDeduction + item.expenseBalanceDeduction));
    setPaidCash(String(item.paidCash));
    setPaidBank(String(item.paidBankOrGpay));
    setNotes(item.notes || "");
  }, [item]);

  const commitNum = (field: keyof PayrollItem, valStr: string, currentVal: number) => {
    const parsed = Number(valStr);
    if (!Number.isFinite(parsed) || parsed === currentVal) return;
    onPatch(item.id, { [field]: parsed });
  };

  return (
    <tr className="hover:bg-slate-50/80 transition">
      <td className="py-2.5 px-3">
        <div className="font-bold text-slate-900 whitespace-nowrap">{item.employeeName}</div>
        <div className="text-[10px] text-slate-400 font-mono">
          {item.employeeCode} • {item.company === "INVI_CREATION" ? "Invi" : "SR"}
        </div>
      </td>

      <td className="py-2.5 px-2 text-right tabular-nums">
        <input
          type="number"
          step="0.5"
          disabled={locked}
          value={daysPresent}
          onChange={(e) => setDaysPresent(e.target.value)}
          onBlur={() => commitNum("daysPresent", daysPresent, item.daysPresent)}
          className="w-14 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent font-semibold tabular-nums"
        />
        <span className="text-[10px] text-slate-400 ml-0.5">/{item.totalWorkingDays}</span>
      </td>

      <td className="py-2.5 px-2 text-right tabular-nums">
        <input
          type="number"
          disabled={locked}
          value={baseRate}
          onChange={(e) => setBaseRate(e.target.value)}
          onBlur={() => commitNum("baseRate", baseRate, item.baseRate)}
          className="w-16 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent tabular-nums"
        />
      </td>

      <td className="py-2.5 px-2 text-right font-semibold text-slate-800 tabular-nums">
        {formatINR(item.grossSalary)}
      </td>

      <td className="py-2.5 px-2 text-right tabular-nums">
        <input
          type="number"
          disabled={locked}
          value={otPlus}
          onChange={(e) => setOtPlus(e.target.value)}
          onBlur={() => {
            const val = Number(otPlus);
            if (!Number.isFinite(val)) return;
            const prevSum = item.otAndIncentive + item.nightDutyAmount + item.lastMonthBalance;
            if (val !== prevSum) {
              onPatch(item.id, { otAndIncentive: val, nightDutyAmount: 0, lastMonthBalance: 0 });
            }
          }}
          className="w-16 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent text-emerald-700 font-semibold tabular-nums"
        />
      </td>

      <td className="py-2.5 px-2 text-right tabular-nums">
        <input
          type="number"
          disabled={locked}
          value={advDed}
          onChange={(e) => setAdvDed(e.target.value)}
          onBlur={() => {
            const val = Number(advDed);
            if (!Number.isFinite(val)) return;
            const prevSum = item.advanceDeduction + item.expenseBalanceDeduction;
            if (val !== prevSum) {
              onPatch(item.id, { advanceDeduction: val, expenseBalanceDeduction: 0 });
            }
          }}
          className="w-16 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent text-rose-600 font-semibold tabular-nums"
        />
      </td>

      <td className="py-2.5 px-2 text-right font-extrabold text-indigo-700 tabular-nums">
        {formatINR(item.netSalary)}
      </td>

      <td className="py-2.5 px-2 text-right tabular-nums">
        <input
          type="number"
          disabled={locked}
          value={paidCash}
          onChange={(e) => setPaidCash(e.target.value)}
          onBlur={() => commitNum("paidCash", paidCash, item.paidCash)}
          className="w-16 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent tabular-nums"
        />
      </td>

      <td className="py-2.5 px-2 text-right tabular-nums">
        <input
          type="number"
          disabled={locked}
          value={paidBank}
          onChange={(e) => setPaidBank(e.target.value)}
          onBlur={() => commitNum("paidBankOrGpay", paidBank, item.paidBankOrGpay)}
          className="w-16 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent tabular-nums"
        />
      </td>

      <td className="py-2.5 px-2">
        <select
          disabled={locked}
          value={item.paymentChannel}
          onChange={(e) => onPatch(item.id, { paymentChannel: e.target.value })}
          className="px-1.5 py-1 rounded border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
        >
          <option value="CASH">Cash</option>
          <option value="ICICI">ICICI</option>
          <option value="OFFICE_GPAY">GPay</option>
          <option value="AGENT_ACCOUNT">Agent</option>
        </select>
      </td>

      <td className="py-2.5 px-2 text-right tabular-nums">
        <span
          className={`font-bold ${
            item.carryForwardBalance > 0
              ? "text-amber-700"
              : item.carryForwardBalance < 0
              ? "text-rose-600"
              : "text-emerald-700"
          }`}
        >
          {formatINR(item.carryForwardBalance)}
        </span>
      </td>

      <td className="py-2.5 px-2">
        <input
          type="text"
          disabled={locked}
          value={notes}
          placeholder="Add note..."
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== (item.notes || "")) {
              onPatch(item.id, { notes });
            }
          }}
          className="w-32 px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent text-[11px] text-slate-600 truncate"
        />
      </td>

      <td className="py-2.5 px-3 text-center">
        <button
          type="button"
          onClick={onPrint}
          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
          title="View & Print Payslip"
        >
          <Printer size={14} />
        </button>
      </td>
    </tr>
  );
}
