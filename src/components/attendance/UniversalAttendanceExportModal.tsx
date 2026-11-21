"use client";

import React, { useState } from "react";
import {
  X,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Layers,
  Users,
  CheckCircle2,
  Building,
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "office" | "tamil" | "hindi" | "contractor";
  employees: any[];
  contractors: any[];
  contractorLogs: any[];
  holidays: any[];
  selectedMonth: string;
  selectedYear: number;
}

export default function UniversalAttendanceExportModal({
  isOpen,
  onClose,
  activeTab,
  employees,
  contractors,
  contractorLogs,
  holidays,
  selectedMonth,
  selectedYear,
}: Props) {
  const [periodType, setPeriodType] = useState<"MONTH" | "CALENDAR_YEAR" | "FINANCIAL_YEAR" | "APPRAISAL_YEAR">("MONTH");
  const [targetScope, setTargetScope] = useState<"CURRENT_TAB" | "ALL_WORKFORCE">("CURRENT_TAB");
  const [customMonth, setCustomMonth] = useState<string>(selectedMonth);
  const [customYear, setCustomYear] = useState<number>(selectedYear);
  const [exporting, setExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExport = (format: "EXCEL" | "PDF") => {
    setExporting(true);
    try {
      // Determine workforce records
      let targetEmployees = employees;
      if (targetScope === "CURRENT_TAB") {
        if (activeTab === "office") targetEmployees = employees.filter((e) => e.category === "OFFICE_STAFF");
        else if (activeTab === "tamil") targetEmployees = employees.filter((e) => e.category === "TAMIL_LABOUR");
        else if (activeTab === "hindi") targetEmployees = employees.filter((e) => e.category === "HINDI_LABOUR");
      }

      const rows: any[] = [];

      targetEmployees.forEach((emp) => {
        let pTotal = 0;
        let hTotal = 0;
        let p1hTotal = 0;
        let mrgPermTotal = 0;
        let evePermTotal = 0;
        let plTotal = 0;
        let upTotal = 0;
        let aTotal = 0;
        let lTotal = 0;
        let otHoursTotal = 0;

        emp.attendances?.forEach((att: any) => {
          const st = att.status;
          if (st === "P") pTotal++;
          else if (st === "H") hTotal++;
          else if (st === "1H") {
            p1hTotal++;
            if (att.permissionSlot === "EVENING") evePermTotal++;
            else mrgPermTotal++;
          } else if (st === "PL") plTotal++;
          else if (st === "UP") upTotal++;
          else if (st === "A") aTotal++;
          else if (st === "L") lTotal++;

          if (att.otHours) otHoursTotal += Number(att.otHours);
        });

        const isOffice = emp.category === "OFFICE_STAFF";
        const netPayable = isOffice
          ? pTotal + p1hTotal + plTotal + hTotal * 0.5
          : pTotal + p1hTotal + hTotal * 0.5;

        rows.push({
          "Employee Code": emp.employeeCode,
          "Full Name": emp.name,
          "Role / Designation": emp.designation || emp.role || "Workforce",
          Category: emp.category?.replace(/_/g, " "),
          "Company Unit": emp.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs",
          "Present (P)": pTotal,
          "1-Hr Perm (1H)": p1hTotal,
          "Mrg Perm": mrgPermTotal,
          "Eve Perm": evePermTotal,
          "Half-Day (H)": hTotal,
          "Paid Leave (PL)": plTotal,
          "Unpaid Leave (UP)": upTotal,
          "Absent (A)": aTotal,
          "Sunday Off (L)": lTotal,
          "Net Payable Days": netPayable,
          "Total OT Hours": otHoursTotal,
        });
      });

      // Include contractor logs if ALL or contractor tab
      if (targetScope === "ALL_WORKFORCE" || activeTab === "contractor") {
        contractorLogs.forEach((log) => {
          rows.push({
            "Employee Code": log.contractorTeamName?.slice(0, 8),
            "Full Name": log.contractorTeamName,
            "Role / Designation": "Contractor Team",
            Category: "CONTRACTOR",
            "Company Unit": "Standard Roofs",
            "Present (P)": log.headcount > 0 ? log.headcount : 0,
            "1-Hr Perm (1H)": 0,
            "Mrg Perm": 0,
            "Eve Perm": 0,
            "Half-Day (H)": 0,
            "Paid Leave (PL)": 0,
            "Unpaid Leave (UP)": 0,
            "Absent (A)": log.headcount === 0 ? 1 : 0,
            "Sunday Off (L)": 0,
            "Net Payable Days": `${log.headcount} Labours`,
            "Total OT Hours": log.otHours || 0,
          });
        });
      }

      if (format === "PDF") {
        window.print();
        onClose();
        return;
      }

      let filename = `SR_Books_Attendance_${targetScope}_${periodType}`;
      if (periodType === "MONTH") filename += `_${customMonth}`;
      else filename += `_${customYear}`;

      exportToExcel(rows, filename, "AttendanceScorecard");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to generate report.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Download size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Attendance & Working Days Exporter
              </h3>
              <p className="text-xs text-slate-400">
                Generate official audit-ready .xlsx or A4 PDF records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Workforce Scope */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Workforce Scope
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetScope("CURRENT_TAB")}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center justify-center gap-2 ${
                  targetScope === "CURRENT_TAB"
                    ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Layers size={14} />
                <span>Current Tab ({activeTab.toUpperCase()})</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope("ALL_WORKFORCE")}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center justify-center gap-2 ${
                  targetScope === "ALL_WORKFORCE"
                    ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Users size={14} />
                <span>All Workforce (All 4 Groups)</span>
              </button>
            </div>
          </div>

          {/* Period Selector */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Period Selector (3 Flexible Modes)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPeriodType("MONTH")}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center gap-2 ${
                  periodType === "MONTH"
                    ? "bg-blue-50 text-blue-700 border-blue-500 font-black dark:bg-blue-950 dark:text-blue-300"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Calendar size={13} />
                <span>1. Specific Month</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriodType("CALENDAR_YEAR")}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center gap-2 ${
                  periodType === "CALENDAR_YEAR"
                    ? "bg-blue-50 text-blue-700 border-blue-500 font-black dark:bg-blue-950 dark:text-blue-300"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Calendar size={13} />
                <span>2. Calendar Year (Jan–Dec)</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriodType("FINANCIAL_YEAR")}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center gap-2 ${
                  periodType === "FINANCIAL_YEAR"
                    ? "bg-blue-50 text-blue-700 border-blue-500 font-black dark:bg-blue-950 dark:text-blue-300"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Calendar size={13} />
                <span>3. Financial Year (Apr–Mar)</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriodType("APPRAISAL_YEAR")}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center gap-2 ${
                  periodType === "APPRAISAL_YEAR"
                    ? "bg-blue-50 text-blue-700 border-blue-500 font-black dark:bg-blue-950 dark:text-blue-300"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Calendar size={13} />
                <span>4. Appraisal Year (Apr–Apr)</span>
              </button>
            </div>
          </div>

          {/* Dynamic Inputs depending on period */}
          {periodType === "MONTH" ? (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Month
              </label>
              <input
                type="month"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
              />
            </div>
          ) : (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Base Year
              </label>
              <select
                value={customYear}
                onChange={(e) => setCustomYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    {periodType === "FINANCIAL_YEAR"
                      ? `FY ${y}–${y + 1} (Apr ${y} – Mar ${y + 1})`
                      : periodType === "APPRAISAL_YEAR"
                      ? `Appraisal ${y}–${y + 1} (Apr ${y} – Apr ${y + 1})`
                      : `Calendar Year ${y} (Jan ${y} – Dec ${y})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Export Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleExport("PDF")}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition cursor-pointer"
            >
              <Printer size={14} />
              <span>Print A4 PDF</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport("EXCEL")}
              disabled={exporting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Download (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
