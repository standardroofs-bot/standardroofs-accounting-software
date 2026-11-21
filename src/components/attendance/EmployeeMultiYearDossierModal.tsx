"use client";

import React, { useState, useEffect } from "react";
import { X, Download, Calendar, Briefcase, FileSpreadsheet, UserCheck, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { exportToExcel } from "@/lib/exportUtils";

interface EmployeeHeader {
  id: string;
  name: string;
  employeeCode: string;
  empCode?: string | null;
  designation?: string | null;
  role?: string | null;
  category: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeHeader | null;
}

export default function EmployeeMultiYearDossierModal({ isOpen, onClose, employee }: Props) {
  const [loading, setLoading] = useState(false);
  const [dossierData, setDossierData] = useState<any>(null);
  const [activeYear, setActiveYear] = useState<string>("2026");

  useEffect(() => {
    if (!isOpen || !employee) {
      setDossierData(null);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/attendance/history?employeeId=${employee.id}`);
        const data = await res.json();
        if (data.success) {
          setDossierData(data);
          if (data.yearsList && data.yearsList.length > 0) {
            setActiveYear(data.yearsList[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load attendance dossier:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const handleExportExcel = () => {
    if (!dossierData || !employee) return;
    const yearData = dossierData.yearlyData?.[activeYear];
    if (!yearData) return;

    const exportRows = yearData.months.map((m: any) => ({
      Year: activeYear,
      Month: m.monthName,
      "Present (P)": m.present,
      "Half-Day (H)": m.halfDay,
      "1-Hr Permission (1H)": m.permission,
      "Absent (A)": m.absent,
      "Leaves/Sundays (L)": m.leave,
      "Net Payable Days": m.payableDays,
      "Daily Advances (₹)": m.advances,
      "Deployed Sites": m.sites?.join(", ") || "-",
    }));

    exportToExcel(
      exportRows,
      `${employee.employeeCode}_${employee.name}_Attendance_${activeYear}`,
      "Dossier"
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-black text-sm">
              {employee.employeeCode.slice(-3)}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{employee.name}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {employee.employeeCode}
                </span>
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <Briefcase size={12} />
                <span>{employee.designation || employee.role || "Workforce"}</span>
                <span>•</span>
                <span className="capitalize">{employee.category.replace(/_/g, " ").toLowerCase()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!dossierData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
            >
              <Download size={14} />
              <span>Export Dossier (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading multi-year attendance dossier...</span>
          </div>
        ) : !dossierData ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No attendance records found for this employee yet.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lifetime Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Present (P)</span>
                <span className="text-lg font-black text-emerald-600 tabular-nums">
                  {dossierData.lifetimeSummary?.present || 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Half-Days (H)</span>
                <span className="text-lg font-black text-amber-500 tabular-nums">
                  {dossierData.lifetimeSummary?.halfDay || 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">1-Hr Perm (1H)</span>
                <span className="text-lg font-black text-cyan-600 tabular-nums">
                  {dossierData.lifetimeSummary?.permission || 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Leaves (L)</span>
                <span className="text-lg font-black text-slate-600 dark:text-slate-300 tabular-nums">
                  {dossierData.lifetimeSummary?.leave || 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Payable Days</span>
                <span className="text-lg font-black text-blue-700 dark:text-blue-300 tabular-nums">
                  {dossierData.lifetimeSummary?.payableDays || 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Advances</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatINR(dossierData.lifetimeSummary?.advances || 0)}
                </span>
              </div>
            </div>

            {/* Year Selector Tabs */}
            {dossierData.yearsList && dossierData.yearsList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {dossierData.yearsList.map((yr: string) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setActiveYear(yr)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          activeYear === yr
                            ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                            : "text-slate-500"
                        }`}
                      >
                        FY {yr}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-slate-400 font-semibold">
                    12-Month Performance Matrix
                  </span>
                </div>

                {/* 12-Month Detailed Grid for Active Year */}
                {dossierData.yearlyData?.[activeYear] && (
                  <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                          <th className="py-2.5 px-3">Month</th>
                          <th className="py-2.5 px-2 text-center">P (1.0)</th>
                          <th className="py-2.5 px-2 text-center">H (0.5)</th>
                          <th className="py-2.5 px-2 text-center">1H (1.0)</th>
                          <th className="py-2.5 px-2 text-center">A (0.0)</th>
                          <th className="py-2.5 px-2 text-center">L (Sun)</th>
                          <th className="py-2.5 px-2 text-center font-black text-blue-600">Net Payable</th>
                          <th className="py-2.5 px-2 text-right">Advances (₹)</th>
                          <th className="py-2.5 px-3">Deployed Site Projects</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dossierData.yearlyData[activeYear].months.map((m: any) => (
                          <tr key={m.monthIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                              {m.monthName} {activeYear}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-emerald-600 tabular-nums">
                              {m.present}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-amber-500 tabular-nums">
                              {m.halfDay}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-cyan-600 tabular-nums">
                              {m.permission}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-rose-500 tabular-nums">
                              {m.absent}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-400 tabular-nums">
                              {m.leave}
                            </td>
                            <td className="py-2.5 px-2 text-center font-black text-blue-600 tabular-nums">
                              {m.payableDays}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-600 tabular-nums">
                              {m.advances > 0 ? `₹${m.advances}` : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[200px]">
                              {m.sites?.join(", ") || (m.present > 0 ? "Office / Base" : "—")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
