"use client";

import React, { useEffect, useState } from "react";
import { X, FileSpreadsheet, Printer, Calendar, History } from "lucide-react";
import { ViewportPortal } from "@/components/ui/ViewportPortal";
import { exportToExcel } from "@/lib/exportUtils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string | null;
  employeeCode?: string | null;
  employeeName: string;
}

function formatINR(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(val || 0));
}

function formatMonthLabel(ym: string) {
  const [y, m] = (ym || "").split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export default function EmployeeSalaryHistoryModal({
  isOpen,
  onClose,
  employeeId,
  employeeCode,
  employeeName,
}: Props) {
  const [fy, setFy] = useState<"ALL" | "2026-27" | "2025-26">("ALL");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (employeeId) params.set("employeeId", employeeId);
    if (employeeCode) params.set("employeeCode", employeeCode);
    if (employeeName) params.set("employeeName", employeeName);
    params.set("fy", fy);

    fetch(`/api/payroll/employee-history?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
      })
      .finally(() => setLoading(false));
  }, [isOpen, employeeId, employeeCode, employeeName, fy]);

  if (!isOpen) return null;

  const items: any[] = data?.items || [];
  const totals = data?.totals || {};
  const emp = data?.employee || {};

  const handleDownloadExcel = () => {
    if (items.length === 0) return;
    const rows = items.map((it) => {
      const otLastInc =
        it.otAndIncentive +
        (it.performanceIncentive || 0) +
        it.nightDutyAmount +
        (it.vehicleAllowance || 0) +
        it.lastMonthBalance;
      const bankTotal = (it.paidBankOrGpay || 0) + (it.paidGpay || 0);
      const half =
        it.payrollRun?.halfPeriod === "FIRST_HALF"
          ? " (1-15)"
          : it.payrollRun?.halfPeriod === "SECOND_HALF"
          ? " (16-30)"
          : "";
      return {
        "Month / Cycle": `${formatMonthLabel(it.payrollRun?.month)}${half}`,
        "Total Working Days": it.totalWorkingDays,
        "Days Present": it.daysPresent,
        "Salary / Month": it.baseRate,
        "Gross Salary": it.grossSalary,
        "Expenses Balance": it.expenseBalanceDeduction || 0,
        Advance: it.advanceDeduction || 0,
        "OT + Last Bal + Incentive": otLastInc,
        "Net Salary": it.netSalary,
        Cash: it.paidCash || 0,
        "ICICI / Bank": bankTotal,
        Balance: it.carryForwardBalance || 0,
        Notes: it.notes || "",
      };
    });
    rows.push({
      "Month / Cycle": "Yearly Total Salary",
      "Total Working Days": totals.totalWorkingDays || 0,
      "Days Present": totals.daysPresent || 0,
      "Salary / Month": 0,
      "Gross Salary": totals.grossSalary || 0,
      "Expenses Balance": totals.expenseBalanceDeduction || 0,
      Advance: totals.advanceDeduction || 0,
      "OT + Last Bal + Incentive": totals.otLastInc || 0,
      "Net Salary": totals.netSalary || 0,
      Cash: totals.paidCash || 0,
      "ICICI / Bank": totals.paidBank || 0,
      Balance: totals.carryForwardBalance || 0,
      Notes: `${emp.name || employeeName} (${fy})`,
    });
    exportToExcel(rows, `SR_Salary_History_${(emp.name || employeeName).replace(/\s+/g, "_")}_${fy}`, "Salary Ledger");
  };

  return (
    <ViewportPortal onBackdropClick={onClose}>
      <div
        className="w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold !text-white">
                Lifetime &amp; Yearly Salary Ledger — {emp.name || employeeName}
              </h3>
              <p className="text-[11px] text-slate-300">
                {emp.employeeCode || employeeCode || "—"} • {emp.designation || "Staff"} • Joined:{" "}
                {emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString("en-IN") : "Earliest Record"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1 text-xs">
              <Calendar size={13} className="text-indigo-200" />
              <select
                value={fy}
                onChange={(e) => setFy(e.target.value as any)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="text-slate-900">All Time (From Joining)</option>
                <option value="2026-27" className="text-slate-900">FY 2026–27 (Apr 26 – Mar 27)</option>
                <option value="2025-26" className="text-slate-900">FY 2025–26 (Apr 25 – Mar 26)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet size={13} />
              <span>Download Employee Report (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
            >
              <Printer size={13} />
              <span>Print PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">Loading salary history...</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              No payroll records found for {emp.name || employeeName} in {fy === "ALL" ? "All Time" : `FY ${fy}`}.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <div className="px-4 py-2.5 bg-indigo-950 text-white text-xs font-extrabold uppercase tracking-wide">
                Salary Ledger for {emp.name || employeeName} ({fy === "ALL" ? "All Time" : `FY ${fy}`})
              </div>
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-700 font-extrabold">
                  <tr>
                    <th className="py-2.5 px-3">Month / Cycle</th>
                    <th className="py-2.5 px-2 text-right">Total Working Days</th>
                    <th className="py-2.5 px-2 text-right">Days Present</th>
                    <th className="py-2.5 px-2 text-right">Salary / Month</th>
                    <th className="py-2.5 px-2 text-right">Gross Salary</th>
                    <th className="py-2.5 px-2 text-right">Expenses Balance</th>
                    <th className="py-2.5 px-2 text-right">Advance</th>
                    <th className="py-2.5 px-2 text-right">OT + Last Bal + Incentive</th>
                    <th className="py-2.5 px-2 text-right text-indigo-700">Net Salary</th>
                    <th className="py-2.5 px-2 text-right">Cash</th>
                    <th className="py-2.5 px-2 text-right">ICICI / Bank</th>
                    <th className="py-2.5 px-2 text-right">Balance</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => {
                    const otLastInc =
                      it.otAndIncentive +
                      (it.performanceIncentive || 0) +
                      it.nightDutyAmount +
                      (it.vehicleAllowance || 0) +
                      it.lastMonthBalance;
                    const bankTotal = (it.paidBankOrGpay || 0) + (it.paidGpay || 0);
                    const half =
                      it.payrollRun?.halfPeriod === "FIRST_HALF"
                        ? " (1-15)"
                        : it.payrollRun?.halfPeriod === "SECOND_HALF"
                        ? " (16-30)"
                        : "";
                    return (
                      <tr key={it.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {formatMonthLabel(it.payrollRun?.month)}
                          <span className="text-[10px] text-slate-500 font-semibold">{half}</span>
                        </td>
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
                    <td className="py-3 px-3">Yearly Total Salary</td>
                    <td className="py-3 px-2 text-right tabular-nums">{totals.totalWorkingDays || 0}</td>
                    <td className="py-3 px-2 text-right tabular-nums">{totals.daysPresent || 0}</td>
                    <td className="py-3 px-2 text-right tabular-nums">—</td>
                    <td className="py-3 px-2 text-right tabular-nums">{formatINR(totals.grossSalary || 0)}</td>
                    <td className="py-3 px-2 text-right tabular-nums">{formatINR(totals.expenseBalanceDeduction || 0)}</td>
                    <td className="py-3 px-2 text-right tabular-nums text-rose-700">{formatINR(totals.advanceDeduction || 0)}</td>
                    <td className="py-3 px-2 text-right tabular-nums text-emerald-700">{formatINR(totals.otLastInc || 0)}</td>
                    <td className="py-3 px-2 text-right tabular-nums text-indigo-700">{formatINR(totals.netSalary || 0)}</td>
                    <td className="py-3 px-2 text-right tabular-nums">{formatINR(totals.paidCash || 0)}</td>
                    <td className="py-3 px-2 text-right tabular-nums">{formatINR(totals.paidBank || 0)}</td>
                    <td className="py-3 px-2 text-right tabular-nums">{formatINR(totals.carryForwardBalance || 0)}</td>
                    <td className="py-3 px-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ViewportPortal>
  );
}
