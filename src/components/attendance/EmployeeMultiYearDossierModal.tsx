"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  Calendar,
  Briefcase,
  FileSpreadsheet,
  Printer,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Building,
  Palmtree,
  ShieldCheck,
  Users2,
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

interface EmployeeHeader {
  id: string;
  name: string;
  employeeCode: string;
  empCode?: string | null;
  designation?: string | null;
  role?: string | null;
  category: string;
  companyUnit?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeHeader | null;
  isContractorTeam?: boolean;
}

export default function EmployeeMultiYearDossierModal({
  isOpen,
  onClose,
  employee,
  isContractorTeam = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [dossierData, setDossierData] = useState<any>(null);
  const [activeYear, setActiveYear] = useState<string>("2026");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(10); // Nov = 10 (0-indexed)

  const supportedYears = ["2025", "2026", "2027", "2028", "2029", "2030"];

  useEffect(() => {
    if (!isOpen || !employee) {
      setDossierData(null);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const url = isContractorTeam
          ? `/api/attendance/history?contractorTeamName=${encodeURIComponent(employee.name)}`
          : `/api/attendance/history?employeeId=${employee.id}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setDossierData(data);
          if (data.yearsList && data.yearsList.length > 0) {
            setActiveYear(data.yearsList.includes("2026") ? "2026" : data.yearsList[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load attendance dossier:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, employee, isContractorTeam]);

  if (!isOpen || !employee) return null;

  const handleExportExcel = () => {
    if (!dossierData || !employee) return;
    const yearData = dossierData.yearlyData?.[activeYear];
    if (!yearData) return;

    if (isContractorTeam) {
      const exportRows = yearData.months.map((m: any) => ({
        Year: activeYear,
        Month: m.monthName,
        "Total Labours (Headcount)": m.headcount,
        "Active Work Days": m.logsCount,
        "Sites Deployed": m.sites?.join(", ") || "-",
      }));
      exportToExcel(
        exportRows,
        `${employee.name}_Contractor_Attendance_Dossier_${activeYear}`,
        "ContractorDossier"
      );
      return;
    }

    const exportRows = yearData.months.map((m: any) => ({
      Year: activeYear,
      Month: m.monthName,
      "Present (P)": m.present,
      "Half-Day (H)": m.halfDay,
      "1-Hr Permission (1H)": m.permission,
      "Paid Leave (PL)": m.paidLeave || 0,
      "Unpaid Leave (UP)": m.unpaidLeave || 0,
      "Absent (A)": m.absent,
      "Sunday Off (L)": m.leave,
      "Net Payable Days": m.payableDays,
      "Deployed Sites": m.sites?.join(", ") || "-",
    }));

    exportToExcel(
      exportRows,
      `${employee.employeeCode}_${employee.name}_Attendance_Dossier_${activeYear}`,
      "MultiYearDossier"
    );
  };

  const currentYearData = dossierData?.yearlyData?.[activeYear];
  const activeMonthData = currentYearData?.months?.[selectedMonthIndex];
  const isOffice = employee.category === "OFFICE_STAFF";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
        {/* Header - Pure Attendance */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                isOffice
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : isContractorTeam
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
              }`}
            >
              {isContractorTeam ? <Users2 size={20} /> : employee.employeeCode.slice(-3)}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{employee.name}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {employee.employeeCode} {employee.empCode ? `(${employee.empCode})` : ""}
                </span>
                {employee.companyUnit && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {employee.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs"}
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Attendance & Tenure Dossier
                </span>
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <Briefcase size={12} />
                <span>{employee.designation || employee.role || (isContractorTeam ? "Contractor Team" : "Workforce")}</span>
                <span>•</span>
                <span className="capitalize">{employee.category.replace(/_/g, " ").toLowerCase()}</span>
                <span>•</span>
                <span className="text-slate-400">Strict Attendance Records (No Payroll / Salary)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!dossierData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50 cursor-pointer"
            >
              <Download size={13} />
              <span>Export (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <Printer size={13} />
              <span>Print A4</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading multi-year attendance dossier & permission log...</span>
          </div>
        ) : !dossierData ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No attendance records found for this person yet.
          </div>
        ) : isContractorTeam ? (
          /* ================= CONTRACTOR TEAM DOSSIER ================= */
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {/* Lifetime Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                  Total Active Logs
                </span>
                <span className="text-xl font-black text-emerald-600 tabular-nums">
                  {dossierData.lifetimeSummary?.totalLogs || 0} Days
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 block">
                  Total Cumulative Man-Days
                </span>
                <span className="text-xl font-black text-blue-600 tabular-nums">
                  {dossierData.lifetimeSummary?.lifetimeHeadcount || 0} Labours
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-center">
                <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400 block">
                  Project Sites Worked
                </span>
                <span className="text-xl font-black text-purple-600 tabular-nums">
                  {dossierData.lifetimeSummary?.sitesWorked?.length || 0} Sites
                </span>
              </div>
            </div>

            {/* Year Switcher */}
            <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Year:</span>
                <div className="flex items-center gap-1">
                  {supportedYears.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setActiveYear(yr)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeYear === yr
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-500">
                <span>{activeYear} Total Labours Deployed: </span>
                <strong className="text-blue-600 text-sm">{currentYearData?.totals?.headcount || 0} Labours</strong>
              </div>
            </div>

            {/* 12-Month Table Breakdown */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">Active Work Days</th>
                    <th className="py-2.5 px-3 text-center font-black text-blue-700">Total Man-Days</th>
                    <th className="py-2.5 px-3">Sites Deployed</th>
                    <th className="py-2.5 px-3 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentYearData?.months?.map((m: any, idx: number) => (
                    <tr
                      key={m.monthName}
                      onClick={() => setSelectedMonthIndex(idx)}
                      className={`cursor-pointer transition ${
                        selectedMonthIndex === idx ? "bg-blue-50/80 dark:bg-blue-950/40 font-semibold" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {m.monthName} {activeYear}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-600 tabular-nums">
                        {m.logsCount} Days
                      </td>
                      <td className="py-2 px-3 text-center font-black text-blue-700 dark:text-blue-300 tabular-nums bg-blue-50/50 dark:bg-blue-950/30">
                        {m.headcount} Labours
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[280px]">
                        {m.sites?.join(", ") || "—"}
                      </td>
                      <td className="py-2 px-3 text-center text-blue-600 font-bold text-[11px]">
                        {selectedMonthIndex === idx ? "Viewing" : "Click to view"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Daily Log Inspector */}
            {activeMonthData && (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>
                    Daily Logs Inspector • {activeMonthData.monthName} {activeYear} ({activeMonthData.records?.length || 0} Entries)
                  </span>
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold text-[10px] uppercase">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Site Location</th>
                        <th className="py-2 px-3 text-center">Headcount</th>
                        <th className="py-2 px-3">Work Status</th>
                        <th className="py-2 px-3">Worker Breakdown / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeMonthData.records?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            No logs recorded in {activeMonthData.monthName} {activeYear}.
                          </td>
                        </tr>
                      ) : (
                        activeMonthData.records?.map((rec: any) => (
                          <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {String(rec.date).split("T")[0]}
                            </td>
                            <td className="py-2 px-3 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <MapPin size={12} className="text-slate-400" />
                              <span>{rec.siteName || "Site Standby"}</span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full font-black text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                {rec.headcount} Labours
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {rec.siteWorkStatus || "Active Work"}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                              {rec.workerBreakdown || rec.remarks || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================= INDIVIDUAL EMPLOYEE / LABOUR ATTENDANCE DOSSIER ================= */
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {/* Lifetime Summary Tenure KPIs - Pure Attendance */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Present (P)</span>
                <span className="text-lg font-black text-emerald-600 tabular-nums">
                  {dossierData.lifetimeSummary?.present || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-center">
                <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-400 block">1-Hr Perm (1H)</span>
                <span className="text-lg font-black text-sky-600 tabular-nums">
                  {dossierData.lifetimeSummary?.permission || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">Half-Day (H)</span>
                <span className="text-lg font-black text-amber-500 tabular-nums">
                  {dossierData.lifetimeSummary?.halfDay || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-center">
                <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 block">Paid Leave (PL)</span>
                <span className="text-lg font-black text-teal-600 tabular-nums">
                  {dossierData.lifetimeSummary?.paidLeave || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Unpaid (UP)</span>
                <span className="text-lg font-black text-slate-600 dark:text-slate-300 tabular-nums">
                  {dossierData.lifetimeSummary?.unpaidLeave || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center">
                <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">Absent (A)</span>
                <span className="text-lg font-black text-rose-500 tabular-nums">
                  {dossierData.lifetimeSummary?.absent || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sundays (L)</span>
                <span className="text-lg font-black text-slate-500 tabular-nums">
                  {dossierData.lifetimeSummary?.leave || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-center">
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">Net Payable</span>
                <span className="text-lg font-black text-blue-700 dark:text-blue-300 tabular-nums">
                  {dossierData.lifetimeSummary?.payableDays || 0}
                </span>
              </div>
            </div>

            {/* Multi-Year Switcher (2025 - 2030) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Year:</span>
                <div className="flex items-center gap-1">
                  {supportedYears.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setActiveYear(yr)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeYear === yr
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-500">
                <span>{activeYear} Total Net Payable: </span>
                <strong className="text-blue-600 text-sm">{currentYearData?.totals?.payableDays || 0} Days</strong>
              </div>
            </div>

            {/* 12-Month Table Breakdown for Selected Year - PURE ATTENDANCE */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-2 text-center text-emerald-700">P (1.0)</th>
                    <th className="py-2.5 px-2 text-center text-sky-700">1H (1.0)</th>
                    <th className="py-2.5 px-2 text-center text-amber-700">H (0.5)</th>
                    <th className="py-2.5 px-2 text-center text-teal-700">PL (1.0)</th>
                    <th className="py-2.5 px-2 text-center text-slate-600">UP (0.0)</th>
                    <th className="py-2.5 px-2 text-center text-rose-700">A (0.0)</th>
                    <th className="py-2.5 px-2 text-center text-slate-600">L (Sun)</th>
                    <th className="py-2.5 px-2 text-center font-black bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                      Net Payable
                    </th>
                    <th className="py-2.5 px-3">Sites Deployed</th>
                    <th className="py-2.5 px-3 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentYearData?.months?.map((m: any, idx: number) => {
                    const isSelectedMonth = selectedMonthIndex === idx;
                    return (
                      <tr
                        key={m.monthName}
                        onClick={() => setSelectedMonthIndex(idx)}
                        className={`cursor-pointer transition ${
                          isSelectedMonth
                            ? "bg-blue-50/80 dark:bg-blue-950/40 font-semibold"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                          {m.monthName} {activeYear}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-emerald-600 tabular-nums">{m.present}</td>
                        <td className="py-2 px-2 text-center font-bold text-sky-600 tabular-nums">{m.permission}</td>
                        <td className="py-2 px-2 text-center font-bold text-amber-500 tabular-nums">{m.halfDay}</td>
                        <td className="py-2 px-2 text-center font-bold text-teal-600 tabular-nums">{m.paidLeave || 0}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-500 tabular-nums">{m.unpaidLeave || 0}</td>
                        <td className="py-2 px-2 text-center font-bold text-rose-500 tabular-nums">{m.absent}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-400 tabular-nums">{m.leave}</td>
                        <td className="py-2 px-2 text-center font-black text-blue-700 dark:text-blue-300 tabular-nums bg-blue-50/50 dark:bg-blue-950/30">
                          {m.payableDays}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                          {m.sites?.join(", ") || "—"}
                        </td>
                        <td className="py-2 px-3 text-center text-blue-600 font-bold text-[11px]">
                          {isSelectedMonth ? "Viewing" : "Click to view"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 1-Hour Permissions Audit Log */}
            {dossierData.permissionsLog && dossierData.permissionsLog.length > 0 && (
              <div className="p-4 rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 space-y-2">
                <div className="flex items-center gap-2 text-sky-900 dark:text-sky-300 font-extrabold text-xs">
                  <Clock size={14} className="text-sky-600" />
                  <span>1-Hour Permission Records Log ({dossierData.permissionsLog.length} Permissions)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {dossierData.permissionsLog.map((p: any, i: number) => (
                    <div key={i} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-sky-900 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>{p.date}</span>
                        <span className="text-[10px] text-sky-600 bg-sky-50 dark:bg-sky-950 px-1.5 py-0.2 rounded font-black">
                          1H Approved
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 italic">"{p.note || "1-Hour Morning Permission"}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Records Inspector for Selected Month - PURE ATTENDANCE */}
            {activeMonthData && (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>
                    Daily Attendance Inspector • {activeMonthData.monthName} {activeYear} ({activeMonthData.dailyRecords?.length || 0} Entries)
                  </span>
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold text-[10px] uppercase">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3 text-center">In Time</th>
                        <th className="py-2 px-3 text-center">Out Time</th>
                        <th className="py-2 px-3">Site / Deployment</th>
                        <th className="py-2 px-3">Work Notes / Permission Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeMonthData.dailyRecords?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            No attendance records marked in {activeMonthData.monthName} {activeYear}.
                          </td>
                        </tr>
                      ) : (
                        activeMonthData.dailyRecords?.map((rec: any) => (
                          <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {rec.date}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                                  rec.status === "P"
                                    ? "bg-emerald-600 text-white"
                                    : rec.status === "1H"
                                    ? "bg-sky-600 text-white"
                                    : rec.status === "H"
                                    ? "bg-amber-500 text-white"
                                    : rec.status === "PL"
                                    ? "bg-teal-600 text-white"
                                    : rec.status === "UP"
                                    ? "bg-slate-600 text-white"
                                    : rec.status === "A"
                                    ? "bg-rose-600 text-white"
                                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {rec.status === "1H" ? "P·1H" : rec.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-500">{rec.inTime || "—"}</td>
                            <td className="py-2 px-3 text-center font-mono text-slate-500">{rec.outTime || "—"}</td>
                            <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{rec.siteName || (isOffice ? "Headquarters Office" : "—")}</td>
                            <td className="py-2 px-3 text-slate-500 italic max-w-[280px] truncate">
                              {rec.permissionNote || rec.workNotes || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
          <span className="text-xs text-slate-400">
            Attendance verification record • Standard Roofs Books HRIS
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
