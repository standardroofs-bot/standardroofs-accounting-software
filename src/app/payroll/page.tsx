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
  Pencil,
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";
import { BrandedPayslip, BrandedPayslipItem } from "@/components/payroll/BrandedPayslip";
import { ModuleHeroBanner } from "@/components/ui/ModuleHeroBanner";
import { TactileKpiCard, InitialsAvatar, ChannelBadge, BalanceBadge } from "@/components/ui/ErpPrimitives";
import { ViewportPortal } from "@/components/ui/ViewportPortal";

interface PayrollItem extends BrandedPayslipItem {
  payrollRunId: string;
  employeeId: string;
  isCleared: boolean;
  performanceReview?: {
    overallRating: number;
    recommendedIncentive: number;
    attendanceScore: number;
    siteExecutionScore: number;
    punctualityScore: number;
    safetyDisciplineScore: number;
    reviewerNotes?: string | null;
  } | null;
  attendanceSummary?: {
    presentCount: number;
    halfDayCount: number;
    paidLeaveCount: number;
    absentCount: number;
    otHours: number;
    payableDays: number;
    markedPayableSoFar?: number;
    remainingScheduledDays?: number;
    projectedPayableDays?: number;
    scheduledWorkingDays?: number;
    dailyAdvanceSum: number;
    totalRecords: number;
  };
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
  const [month, setMonth] = useState("2026-11");
  const [halfPeriod, setHalfPeriod] = useState<"FULL" | "FIRST_HALF" | "SECOND_HALF">("FULL");
  const [companyFilter, setCompanyFilter] = useState<"ALL" | "STANDARD_ROOFS" | "INVI_CREATION">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTab, setViewTab] = useState<"register" | "summary">("register");

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
  const [markPaidItem, setMarkPaidItem] = useState<PayrollItem | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [markPaidForm, setMarkPaidForm] = useState({
    paidCash: 0,
    paidBankOrGpay: 0,
    paidGpay: 0,
    gpayWallet: "Office Gpay",
    paymentRef: "",
    paidDate: new Date().toISOString().slice(0, 10),
    paymentReason: "",
  });
  const [drawerItem, setDrawerItem] = useState<PayrollItem | null>(null);
  const [kpiItem, setKpiItem] = useState<PayrollItem | null>(null);
  const [kpiForm, setKpiForm] = useState({
    attendanceScore: 24,
    siteExecutionScore: 24,
    punctualityScore: 23,
    safetyDisciplineScore: 24,
    recommendedIncentive: 500,
    reviewerNotes: "",
  });
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
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const qMonth = sp.get("month");
    const qTab = sp.get("tab");
    if (qMonth && /^\d{4}-\d{2}$/.test(qMonth)) {
      setMonth(qMonth);
    }
    if (qTab === "tamil") {
      setCycleType("BI_MONTHLY_TAMIL");
      setHalfPeriod("FIRST_HALF");
    } else if (qTab === "hindi") {
      setCycleType("BI_MONTHLY_HINDI");
      setHalfPeriod("FIRST_HALF");
    } else if (qTab === "office") {
      setCycleType("MONTHLY_OFFICE");
      setHalfPeriod("FULL");
    }
  }, []);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = payslipItem ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [payslipItem]);

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
        showToast(`Synced live attendance for ${data.syncedEmployees} personnel`);
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
    if (!run || visibleItems.length === 0) return;
    const rows = visibleItems.map((it) => {
      const otLastInc =
        it.otAndIncentive +
        (it.performanceIncentive || 0) +
        it.nightDutyAmount +
        (it.vehicleAllowance || 0) +
        it.lastMonthBalance;
      const bankTotal = (it.paidBankOrGpay || 0) + (it.paidGpay || 0);
      return {
        Name: it.employeeName,
        "Total Working Days": it.totalWorkingDays,
        "Number of Days Present": it.daysPresent,
        "Salary per Month": it.baseRate,
        "Gross Salary": it.grossSalary,
        "Expenses Amount Balance": it.expenseBalanceDeduction || 0,
        Advance: it.advanceDeduction || 0,
        "OT Amount + Last Month Balance + Incentive": otLastInc,
        "Net Salary": it.netSalary,
        Cash: it.paidCash || 0,
        "ICICI / Bank": bankTotal,
        Balance: it.carryForwardBalance || 0,
        Notes: it.notes || "",
      };
    });
    rows.push({
      Name: "Total Salary",
      "Total Working Days": visibleItems.reduce((s, it) => s + it.totalWorkingDays, 0),
      "Number of Days Present": visibleItems.reduce((s, it) => s + it.daysPresent, 0),
      "Salary per Month": visibleItems.reduce((s, it) => s + it.baseRate, 0),
      "Gross Salary": visibleItems.reduce((s, it) => s + it.grossSalary, 0),
      "Expenses Amount Balance": visibleItems.reduce((s, it) => s + (it.expenseBalanceDeduction || 0), 0),
      Advance: visibleItems.reduce((s, it) => s + (it.advanceDeduction || 0), 0),
      "OT Amount + Last Month Balance + Incentive": visibleItems.reduce(
        (s, it) => s + it.otAndIncentive + (it.performanceIncentive || 0) + it.nightDutyAmount + (it.vehicleAllowance || 0) + it.lastMonthBalance,
        0
      ),
      "Net Salary": visibleItems.reduce((s, it) => s + it.netSalary, 0),
      Cash: visibleItems.reduce((s, it) => s + (it.paidCash || 0), 0),
      "ICICI / Bank": visibleItems.reduce((s, it) => s + (it.paidBankOrGpay || 0) + (it.paidGpay || 0), 0),
      Balance: visibleItems.reduce((s, it) => s + (it.carryForwardBalance || 0), 0),
      Notes: `Salary details for the Month of ${formatMonthLabel(month)}`,
    });
    exportToExcel(rows, `SR_Salary_Details_${formatMonthLabel(month).replace(/\s+/g, "_")}_${cycleType}`, "Salary Summary");
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
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-2 space-y-5 font-sans pb-16 text-slate-900">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />

      {/* 1. EXECUTIVE HERO COMMAND BANNER */}
      <ModuleHeroBanner
        icon={<Coins size={22} />}
        title="Standard Payroll & Official Payslips"
        subtitle="Past, Current & Future Payroll Cycles • Live Attendance Sync • Cash Book Advance Pull • Batch Branded Payslips"
        statusBadge={
          run
            ? {
                label: run.status,
                tone: run.status === "PAID" ? "emerald" : "amber",
              }
            : { label: "READY", tone: "indigo" }
        }
        primaryActions={
          <>
            <button
              type="button"
              onClick={() => setShowNewCycleModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold transition cursor-pointer"
            >
              <CalendarPlus size={14} className="text-indigo-200" />
              <span>+ New Cycle</span>
            </button>

            <button
              type="button"
              onClick={() => handleSyncFromAttendance()}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin text-indigo-200" : "text-indigo-200"} />
              <span>{syncing ? "Syncing..." : month === "2026-11" ? "Sync Nov Attendance Now" : "Sync Attendance Now"}</span>
            </button>

            {run?.status === "PAID" ? (
              <button
                type="button"
                onClick={handleReopenCycle}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-lg transition cursor-pointer"
              >
                <Unlock size={14} />
                <span>Unlock &amp; Edit</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApproveRun}
                disabled={!run || approving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-lg shadow-indigo-950/50 transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>{approving ? "Posting..." : "Approve & Post"}</span>
              </button>
            )}
          </>
        }
        moreActions={[
          {
            label: "+ Add Worker",
            icon: <Plus size={14} className="text-[#4F46E5]" />,
            onClick: () => setShowAddModal(true),
          },
          {
            label: pullingAdv ? "Pulling Advances..." : "Pull Advances",
            icon: <Wallet size={14} className="text-amber-600" />,
            onClick: handlePullAdvances,
            disabled: !run || pullingAdv,
          },
          ...(run
            ? [
                {
                  label: "All Payslips (Batch)",
                  icon: <Printer size={14} className="text-[#4F46E5]" />,
                  href: `/payroll/payslips?runId=${run.id}&cycleType=${run.cycleType}&month=${run.month}&halfPeriod=${run.halfPeriod}`,
                },
              ]
            : []),
          {
            label: importing ? "Importing..." : "Import Excel",
            icon: <Upload size={14} className="text-slate-600" />,
            onClick: () => fileInputRef.current?.click(),
            disabled: importing,
          },
          {
            label: "Export Excel (.xlsx)",
            icon: <FileSpreadsheet size={14} className="text-emerald-600" />,
            onClick: handleExportExcel,
            disabled: !run || visibleItems.length === 0,
          },
          ...(run && run.status !== "PAID"
            ? [
                {
                  label: "Delete Draft Cycle",
                  icon: <Trash2 size={14} className="text-rose-600" />,
                  onClick: handleDeleteDraftCycle,
                },
              ]
            : []),
        ]}
      />

      {/* SUBTLE POSTED-TO-ACCOUNTS BANNER WHEN PAID */}
      {run?.status === "PAID" && (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 size={15} className="text-[#059669] shrink-0" />
            <span>
              <strong>Cycle posted to accounts</strong> — any edits will automatically update the linked Cash Book entry.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#059669]">All fields editable</span>
        </div>
      )}

      {/* 2. 3 ELEVATED SEGMENTED TABS + PERIOD & COMPANY CONTROLS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_2px_10px_rgba(15,23,42,0.04)] p-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/75 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => handleTabChange("MONTHLY_OFFICE")}
            className={`px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
              cycleType === "MONTHLY_OFFICE"
                ? "bg-white text-indigo-700 font-semibold shadow-sm"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            Office Staff (Monthly · Paid 1st–2nd)
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("BI_MONTHLY_TAMIL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
              cycleType === "BI_MONTHLY_TAMIL"
                ? "bg-white text-indigo-700 font-semibold shadow-sm"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            Tamil Labours (15-Day Cycle: 1–15 &amp; 16–30)
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("BI_MONTHLY_HINDI")}
            className={`px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
              cycleType === "BI_MONTHLY_HINDI"
                ? "bg-white text-indigo-700 font-semibold shadow-sm"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            Hindi Crew (15-Day Cycle: 1–15 &amp; 16–30)
          </button>
          <Link
            href="/contractors"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition flex items-center gap-1"
            title="Sub-contractors are billed per finished site or milestone"
          >
            <span>Sub-Contractors (Site-by-Site Milestone Billing) &rarr;</span>
          </Link>
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

      {/* 3. 4 TACTILE EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TactileKpiCard
          label="Total Gross Payroll"
          value={formatINR(displayGross)}
          subtext="Earned base wages before deductions"
          accent="indigo"
          icon={<Users size={16} />}
          badge={
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              {visibleItems.length} Staff
            </span>
          }
          progressPercent={visibleItems.length > 0 ? 100 : 10}
        />

        <TactileKpiCard
          label="Total Deductions"
          value={formatINR(displayDeductions)}
          subtext="Mid-cycle cash advances & expense balances"
          accent="rose"
          icon={<Wallet size={16} />}
          progressPercent={displayGross > 0 ? Math.min(100, (displayDeductions / displayGross) * 100) : 8}
        />

        <TactileKpiCard
          label="Net Payable"
          value={formatINR(displayNet)}
          subtext={`${formatMonthLabel(month)} • Includes OT, Vehicle & Prev Bal`}
          accent="emerald"
          icon={<Coins size={16} />}
          progressPercent={displayNet > 0 ? Math.min(100, ((displayCash + displayBank) / displayNet) * 100) : 0}
        />

        <TactileKpiCard
          label="Disbursed (Cash + Bank)"
          value={formatINR(displayCash + displayBank)}
          subtext={`Cash ${formatINR(displayCash)} • Bank ${formatINR(displayBank)} • Bal ${formatINR(displayCarryForward)}`}
          accent="amber"
          icon={<CheckCircle2 size={16} />}
          progressPercent={displayNet > 0 ? Math.min(100, ((displayCash + displayBank) / displayNet) * 100) : 0}
        />
      </div>

      {/* 4-STEP LIVE FORMULA BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">
            1. Base Earned = {formatINR(displayGross)}
          </span>
          <span className="text-slate-400 font-bold">+</span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
            2. OT / Inc / Veh = {formatINR(visibleItems.reduce((s, it) => s + it.otAndIncentive + (it.performanceIncentive || 0) + (it.vehicleAllowance || 0) + it.lastMonthBalance, 0))}
          </span>
          <span className="text-slate-400 font-bold">–</span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-bold">
            3. Advances = {formatINR(displayDeductions)}
          </span>
          <span className="text-slate-400 font-bold">=</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-extrabold">
            4. Net Payable = {formatINR(displayNet)}
          </span>
        </div>
        <div className="text-[11px] font-semibold text-slate-600 tabular-nums">
          Disbursed {formatINR(displayCash + displayBank)} • Balance C/F <strong className="text-amber-700">{formatINR(displayCarryForward)}</strong>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-0.5 rounded-lg bg-slate-200/75 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewTab("register")}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  viewTab === "register" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Payroll Register
              </button>
              <button
                type="button"
                onClick={() => setViewTab("summary")}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  viewTab === "summary" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Monthly Summary Sheet
              </button>
            </div>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!run || visibleItems.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet size={13} />
              <span>Export Excel (.xlsx)</span>
            </button>
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
        ) : viewTab === "summary" ? (
          <div className="overflow-x-auto">
            <div className="px-4 py-2.5 bg-indigo-950 text-white text-xs font-extrabold tracking-wide uppercase">
              Salary details for the Month of {formatMonthLabel(month)}
            </div>
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-[10.5px] uppercase tracking-wider text-slate-700 font-extrabold">
                <tr>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-2 text-right">Total Working Days</th>
                  <th className="py-3 px-2 text-right">Number of Days Present</th>
                  <th className="py-3 px-2 text-right">Salary per Month</th>
                  <th className="py-3 px-2 text-right">Gross Salary</th>
                  <th className="py-3 px-2 text-right">Expenses Amount Balance</th>
                  <th className="py-3 px-2 text-right">Advance</th>
                  <th className="py-3 px-2 text-right">OT + Last Bal + Inc</th>
                  <th className="py-3 px-2 text-right text-indigo-700">Net Salary</th>
                  <th className="py-3 px-2 text-right">Cash</th>
                  <th className="py-3 px-2 text-right">ICICI / Bank</th>
                  <th className="py-3 px-2 text-right">Balance</th>
                  <th className="py-3 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((it) => {
                  const otLastInc =
                    it.otAndIncentive +
                    (it.performanceIncentive || 0) +
                    it.nightDutyAmount +
                    (it.vehicleAllowance || 0) +
                    it.lastMonthBalance;
                  const bankTotal = (it.paidBankOrGpay || 0) + (it.paidGpay || 0);
                  return (
                    <tr key={it.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{it.employeeName}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{it.totalWorkingDays}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-semibold">{it.daysPresent}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{formatINR(it.baseRate)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-semibold">{formatINR(it.grossSalary)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{formatINR(it.expenseBalanceDeduction || 0)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-rose-700">{formatINR(it.advanceDeduction || 0)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-emerald-700">{formatINR(otLastInc)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-extrabold text-indigo-700">{formatINR(it.netSalary)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{formatINR(it.paidCash || 0)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{formatINR(bankTotal)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-bold">{formatINR(it.carryForwardBalance || 0)}</td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-[160px] truncate">{it.notes || "—"}</td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-slate-900">
                  <td className="py-3 px-3">Total Salary</td>
                  <td className="py-3 px-2 text-right tabular-nums">{visibleItems.reduce((s, it) => s + it.totalWorkingDays, 0)}</td>
                  <td className="py-3 px-2 text-right tabular-nums">{visibleItems.reduce((s, it) => s + it.daysPresent, 0)}</td>
                  <td className="py-3 px-2 text-right tabular-nums">{formatINR(visibleItems.reduce((s, it) => s + it.baseRate, 0))}</td>
                  <td className="py-3 px-2 text-right tabular-nums">{formatINR(displayGross)}</td>
                  <td className="py-3 px-2 text-right tabular-nums">{formatINR(visibleItems.reduce((s, it) => s + (it.expenseBalanceDeduction || 0), 0))}</td>
                  <td className="py-3 px-2 text-right tabular-nums text-rose-700">{formatINR(visibleItems.reduce((s, it) => s + (it.advanceDeduction || 0), 0))}</td>
                  <td className="py-3 px-2 text-right tabular-nums text-emerald-700">
                    {formatINR(visibleItems.reduce((s, it) => s + it.otAndIncentive + (it.performanceIncentive || 0) + it.nightDutyAmount + (it.vehicleAllowance || 0) + it.lastMonthBalance, 0))}
                  </td>
                  <td className="py-3 px-2 text-right tabular-nums text-indigo-700">{formatINR(displayNet)}</td>
                  <td className="py-3 px-2 text-right tabular-nums">{formatINR(displayCash)}</td>
                  <td className="py-3 px-2 text-right tabular-nums">{formatINR(visibleItems.reduce((s, it) => s + (it.paidBankOrGpay || 0) + (it.paidGpay || 0), 0))}</td>
                  <td className="py-3 px-2 text-right tabular-nums">{formatINR(displayCarryForward)}</td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-bold">
                <tr>
                  <th className="py-3.5 px-4 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelectedIds(allSelected ? [] : visibleItems.map((it) => it.id))}
                      className="rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3">Employee</th>
                  <th className="py-3.5 px-3 text-right">Days</th>
                  <th className="py-3.5 px-3 text-right">Rate (₹)</th>
                  <th className="py-3.5 px-3 text-right">Gross (₹)</th>
                  <th className="py-3.5 px-3 text-right">+ OT / Veh / Prev</th>
                  <th className="py-3.5 px-3 text-right">- Adv / Exp</th>
                  <th className="py-3.5 px-3 text-right text-[#4F46E5]">Net Salary</th>
                  <th className="py-3.5 px-3 text-right">Paid Cash</th>
                  <th className="py-3.5 px-3 text-right">Bank / GPay</th>
                  <th className="py-3.5 px-3">Channel</th>
                  <th className="py-3.5 px-3 text-right">Balance</th>
                  <th className="py-3.5 px-3">Notes</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item) => (
                  <PayrollTableRow
                    key={item.id}
                    item={item}
                    selected={selectedIds.includes(item.id)}
                    onToggleSelect={() =>
                      setSelectedIds((prev) =>
                        prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                      )
                    }
                    onOpenDrawer={() => setDrawerItem(item)}
                    onOpenKpi={() => {
                      setKpiForm({
                        attendanceScore: item.performanceReview?.attendanceScore ?? 24,
                        siteExecutionScore: item.performanceReview?.siteExecutionScore ?? 24,
                        punctualityScore: item.performanceReview?.punctualityScore ?? 23,
                        safetyDisciplineScore: item.performanceReview?.safetyDisciplineScore ?? 24,
                        recommendedIncentive: item.performanceReview?.recommendedIncentive ?? 500,
                        reviewerNotes: item.performanceReview?.reviewerNotes ?? "",
                      });
                      setKpiItem(item);
                    }}
                    onPatch={handleInlinePatch}
                    onDelete={() => handleDeleteRow(item)}
                    onPrint={() => setPayslipItem(item)}
                    onMarkPaid={() => {
                      const alreadyPaid = (item.paidCash || 0) + (item.paidBankOrGpay || 0) + (item.paidGpay || 0);
                      setMarkPaidForm({
                        paidCash: item.paidCash || 0,
                        paidBankOrGpay: alreadyPaid > 0 ? (item.paidBankOrGpay || 0) : item.netSalary,
                        paidGpay: item.paidGpay || 0,
                        gpayWallet: item.gpayWallet || "Office Gpay",
                        paymentRef: item.paymentRef || "",
                        paidDate: item.paidDate ? String(item.paidDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
                        paymentReason: item.paymentReason || "",
                      });
                      setMarkPaidItem(item);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / OPEN ANY MONTH CYCLE MODAL */}
      {showNewCycleModal && (
        <ViewportPortal onBackdropClick={() => setShowNewCycleModal(false)}>
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
        </ViewportPortal>
      )}

      {/* INTERACTIVE SLIDE-OVER PAYROLL & ATTENDANCE DRAWER */}
      {drawerItem && (
        <PayrollDetailDrawer
          item={drawerItem}
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
        <ViewportPortal onBackdropClick={() => setShowAddModal(false)}>
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
        </ViewportPortal>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmAction && (
        <ViewportPortal onBackdropClick={() => setConfirmAction(null)}>
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
        </ViewportPortal>
      )}

      {/* OFFICIAL BRANDED PAYSLIP MODAL */}
      {payslipItem && run && (
        <ViewportPortal onBackdropClick={() => setPayslipItem(null)}>
          <div
            className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between print:hidden">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Official Payslip — {payslipItem.employeeName}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {payslipItem.employeeCode} • {formatMonthLabel(run.month)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  <Printer size={14} />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayslipItem(null)}
                  className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                  aria-label="Close Payslip"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
              <BrandedPayslip
                item={payslipItem}
                month={run.month}
                halfPeriod={run.halfPeriod}
                status={run.status}
              />
            </div>
          </div>
        </ViewportPortal>
      )}

      {/* PERFORMANCE KPI SCORING MODAL */}
      {kpiItem && run && (
        <ViewportPortal onBackdropClick={() => setKpiItem(null)}>
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="text-sm font-bold text-slate-900">Performance KPI &amp; Incentive</div>
                <div className="text-[11px] text-slate-600 font-mono">
                  {kpiItem.employeeName} ({kpiItem.employeeCode}) • {formatMonthLabel(run.month)}
                </div>
              </div>
              <button type="button" onClick={() => setKpiItem(null)} className="text-slate-500 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Attendance (0-25)</label>
                  <input type="number" min={0} max={25} value={kpiForm.attendanceScore} onChange={(e) => setKpiForm({ ...kpiForm, attendanceScore: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Site Execution (0-25)</label>
                  <input type="number" min={0} max={25} value={kpiForm.siteExecutionScore} onChange={(e) => setKpiForm({ ...kpiForm, siteExecutionScore: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Punctuality (0-25)</label>
                  <input type="number" min={0} max={25} value={kpiForm.punctualityScore} onChange={(e) => setKpiForm({ ...kpiForm, punctualityScore: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Safety &amp; Discipline (0-25)</label>
                  <input type="number" min={0} max={25} value={kpiForm.safetyDisciplineScore} onChange={(e) => setKpiForm({ ...kpiForm, safetyDisciplineScore: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold" />
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
                <span className="font-bold text-indigo-800">Overall KPI Rating</span>
                <span className="text-lg font-extrabold text-indigo-700 tabular-nums">
                  {kpiForm.attendanceScore + kpiForm.siteExecutionScore + kpiForm.punctualityScore + kpiForm.safetyDisciplineScore}/100
                </span>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recommended Incentive (₹)</label>
                <input type="number" value={kpiForm.recommendedIncentive} onChange={(e) => setKpiForm({ ...kpiForm, recommendedIncentive: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-emerald-700" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reviewer Notes</label>
                <input type="text" value={kpiForm.reviewerNotes} onChange={(e) => setKpiForm({ ...kpiForm, reviewerNotes: e.target.value })} placeholder="Top site execution, zero late arrivals..." className="w-full px-3 py-2 rounded-lg border border-slate-200" />
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setKpiItem(null)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/performance", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      employeeId: kpiItem.employeeId,
                      month: run.month,
                      ...kpiForm,
                      applyToPayroll: true,
                    }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setKpiItem(null);
                    showToast(data.message);
                    loadPayroll();
                  } else {
                    showToast(data.error || "Failed to save KPI", "error");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold cursor-pointer"
              >
                Apply Performance Incentive to Payroll
              </button>
            </div>
          </div>
        </ViewportPortal>
      )}

      {/* 1-CLICK MARK PAID & RECORD BANK PROOF MODAL */}
      {markPaidItem && (
        <ViewportPortal onBackdropClick={() => setMarkPaidItem(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setMarkingPaid(true);
              try {
                const res = await fetch(`/api/payroll/items/${markPaidItem.id}/mark-paid`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(markPaidForm),
                });
                const data = await res.json();
                if (data.success) {
                  showToast(`Payment & CashBook proof recorded for ${markPaidItem.employeeName}`);
                  setMarkPaidItem(null);
                  loadPayroll();
                } else {
                  showToast(data.error || "Failed to record payment", "error");
                }
              } finally {
                setMarkingPaid(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Mark Paid &amp; Record Proof</div>
                <div className="text-[11px] text-slate-500">
                  {markPaidItem.employeeName} • Net Payable {formatINR(markPaidItem.netSalary)}
                </div>
              </div>
              <button type="button" onClick={() => setMarkPaidItem(null)} className="text-slate-500 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cash (₹)</label>
                  <input
                    type="number"
                    value={markPaidForm.paidCash}
                    onChange={(e) => setMarkPaidForm({ ...markPaidForm, paidCash: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 font-semibold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank / ICICI (₹)</label>
                  <input
                    type="number"
                    value={markPaidForm.paidBankOrGpay}
                    onChange={(e) => setMarkPaidForm({ ...markPaidForm, paidBankOrGpay: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 font-semibold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-violet-700 mb-1">GPay / UPI (₹)</label>
                  <input
                    type="number"
                    value={markPaidForm.paidGpay}
                    onChange={(e) => setMarkPaidForm({ ...markPaidForm, paidGpay: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 font-semibold tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UTR / Bank Ref No.</label>
                  <input
                    type="text"
                    placeholder="e.g. ICICI2611249981"
                    value={markPaidForm.paymentRef}
                    onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentRef: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Paid Date</label>
                  <input
                    type="date"
                    value={markPaidForm.paidDate}
                    onChange={(e) => setMarkPaidForm({ ...markPaidForm, paidDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Note / Proof Remark</label>
                <input
                  type="text"
                  placeholder="e.g. NEFT cleared from ICICI Current Acct"
                  value={markPaidForm.paymentReason}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentReason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 flex items-center justify-between">
                <span className="font-semibold text-emerald-900">Total Paying Now</span>
                <span className="text-sm font-black text-emerald-700 tabular-nums">
                  {formatINR(markPaidForm.paidCash + markPaidForm.paidBankOrGpay + markPaidForm.paidGpay)}
                </span>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setMarkPaidItem(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                disabled={markingPaid}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {markingPaid ? "Posting..." : "Mark Paid & Post to Cash Book"}
              </button>
            </div>
          </form>
        </ViewportPortal>
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
  onClose,
  onSave,
  onViewPayslip,
  onDelete,
}: {
  item: PayrollItem;
  onClose: () => void;
  onSave: (patch: Partial<PayrollItem>) => Promise<void>;
  onViewPayslip: () => void;
  onDelete: () => void;
}) {
  const [saving, setSaving] = useState(false);
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
    paidGpay: item.paidGpay || 0,
    gpayWallet: item.gpayWallet || "Office GPay",
    paymentChannel: item.paymentChannel,
    paymentStatus: item.paymentStatus || "UNPAID",
    paymentReason: item.paymentReason || "",
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
  const balance = Math.round((net - (form.paidCash + form.paidBankOrGpay + form.paidGpay)) * 100) / 100;

  return (
    <ViewportPortal variant="drawer" onBackdropClick={onClose}>
      <div
        className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="text-sm font-bold text-slate-900">{item.employeeName}</div>
            <div className="text-[11px] text-slate-600 font-mono">
              {item.employeeCode} • {item.designation || item.category}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Attendance Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-slate-600 font-bold uppercase">Working</div>
                <div className="text-sm font-extrabold text-slate-900 tabular-nums">{form.totalWorkingDays} Days</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-600 font-bold uppercase">Present</div>
                <div className="text-sm font-extrabold text-[#059669] tabular-nums">{form.daysPresent} Days</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-600 font-bold uppercase">Leave</div>
                <div className="text-sm font-extrabold text-[#E11D48] tabular-nums">{leaveDays} Days</div>
              </div>
            </div>
            {item.attendanceSummary && item.attendanceSummary.totalRecords > 0 && (
              <div className="pt-2 border-t border-slate-200/80 text-center text-[11px] font-semibold text-[#4F46E5]">
                Synced from Attendance: {item.attendanceSummary.presentCount}P · {item.attendanceSummary.paidLeaveCount}PL · {item.attendanceSummary.halfDayCount}H
                {item.attendanceSummary.otHours > 0 ? ` · ${item.attendanceSummary.otHours}h OT` : ""}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Working Days</label>
              <input type="number" value={form.totalWorkingDays} onChange={(e) => setForm({ ...form, totalWorkingDays: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#4F46E5]" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Days Present</label>
              <input type="number" step="0.5" value={form.daysPresent} onChange={(e) => setForm({ ...form, daysPresent: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#4F46E5]" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Base Rate (₹)</label>
              <input type="number" value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#4F46E5]" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">OT / Incentive (₹)</label>
              <input type="number" value={form.otAndIncentive} onChange={(e) => setForm({ ...form, otAndIncentive: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#4F46E5]" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vehicle Allowance (₹)</label>
              <input type="number" value={form.vehicleAllowance} onChange={(e) => setForm({ ...form, vehicleAllowance: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#4F46E5]" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Last Month Bal (₹)</label>
              <input type="number" value={form.lastMonthBalance} onChange={(e) => setForm({ ...form, lastMonthBalance: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#4F46E5]" />
            </div>
            <div>
              <label className="block font-semibold text-[#E11D48] mb-1">Advance Ded (₹)</label>
              <input type="number" value={form.advanceDeduction} onChange={(e) => setForm({ ...form, advanceDeduction: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#4F46E5]" />
            </div>
            <div>
              <label className="block font-semibold text-[#E11D48] mb-1">Expense Bal Ded (₹)</label>
              <input type="number" value={form.expenseBalanceDeduction} onChange={(e) => setForm({ ...form, expenseBalanceDeduction: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#4F46E5]" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Paid Cash (₹)</label>
              <input type="number" value={form.paidCash} onChange={(e) => setForm({ ...form, paidCash: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#4F46E5]" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Paid Bank / Acct (₹)</label>
              <input type="number" value={form.paidBankOrGpay} onChange={(e) => setForm({ ...form, paidBankOrGpay: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#4F46E5]" />
            </div>
            <div>
              <label className="block font-semibold text-violet-700 mb-1">Paid GPay / UPI (₹)</label>
              <input type="number" value={form.paidGpay} onChange={(e) => setForm({ ...form, paidGpay: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#4F46E5]" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GPay Wallet</label>
              <select value={form.gpayWallet} onChange={(e) => setForm({ ...form, gpayWallet: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:border-[#4F46E5]">
                <option value="Office GPay">Office GPay</option>
                <option value="Ravi GPay">Ravi GPay</option>
                <option value="Prabha GPay">Prabha GPay</option>
                <option value="Periyasamy GPay">Periyasamy GPay</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Channel</label>
              <select value={form.paymentChannel} onChange={(e) => setForm({ ...form, paymentChannel: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:border-[#4F46E5]">
                <option value="CASH">Cash</option>
                <option value="ICICI">ICICI</option>
                <option value="RBL">RBL</option>
                <option value="OFFICE_GPAY">Office GPay</option>
                <option value="AGENT_ACCOUNT">Agent Account</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Status</label>
              <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:border-[#4F46E5]">
                <option value="PAID">Paid in Full</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="HOLD">On Hold</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment / Hold Reason</label>
            <input type="text" placeholder="e.g. Settled via ICICI + Cash, Balance held pending tool return..." value={form.paymentReason} onChange={(e) => setForm({ ...form, paymentReason: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:border-[#4F46E5]" />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes</label>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:border-[#4F46E5]" />
          </div>

          {/* Live 4-Step Formula Breakdown */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 space-y-2">
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
              <div className="bg-white/80 rounded-lg px-2 py-1 text-slate-700">1. Earned: {formatINR(gross)}</div>
              <div className="bg-white/80 rounded-lg px-2 py-1 text-emerald-700">2. +Additions: {formatINR(form.otAndIncentive + form.nightDutyAmount + form.vehicleAllowance + form.lastMonthBalance)}</div>
              <div className="bg-white/80 rounded-lg px-2 py-1 text-rose-700">3. -Deductions: {formatINR(form.advanceDeduction + form.expenseBalanceDeduction)}</div>
              <div className="bg-slate-900 rounded-lg px-2 py-1 text-white font-bold">4. =Net: {formatINR(net)}</div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-indigo-200/70">
              <div>
                <div className="text-[10px] font-bold uppercase text-[#4F46E5]">Live Net Salary</div>
                <div className="text-xl font-extrabold text-slate-900 tabular-nums">{formatINR(net)}</div>
              </div>
              <div className="text-right">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    balance > 0
                      ? "bg-amber-100 text-[#D97706]"
                      : balance < 0
                      ? "bg-rose-100 text-[#E11D48]"
                      : "bg-emerald-100 text-[#059669]"
                  }`}
                >
                  {balance > 0 ? "Pending Balance" : balance < 0 ? "Advance to Recover" : "Cleared"}
                </span>
                <div className="text-sm font-extrabold text-slate-900 mt-1 tabular-nums">{formatINR(balance)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onViewPayslip}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <Printer size={13} className="text-[#4F46E5]" />
              <span>Official Payslip</span>
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white hover:bg-rose-50 text-[#E11D48] border border-rose-300 text-xs font-semibold cursor-pointer"
              title="Delete Row"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(form);
                onClose();
              } finally {
                setSaving(false);
              }
            }}
            className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </ViewportPortal>
  );
}

function PayrollTableRow({
  item,
  selected,
  onToggleSelect,
  onOpenDrawer,
  onOpenKpi,
  onPatch,
  onDelete,
  onPrint,
  onMarkPaid,
}: {
  item: PayrollItem;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenDrawer: () => void;
  onOpenKpi: () => void;
  onPatch: (id: string, patch: Partial<PayrollItem>) => void;
  onDelete: () => void;
  onPrint: () => void;
  onMarkPaid: () => void;
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
    <tr className={`hover:bg-indigo-50/40 transition ${selected ? "bg-indigo-50/50" : ""}`}>
      <td className="py-3.5 px-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
        />
      </td>

      <td className="py-4 px-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="flex items-center gap-3 text-left group cursor-pointer"
          >
            <InitialsAvatar name={item.employeeName} />
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 group-hover:text-[#4F46E5] transition whitespace-nowrap">
                {item.employeeName}
              </div>
              <div className="text-[11px] text-slate-600 font-mono truncate">
                {item.employeeCode} • {item.designation || (item.company === "INVI_CREATION" ? "Invi" : "SR")}
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={onOpenKpi}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer whitespace-nowrap ${
              (item.performanceReview?.overallRating ?? item.performanceScore)
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700"
            }`}
            title="Score Performance KPI & Apply Incentive"
          >
            {item.performanceReview?.overallRating ?? item.performanceScore
              ? `${item.performanceReview?.overallRating ?? item.performanceScore}/100 KPI`
              : "+ KPI"}
          </button>
        </div>
      </td>

      <td className="py-3.5 px-3 text-right tabular-nums">
        <div className="flex items-center justify-end gap-0.5">
          <input
            type="number"
            step="0.5"
            value={daysPresent}
            onChange={(e) => setDaysPresent(e.target.value)}
            onKeyDown={handleEnterBlur}
            onBlur={() => commitNum("daysPresent", daysPresent, item.daysPresent)}
            className="w-14 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-[#4F46E5] focus:bg-white bg-transparent font-semibold text-slate-900 tabular-nums"
          />
          <span className="text-[11px] text-slate-600">/{item.totalWorkingDays}</span>
        </div>
        {item.attendanceSummary && item.attendanceSummary.totalRecords > 0 && (
          <div className="text-[10px] font-semibold text-[#4F46E5] whitespace-nowrap mt-0.5">
            {item.category === "OFFICE" && item.attendanceSummary.remainingScheduledDays && item.attendanceSummary.remainingScheduledDays > 0
              ? `Proj: ${item.attendanceSummary.markedPayableSoFar ?? item.attendanceSummary.payableDays} marked + ${item.attendanceSummary.remainingScheduledDays} left`
              : item.category !== "OFFICE"
              ? `Worked: ${item.daysPresent}d × ${formatINR(item.baseRate)}`
              : `Synced: ${item.attendanceSummary.presentCount}P · ${item.attendanceSummary.paidLeaveCount}PL · ${item.attendanceSummary.halfDayCount}H`}
          </div>
        )}
      </td>

      <td className="py-3.5 px-3 text-right tabular-nums">
        <input
          type="number"
          value={baseRate}
          onChange={(e) => setBaseRate(e.target.value)}
          onKeyDown={handleEnterBlur}
          onBlur={() => commitNum("baseRate", baseRate, item.baseRate)}
          className="w-16 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-[#4F46E5] focus:bg-white bg-transparent text-slate-900 font-medium tabular-nums"
        />
      </td>

      <td className="py-3.5 px-3 text-right font-semibold text-slate-900 tabular-nums">{formatINR(item.grossSalary)}</td>

      <td className="py-3.5 px-3 text-right tabular-nums">
        <input
          type="number"
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
          className="w-16 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-[#4F46E5] focus:bg-white bg-transparent text-[#059669] font-semibold tabular-nums"
        />
      </td>

      <td className="py-3.5 px-3 text-right tabular-nums">
        <input
          type="number"
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
          className="w-16 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-[#4F46E5] focus:bg-white bg-transparent text-[#E11D48] font-semibold tabular-nums"
        />
      </td>

      <td className="py-3.5 px-3 text-right font-bold text-slate-900 tabular-nums">{formatINR(item.netSalary)}</td>

      <td className="py-3.5 px-3 text-right tabular-nums">
        <input
          type="number"
          value={paidCash}
          onChange={(e) => setPaidCash(e.target.value)}
          onKeyDown={handleEnterBlur}
          onBlur={() => commitNum("paidCash", paidCash, item.paidCash)}
          className="w-16 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-[#4F46E5] focus:bg-white bg-transparent text-slate-900 font-medium tabular-nums"
        />
      </td>

      <td className="py-3.5 px-3 text-right tabular-nums">
        <input
          type="number"
          value={paidBank}
          onChange={(e) => setPaidBank(e.target.value)}
          onKeyDown={handleEnterBlur}
          onBlur={() => commitNum("paidBankOrGpay", paidBank, item.paidBankOrGpay)}
          className="w-16 text-right px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-[#4F46E5] focus:bg-white bg-transparent text-slate-900 font-medium tabular-nums"
        />
      </td>

      <td className="py-4 px-3">
        <div className="flex items-center gap-1.5">
          <ChannelBadge channel={item.paymentChannel} />
          <select
            value={item.paymentChannel}
            onChange={(e) => onPatch(item.id, { paymentChannel: e.target.value })}
            aria-label="Payment Channel"
            className="w-5 h-5 rounded border border-slate-200 bg-white text-[10px] text-slate-600 focus:outline-none cursor-pointer"
          >
            <option value="CASH">Cash</option>
            <option value="ICICI">ICICI</option>
            <option value="OFFICE_GPAY">GPay</option>
            <option value="AGENT_ACCOUNT">Agent</option>
          </select>
        </div>
      </td>

      <td className="py-4 px-3 text-right tabular-nums">
        <div className="flex flex-col items-end gap-1">
          <BalanceBadge amount={item.carryForwardBalance} />
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              item.paymentStatus === "PAID"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : item.paymentStatus === "PARTIAL"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : item.paymentStatus === "HOLD"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {item.paymentStatus === "PAID"
              ? "Paid in Full"
              : item.paymentStatus === "PARTIAL"
              ? "Partially Paid"
              : item.paymentStatus === "HOLD"
              ? "On Hold"
              : "Unpaid"}
          </span>
          {item.paymentReason && (
            <span className="text-[10px] text-slate-500 max-w-[130px] truncate" title={item.paymentReason}>
              {item.paymentReason}
            </span>
          )}
        </div>
      </td>

      <td className="py-3.5 px-3">
        <input
          type="text"
          value={notes}
          placeholder="Add note..."
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={handleEnterBlur}
          onBlur={() => {
            if (notes !== (item.notes || "")) onPatch(item.id, { notes });
          }}
          className="w-28 px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-[#4F46E5] focus:bg-white bg-transparent text-[11px] text-slate-600 truncate"
        />
      </td>

      <td className="py-3.5 px-4 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={onMarkPaid}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              item.paymentStatus === "PAID"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs"
            }`}
            title="Mark Paid & Record Cash/Bank Proof"
          >
            {item.paymentStatus === "PAID" ? "Proof" : "Mark Paid"}
          </button>
          <button
            type="button"
            onClick={onOpenDrawer}
            className="p-1.5 rounded-lg text-slate-600 hover:text-[#4F46E5] hover:bg-indigo-50 transition cursor-pointer"
            title="Edit in Drawer"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="p-1.5 rounded-lg text-slate-600 hover:text-[#4F46E5] hover:bg-indigo-50 transition cursor-pointer"
            title="View & Print Official Payslip"
          >
            <Printer size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-600 hover:text-[#E11D48] hover:bg-rose-50 transition cursor-pointer"
            title="Delete Row"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
