"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
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
  Building2,
  Calendar,
  AlertCircle,
  Unlock,
  Plus,
  Trash2,
  Wallet,
  CalendarPlus,
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";
import { BrandedPayslip, BrandedPayslipItem } from "@/components/payroll/BrandedPayslip";

interface PayrollItem extends BrandedPayslipItem {
  payrollRunId: string;
  employeeId: string;
  isCleared: boolean;
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
  "2027-03", "2027-02", "2027-01",
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
  const [pullingAdv, setPullingAdv] = useState(false);
  const [approving, setApproving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Modals & Drawers
  const [payslipItem, setPayslipItem] = useState<PayrollItem | null>(null);
  const [drawerItem, setDrawerItem] = useState<PayrollItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [newCycleForm, setNewCycleForm] = useState({
    month: "2026-11",
    cycleType: "MONTHLY_OFFICE" as "MONTHLY_OFFICE" | "BI_MONTHLY_TAMIL" | "BI_MONTHLY_HINDI",
    halfPeriod: "FULL" as "FULL" | "FIRST_HALF" | "SECOND_HALF",
    workingDays: 26,
  });

  const [addForm, setAddForm] = useState({
    employeeName: "",
    employeeCode: "",
    company: "STANDARD_ROOFS",
    totalWorkingDays: 26,
    daysPresent: 26,
    baseRate: 15000,
    otAndIncentive: 0,
    advanceDeduction: 0,
    paymentChannel: "CASH",
    notes: "",
  });
  const [addingRow, setAddingRow] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

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
        setSelectedIds([]);
      }
    } catch {
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
      setAddForm((f) => ({ ...f, totalWorkingDays: 26, daysPresent: 26, baseRate: 15000 }));
    } else if (nextCycle === "BI_MONTHLY_TAMIL") {
      setHalfPeriod("FIRST_HALF");
      setMonth("2026-11");
      setAddForm((f) => ({ ...f, totalWorkingDays: 15, daysPresent: 15, baseRate: 900 }));
    } else {
      setHalfPeriod("SECOND_HALF");
      setMonth("2026-09");
      setAddForm((f) => ({ ...f, totalWorkingDays: 15, daysPresent: 15, baseRate: 700 }));
    }
  };

  const handleSyncFromAttendance = async (overrideParams?: {
    cycleType: "MONTHLY_OFFICE" | "BI_MONTHLY_TAMIL" | "BI_MONTHLY_HINDI";
    month: string;
    halfPeriod: "FULL" | "FIRST_HALF" | "SECOND_HALF";
    workingDays?: number;
  }) => {
    setSyncing(true);
    try {
      const targetCycle = overrideParams?.cycleType || cycleType;
      const targetMonth = overrideParams?.month || month;
      const targetHalf =
        overrideParams?.halfPeriod ||
        (targetCycle === "MONTHLY_OFFICE" ? "FULL" : halfPeriod === "FULL" ? "FIRST_HALF" : halfPeriod);

      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleType: targetCycle,
          month: targetMonth,
          halfPeriod: targetHalf,
          workingDays: overrideParams?.workingDays,
          defaultFullDaysIfNoAttendance: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCycleType(targetCycle);
        setMonth(targetMonth);
        setHalfPeriod(targetHalf);
        setRun(data.run);
        setShowNewCycleModal(false);
        showToast(`Opened ${formatMonthLabel(targetMonth)} (${data.syncedEmployees} personnel synced)`);
      } else {
        showToast(data.error || "Sync failed", "error");
      }
    } catch {
      showToast("Network error while syncing attendance", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handlePullAdvances = async () => {
    if (!run) return;
    setPullingAdv(true);
    try {
      const res = await fetch("/api/payroll/sync-advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payrollRunId: run.id }),
      });
      const data = await res.json();
      if (data.success) {
        setRun(data.run);
        showToast(`Scanned ${data.cashBookAdvancesScanned} CashBook advances • Updated ${data.matchedCount} workers`);
      } else {
        showToast(data.error || "Failed to pull advances", "error");
      }
    } catch {
      showToast("Error scanning Cash Book advances", "error");
    } finally {
      setPullingAdv(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/payroll/import", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        showToast(`Imported ${data.runsImported} runs (${data.itemsImported} rows) from Excel`);
        loadPayroll();
      } else {
        showToast(data.error || "Import failed", "error");
      }
    } catch {
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
    } catch {
      showToast("Error approving payroll run", "error");
    } finally {
      setApproving(false);
    }
  };

  const handleReopenCycle = () => {
    if (!run) return;
    setConfirmAction({
      title: "Unlock & Reopen Paid Cycle?",
      message: `Unlock ${formatMonthLabel(run.month)} (${run.halfPeriod}) back to DRAFT status so HR can edit attendance days, allowances, or payouts?`,
      confirmLabel: "Unlock Cycle",
      onConfirm: async () => {
        const res = await fetch("/api/payroll/reopen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payrollRunId: run.id }),
        });
        const data = await res.json();
        if (data.success) {
          setRun(data.run);
          showToast("Payroll cycle unlocked to DRAFT");
        } else {
          showToast(data.error || "Failed to unlock cycle", "error");
        }
        setConfirmAction(null);
      },
    });
  };

  const handleDeleteDraftCycle = () => {
    if (!run || run.status === "PAID") return;
    setConfirmAction({
      title: "Delete Draft Payroll Cycle?",
      message: `Permanently delete ${formatMonthLabel(run.month)} (${run.halfPeriod}) and all ${run.items.length} rows inside it?`,
      confirmLabel: "Delete Cycle",
      danger: true,
      onConfirm: async () => {
        const res = await fetch(`/api/payroll/${run.id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          setRun(null);
          showToast("Draft payroll cycle deleted");
          loadPayroll();
        } else {
          showToast(data.error || "Failed to delete cycle", "error");
        }
        setConfirmAction(null);
      },
    });
  };

  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.employeeName.trim()) return;
    setAddingRow(true);
    try {
      const effectiveHalf = cycleType === "MONTHLY_OFFICE" ? "FULL" : halfPeriod === "FULL" ? "FIRST_HALF" : halfPeriod;
      const res = await fetch("/api/payroll/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleType, month, halfPeriod: effectiveHalf, ...addForm }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setAddForm((f) => ({ ...f, employeeName: "", employeeCode: "", notes: "" }));
        showToast(`Added ${data.item.employeeName} to cycle`);
        loadPayroll();
      } else {
        showToast(data.error || "Failed to add employee", "error");
      }
    } catch {
      showToast("Error adding payroll row", "error");
    } finally {
      setAddingRow(false);
    }
  };

  const handleDeleteRow = (item: PayrollItem) => {
    setConfirmAction({
      title: `Remove ${item.employeeName}?`,
      message: `Delete ${item.employeeName} (${formatINR(item.netSalary)}) from this cycle?`,
      confirmLabel: "Delete Row",
      danger: true,
      onConfirm: async () => {
        const res = await fetch(`/api/payroll/items/${item.id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success && run) {
          setRun({
            ...run,
            ...data.run,
            items: run.items.filter((it) => it.id !== item.id),
          });
          setSelectedIds((prev) => prev.filter((x) => x !== item.id));
          if (drawerItem?.id === item.id) setDrawerItem(null);
          showToast(`Removed ${item.employeeName}`);
        } else {
          showToast(data.error || "Failed to delete row", "error");
        }
        setConfirmAction(null);
      },
    });
  };

  const handleBulkAction = async (action: "MARK_CLEARED" | "SET_CHANNEL" | "DELETE_SELECTED", paymentChannel?: string) => {
    if (!run || selectedIds.length === 0) return;
    const runBulk = async () => {
      const res = await fetch("/api/payroll/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payrollRunId: run.id, itemIds: selectedIds, action, paymentChannel }),
      });
      const data = await res.json();
      if (data.success) {
        setRun(data.run);
        setSelectedIds([]);
        showToast(`Bulk update applied to ${selectedIds.length} rows`);
      } else {
        showToast(data.error || "Bulk update failed", "error");
      }
    };

    if (action === "DELETE_SELECTED") {
      setConfirmAction({
        title: `Delete ${selectedIds.length} Selected Rows?`,
        message: "Selected payroll rows will be permanently removed and totals recalculated.",
        confirmLabel: "Delete Selected",
        danger: true,
        onConfirm: async () => {
          await runBulk();
          setConfirmAction(null);
        },
      });
    } else {
      await runBulk();
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
        if (drawerItem?.id === itemId) setDrawerItem(data.item);
        showToast(`Updated ${data.item.employeeName}`);
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch {
      showToast("Failed to save inline edit", "error");
    }
  };

  const handleExportExcel = () => {
    if (!run || run.items.length === 0) return;
    const rows = run.items.map((it, idx) => ({
      "#": idx + 1,
      Code: it.employeeCode,
      Name: it.employeeName,
      Designation: it.designation || "",
      "Working Days": it.totalWorkingDays,
      "Days Present": it.daysPresent,
      Leave: it.leaveDays,
      "Base Rate (₹)": it.baseRate,
      "Gross Salary (₹)": it.grossSalary,
      "OT / Night (₹)": it.otAndIncentive + it.nightDutyAmount,
      "Vehicle (₹)": it.vehicleAllowance || 0,
      "Prev Balance (₹)": it.lastMonthBalance,
      "Advance Ded (₹)": it.advanceDeduction,
      "Net Salary (₹)": it.netSalary,
      "Paid Cash (₹)": it.paidCash,
      "Paid Bank/GPay (₹)": it.paidBankOrGpay,
      Channel: it.paymentChannel,
      "Carry Fwd Bal (₹)": it.carryForwardBalance,
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
      (it.designation || "").toLowerCase().includes(q) ||
      (it.notes || "").toLowerCase().includes(q)
    );
  });

  const displayGross = visibleItems.reduce((s, it) => s + it.grossSalary, 0);
  const displayDeductions = visibleItems.reduce((s, it) => s + it.advanceDeduction + it.expenseBalanceDeduction, 0);
  const displayNet = visibleItems.reduce((s, it) => s + it.netSalary, 0);
  const displayCash = visibleItems.reduce((s, it) => s + it.paidCash, 0);
  const displayBank = visibleItems.reduce((s, it) => s + it.paidBankOrGpay, 0);
  const displayCarryForward = visibleItems.reduce((s, it) => s + it.carryForwardBalance, 0);

  const allSelected = visibleItems.length > 0 && visibleItems.every((it) => selectedIds.includes(it.id));

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
                Standard Payroll & Official Payslips
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
              Past, Current & Future Payroll Cycles • Attendance Sync • Cash Book Advance Pull • Batch Branded Payslips
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />

          <button
            type="button"
            onClick={() => setShowNewCycleModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition cursor-pointer"
          >
            <CalendarPlus size={14} />
            <span>+ New Cycle</span>
          </button>

          {(!run || run.status !== "PAID") && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <Plus size={14} className="text-indigo-600" />
              <span>+ Add Worker</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSyncFromAttendance()}
            disabled={syncing || run?.status === "PAID"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin text-indigo-600" : "text-indigo-600"} />
            <span>{syncing ? "Syncing..." : "Sync Attendance"}</span>
          </button>

          <button
            type="button"
            onClick={handlePullAdvances}
            disabled={!run || pullingAdv || run.status === "PAID"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <Wallet size={14} className="text-amber-600" />
            <span>{pullingAdv ? "Pulling..." : "Pull Advances"}</span>
          </button>

          {run && (
            <Link
              href={`/payroll/payslips?runId=${run.id}&cycleType=${run.cycleType}&month=${run.month}&halfPeriod=${run.halfPeriod}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition"
            >
              <Printer size={14} className="text-indigo-600" />
              <span>All Payslips</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <Upload size={14} className="text-slate-600" />
            <span>{importing ? "Importing..." : "Import"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!run || visibleItems.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export</span>
          </button>

          {run?.status === "PAID" ? (
            <button
              type="button"
              onClick={handleReopenCycle}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold transition cursor-pointer"
            >
              <Unlock size={14} />
              <span>Unlock & Edit</span>
            </button>
          ) : (
            <>
              {run && (
                <button
                  type="button"
                  onClick={handleDeleteDraftCycle}
                  className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                  title="Delete Draft Payroll Cycle"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={handleApproveRun}
                disabled={!run || approving}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>{approving ? "Posting..." : "Approve & Post"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. 3 SEGMENT TABS + PERIOD & COMPANY CONTROLS */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleTabChange("MONTHLY_OFFICE")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              cycleType === "MONTHLY_OFFICE" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Office Staff (Monthly Salary)
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("BI_MONTHLY_TAMIL")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              cycleType === "BI_MONTHLY_TAMIL" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tamil Labours (1–15 & 16–30 Wages)
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("BI_MONTHLY_HINDI")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              cycleType === "BI_MONTHLY_HINDI" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Hindi Crew (1–15 & 16–30 Wages)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <Calendar size={13} className="text-indigo-600" />
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {MONTHS_LIST.map((m) => (
                <option key={m} value={m}>{formatMonthLabel(m)}</option>
              ))}
            </select>
          </div>

          {cycleType !== "MONTHLY_OFFICE" && (
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setHalfPeriod("FIRST_HALF")}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  halfPeriod === "FIRST_HALF" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1st – 15th
              </button>
              <button
                type="button"
                onClick={() => setHalfPeriod("SECOND_HALF")}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  halfPeriod === "SECOND_HALF" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                16th – 30th
              </button>
            </div>
          )}

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

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, role, notes..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* 3. 4 CLEAN EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Gross Payroll</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              {visibleItems.length} Personnel
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">{formatINR(displayGross)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Earned base wages before deductions</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Deductions</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80">
              Advances + Exp
            </span>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2 tabular-nums">{formatINR(displayDeductions)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Mid-cycle cash advances & expense balances</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Payable</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              {formatMonthLabel(month)}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-2 tabular-nums">{formatINR(displayNet)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Includes OT, Vehicle & Prior Balances</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Disbursed & Balance</span>
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

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && run?.status !== "PAID" && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-indigo-900">{selectedIds.length} row(s) selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => handleBulkAction("MARK_CLEARED")} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer">
              Mark Cleared
            </button>
            <button type="button" onClick={() => handleBulkAction("SET_CHANNEL", "CASH")} className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold cursor-pointer">
              Set Cash
            </button>
            <button type="button" onClick={() => handleBulkAction("SET_CHANNEL", "ICICI")} className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold cursor-pointer">
              Set ICICI
            </button>
            <button type="button" onClick={() => handleBulkAction("SET_CHANNEL", "OFFICE_GPAY")} className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold cursor-pointer">
              Set Office GPay
            </button>
            <button type="button" onClick={() => handleBulkAction("DELETE_SELECTED")} className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer">
              Delete Selected
            </button>
          </div>
        </div>
      )}

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
            Click any employee name to open the full <strong>Payroll & Payslip Drawer</strong>, or edit numbers inline
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
              Click <strong>+ New Cycle</strong> or <strong>Sync Attendance</strong> to auto-generate this cycle with all active workers and prior carry-forward balances.
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
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelectedIds(allSelected ? [] : visibleItems.map((it) => it.id))}
                      disabled={run?.status === "PAID"}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-2">Employee</th>
                  <th className="py-3 px-2 text-right">Days</th>
                  <th className="py-3 px-2 text-right">Rate (₹)</th>
                  <th className="py-3 px-2 text-right">Gross (₹)</th>
                  <th className="py-3 px-2 text-right">+ OT / Veh / Prev</th>
                  <th className="py-3 px-2 text-right">- Adv / Exp</th>
                  <th className="py-3 px-2 text-right text-indigo-700">Net Salary</th>
                  <th className="py-3 px-2 text-right">Paid Cash</th>
                  <th className="py-3 px-2 text-right">Bank / GPay</th>
                  <th className="py-3 px-2">Channel</th>
                  <th className="py-3 px-2 text-right">Balance</th>
                  <th className="py-3 px-2">Notes</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item) => (
                  <PayrollTableRow
                    key={item.id}
                    item={item}
                    locked={run?.status === "PAID"}
                    selected={selectedIds.includes(item.id)}
                    onToggleSelect={() =>
                      setSelectedIds((prev) =>
                        prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                      )
                    }
                    onOpenDrawer={() => setDrawerItem(item)}
                    onPatch={handleInlinePatch}
                    onDelete={() => handleDeleteRow(item)}
                    onPrint={() => setPayslipItem(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / OPEN ANY MONTH CYCLE MODAL */}
      {showNewCycleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-bold text-sm text-slate-900">Create / Open Any Month Cycle</div>
              <button type="button" onClick={() => setShowNewCycleModal(false)} className="text-slate-500 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Month (Past, Current or Future)</label>
                <input
                  type="month"
                  value={newCycleForm.month}
                  onChange={(e) => setNewCycleForm({ ...newCycleForm, month: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payroll Cycle Type</label>
                <select
                  value={newCycleForm.cycleType}
                  onChange={(e) => {
                    const next = e.target.value as any;
                    setNewCycleForm({
                      ...newCycleForm,
                      cycleType: next,
                      halfPeriod: next === "MONTHLY_OFFICE" ? "FULL" : "FIRST_HALF",
                      workingDays: next === "MONTHLY_OFFICE" ? 26 : 15,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
                >
                  <option value="MONTHLY_OFFICE">Office Staff (Monthly Salary)</option>
                  <option value="BI_MONTHLY_TAMIL">Tamil Labours (1–15 & 16–30 Wages)</option>
                  <option value="BI_MONTHLY_HINDI">Hindi Crew (1–15 & 16–30 Wages)</option>
                </select>
              </div>
              {newCycleForm.cycleType !== "MONTHLY_OFFICE" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Half Period</label>
                  <select
                    value={newCycleForm.halfPeriod}
                    onChange={(e) => setNewCycleForm({ ...newCycleForm, halfPeriod: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    <option value="FIRST_HALF">1st – 15th</option>
                    <option value="SECOND_HALF">16th – End of Month</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scheduled Working Days</label>
                <input
                  type="number"
                  value={newCycleForm.workingDays}
                  onChange={(e) => setNewCycleForm({ ...newCycleForm, workingDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold"
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewCycleModal(false)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                disabled={syncing}
                onClick={() => handleSyncFromAttendance(newCycleForm)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {syncing ? "Generating..." : "Generate / Open Cycle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE SLIDE-OVER PAYROLL & ATTENDANCE DRAWER */}
      {drawerItem && (
        <PayrollDetailDrawer
          item={drawerItem}
          locked={run?.status === "PAID"}
          onClose={() => setDrawerItem(null)}
          onSave={async (patch) => {
            await handleInlinePatch(drawerItem.id, patch);
          }}
          onViewPayslip={() => {
            setPayslipItem(drawerItem);
            setDrawerItem(null);
          }}
          onDelete={() => handleDeleteRow(drawerItem)}
        />
      )}

      {/* ADD EMPLOYEE / LABOUR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddRow} className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-bold text-sm text-slate-900">Add Employee / Ad-hoc Worker</div>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-500 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={addForm.employeeName}
                  onChange={(e) => setAddForm({ ...addForm, employeeName: e.target.value })}
                  placeholder="e.g. Suresh P / New Welder"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code (optional)</label>
                  <input
                    type="text"
                    value={addForm.employeeCode}
                    onChange={(e) => setAddForm({ ...addForm, employeeCode: e.target.value })}
                    placeholder="e.g. SR025"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company</label>
                  <select
                    value={addForm.company}
                    onChange={(e) => setAddForm({ ...addForm, company: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="STANDARD_ROOFS">Standard Roofs</option>
                    <option value="INVI_CREATION">Invi Creation</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Working Days</label>
                  <input type="number" value={addForm.totalWorkingDays} onChange={(e) => setAddForm({ ...addForm, totalWorkingDays: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Days Present</label>
                  <input type="number" step="0.5" value={addForm.daysPresent} onChange={(e) => setAddForm({ ...addForm, daysPresent: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate (₹)</label>
                  <input type="number" value={addForm.baseRate} onChange={(e) => setAddForm({ ...addForm, baseRate: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OT / Inc (₹)</label>
                  <input type="number" value={addForm.otAndIncentive} onChange={(e) => setAddForm({ ...addForm, otAndIncentive: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Advance (₹)</label>
                  <input type="number" value={addForm.advanceDeduction} onChange={(e) => setAddForm({ ...addForm, advanceDeduction: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Channel</label>
                  <select value={addForm.paymentChannel} onChange={(e) => setAddForm({ ...addForm, paymentChannel: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white">
                    <option value="CASH">Cash</option>
                    <option value="ICICI">ICICI</option>
                    <option value="OFFICE_GPAY">GPay</option>
                    <option value="AGENT_ACCOUNT">Agent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input type="text" value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} placeholder="Optional remarks..." className="w-full px-3 py-2 rounded-lg border border-slate-200" />
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={addingRow} className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50">
                {addingRow ? "Adding..." : "Add to Payroll"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-3">
            <div className="text-sm font-extrabold text-slate-900">{confirmAction.title}</div>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmAction.message}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setConfirmAction(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction.onConfirm}
                className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold cursor-pointer ${
                  confirmAction.danger ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL BRANDED PAYSLIP MODAL */}
      {payslipItem && run && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-4xl w-full space-y-3 my-auto">
            <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-200 shadow-sm print:hidden">
              <span className="text-xs font-bold text-slate-800">
                Official Payslip — {payslipItem.employeeName}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayslipItem(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <BrandedPayslip
              item={payslipItem}
              month={run.month}
              halfPeriod={run.halfPeriod}
              status={run.status}
            />
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold text-white flex items-center gap-2 ${toast.type === "error" ? "bg-rose-600" : "bg-indigo-600"}`}>
          <CheckCircle2 size={15} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

function PayrollDetailDrawer({
  item,
  locked,
  onClose,
  onSave,
  onViewPayslip,
  onDelete,
}: {
  item: PayrollItem;
  locked: boolean;
  onClose: () => void;
  onSave: (patch: Partial<PayrollItem>) => Promise<void>;
  onViewPayslip: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    totalWorkingDays: item.totalWorkingDays,
    daysPresent: item.daysPresent,
    baseRate: item.baseRate,
    otAndIncentive: item.otAndIncentive,
    nightDutyAmount: item.nightDutyAmount,
    vehicleAllowance: item.vehicleAllowance || 0,
    lastMonthBalance: item.lastMonthBalance,
    advanceDeduction: item.advanceDeduction,
    expenseBalanceDeduction: item.expenseBalanceDeduction,
    paidCash: item.paidCash,
    paidBankOrGpay: item.paidBankOrGpay,
    paymentChannel: item.paymentChannel,
    notes: item.notes || "",
  });

  const leaveDays = Math.max(0, Math.round((form.totalWorkingDays - form.daysPresent) * 100) / 100);
  const gross =
    item.category === "OFFICE"
      ? form.baseRate <= 2500
        ? Math.round(form.baseRate * form.daysPresent)
        : Math.round((form.baseRate / (form.totalWorkingDays || 26)) * form.daysPresent)
      : Math.round(form.baseRate * form.daysPresent);
  const net = Math.round(
    gross +
      form.otAndIncentive +
      form.nightDutyAmount +
      form.vehicleAllowance +
      form.lastMonthBalance -
      form.advanceDeduction -
      form.expenseBalanceDeduction
  );
  const balance = Math.round((net - (form.paidCash + form.paidBankOrGpay)) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="text-sm font-extrabold text-slate-900">{item.employeeName}</div>
            <div className="text-[11px] text-slate-500 font-mono">
              {item.employeeCode} • {item.designation || item.category}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Attendance Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Working</div>
              <div className="text-sm font-extrabold text-slate-800">{form.totalWorkingDays} Days</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Present</div>
              <div className="text-sm font-extrabold text-emerald-700">{form.daysPresent} Days</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Leave</div>
              <div className="text-sm font-extrabold text-rose-600">{leaveDays} Days</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Working Days</label>
              <input type="number" disabled={locked} value={form.totalWorkingDays} onChange={(e) => setForm({ ...form, totalWorkingDays: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Days Present</label>
              <input type="number" step="0.5" disabled={locked} value={form.daysPresent} onChange={(e) => setForm({ ...form, daysPresent: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Base Rate (₹)</label>
              <input type="number" disabled={locked} value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">OT / Incentive (₹)</label>
              <input type="number" disabled={locked} value={form.otAndIncentive} onChange={(e) => setForm({ ...form, otAndIncentive: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vehicle Allowance (₹)</label>
              <input type="number" disabled={locked} value={form.vehicleAllowance} onChange={(e) => setForm({ ...form, vehicleAllowance: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Last Month Bal (₹)</label>
              <input type="number" disabled={locked} value={form.lastMonthBalance} onChange={(e) => setForm({ ...form, lastMonthBalance: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold text-rose-700 mb-1">Advance Ded (₹)</label>
              <input type="number" disabled={locked} value={form.advanceDeduction} onChange={(e) => setForm({ ...form, advanceDeduction: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold text-rose-700 mb-1">Expense Bal Ded (₹)</label>
              <input type="number" disabled={locked} value={form.expenseBalanceDeduction} onChange={(e) => setForm({ ...form, expenseBalanceDeduction: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Paid Cash (₹)</label>
              <input type="number" disabled={locked} value={form.paidCash} onChange={(e) => setForm({ ...form, paidCash: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Paid Bank / GPay (₹)</label>
              <input type="number" disabled={locked} value={form.paidBankOrGpay} onChange={(e) => setForm({ ...form, paidBankOrGpay: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Channel</label>
            <select disabled={locked} value={form.paymentChannel} onChange={(e) => setForm({ ...form, paymentChannel: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white">
              <option value="CASH">Cash</option>
              <option value="ICICI">ICICI</option>
              <option value="OFFICE_GPAY">Office GPay</option>
              <option value="AGENT_ACCOUNT">Agent Account</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes</label>
            <input type="text" disabled={locked} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200" />
          </div>

          {/* Live Summary */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase text-indigo-700">Live Net Salary</div>
              <div className="text-xl font-extrabold text-indigo-900 tabular-nums">{formatINR(net)}</div>
            </div>
            <div className="text-right">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  balance > 0
                    ? "bg-amber-100 text-amber-800"
                    : balance < 0
                    ? "bg-rose-100 text-rose-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {balance > 0 ? "Pending Balance" : balance < 0 ? "Advance to Recover" : "Cleared"}
              </span>
              <div className="text-sm font-extrabold text-slate-900 mt-1 tabular-nums">{formatINR(balance)}</div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onViewPayslip} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-indigo-700 cursor-pointer">
              <Printer size={13} />
              <span>Official Payslip</span>
            </button>
            {!locked && (
              <button type="button" onClick={onDelete} className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer" title="Delete Row">
                <Trash2 size={14} />
              </button>
            )}
          </div>
          {!locked && (
            <button
              type="button"
              onClick={async () => {
                await onSave(form);
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PayrollTableRow({
  item,
  locked,
  selected,
  onToggleSelect,
  onOpenDrawer,
  onPatch,
  onDelete,
  onPrint,
}: {
  item: PayrollItem;
  locked: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenDrawer: () => void;
  onPatch: (id: string, patch: Partial<PayrollItem>) => void;
  onDelete: () => void;
  onPrint: () => void;
}) {
  const [daysPresent, setDaysPresent] = useState(String(item.daysPresent));
  const [baseRate, setBaseRate] = useState(String(item.baseRate));
  const [otPlus, setOtPlus] = useState(
    String(item.otAndIncentive + item.nightDutyAmount + (item.vehicleAllowance || 0) + item.lastMonthBalance)
  );
  const [advDed, setAdvDed] = useState(String(item.advanceDeduction + item.expenseBalanceDeduction));
  const [paidCash, setPaidCash] = useState(String(item.paidCash));
  const [paidBank, setPaidBank] = useState(String(item.paidBankOrGpay));
  const [notes, setNotes] = useState(item.notes || "");

  useEffect(() => {
    setDaysPresent(String(item.daysPresent));
    setBaseRate(String(item.baseRate));
    setOtPlus(
      String(item.otAndIncentive + item.nightDutyAmount + (item.vehicleAllowance || 0) + item.lastMonthBalance)
    );
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

  const handleEnterBlur = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  return (
    <tr className={`hover:bg-slate-50/80 transition ${selected ? "bg-indigo-50/40" : ""}`}>
      <td className="py-2.5 px-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          disabled={locked}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
      </td>

      <td className="py-2.5 px-2">
        <button
          type="button"
          onClick={onOpenDrawer}
          className="text-left group cursor-pointer"
        >
          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition whitespace-nowrap">
            {item.employeeName}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {item.employeeCode} • {item.designation || (item.company === "INVI_CREATION" ? "Invi" : "SR")}
          </div>
        </button>
      </td>

      <td className="py-2.5 px-2 text-right tabular-nums">
        <input
          type="number"
          step="0.5"
          disabled={locked}
          value={daysPresent}
          onChange={(e) => setDaysPresent(e.target.value)}
          onKeyDown={handleEnterBlur}
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
          onKeyDown={handleEnterBlur}
          onBlur={() => commitNum("baseRate", baseRate, item.baseRate)}
          className="w-16 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent tabular-nums"
        />
      </td>

      <td className="py-2.5 px-2 text-right font-semibold text-slate-800 tabular-nums">{formatINR(item.grossSalary)}</td>

      <td className="py-2.5 px-2 text-right tabular-nums">
        <input
          type="number"
          disabled={locked}
          value={otPlus}
          onChange={(e) => setOtPlus(e.target.value)}
          onKeyDown={handleEnterBlur}
          onBlur={() => {
            const val = Number(otPlus);
            if (!Number.isFinite(val)) return;
            const prevSum = item.otAndIncentive + item.nightDutyAmount + (item.vehicleAllowance || 0) + item.lastMonthBalance;
            if (val !== prevSum) {
              onPatch(item.id, { otAndIncentive: val, nightDutyAmount: 0, vehicleAllowance: 0, lastMonthBalance: 0 });
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
          onKeyDown={handleEnterBlur}
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

      <td className="py-2.5 px-2 text-right font-extrabold text-indigo-700 tabular-nums">{formatINR(item.netSalary)}</td>

      <td className="py-2.5 px-2 text-right tabular-nums">
        <input
          type="number"
          disabled={locked}
          value={paidCash}
          onChange={(e) => setPaidCash(e.target.value)}
          onKeyDown={handleEnterBlur}
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
          onKeyDown={handleEnterBlur}
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
          onKeyDown={handleEnterBlur}
          onBlur={() => {
            if (notes !== (item.notes || "")) onPatch(item.id, { notes });
          }}
          className="w-28 px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent text-[11px] text-slate-600 truncate"
        />
      </td>

      <td className="py-2.5 px-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={onPrint}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
            title="View & Print Official Payslip"
          >
            <Printer size={14} />
          </button>
          {!locked && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Delete Row"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
