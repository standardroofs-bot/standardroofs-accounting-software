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
} from "lucide-react";
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
  companyUnit?: string | null;
  dailyWage?: number | null;
  monthlySalary?: number | null;
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
      "Daily Advances (₹)": m.advances,
      "Deployed Sites": m.sites?.join(", ") || "-",
    }));

    exportToExcel(
      exportRows,
      `${employee.employeeCode}_${employee.name}_Attendance_Dossier_${activeYear}`,
      "MultiYearDossier"
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const currentYearData = dossierData?.yearlyData?.[activeYear];
  const activeMonthData = currentYearData?.months?.[selectedMonthIndex];
  const isOffice = employee.category === "OFFICE_STAFF";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full p-6 space-y-5 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                isOffice
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : isContractorTeam
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
              }`}
            >
              {employee.employeeCode.slice(-3)}
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
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <Briefcase size={12} />
                <span>{employee.designation || employee.role || "Workforce"}</span>
                <span>•</span>
                <span className="capitalize">{employee.category.replace(/_/g, " ").toLowerCase()}</span>
                {employee.dailyWage ? (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      ₹{employee.dailyWage}/day
                    </span>
                  </>
                ) : employee.monthlySalary ? (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      ₹{employee.monthlySalary.toLocaleString("en-IN")}/mo
                    </span>
                  </>
                ) : null}
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
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <Printer size={13} />
              <span>Print A4</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={20} />
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
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {/* Lifetime Summary Tenure KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Present (P)</span>
                <span className="text-lg font-black text-emerald-600 tabular-nums">
                  {dossierData.lifetimeSummary?.present || 0}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-center">
                <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-400 block">1H Perm</span>
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

              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Unpaid (UP)</span>
                <span className="text-lg font-black text-slate-600 dark:text-slate-300 tabular-nums">
                  {dossierData.lifetimeSummary?.unpaidLeave || 0}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center">
                <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">Absent (A)</span>
                <span className="text-lg font-black text-rose-600 tabular-nums">
                  {dossierData.lifetimeSummary?.absent || 0}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sunday (L)</span>
                <span className="text-lg font-black text-slate-600 dark:text-slate-300 tabular-nums">
                  {dossierData.lifetimeSummary?.leave || 0}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-700 text-center">
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">Payable Days</span>
                <span className="text-lg font-black text-blue-700 dark:text-blue-300 tabular-nums">
                  {dossierData.lifetimeSummary?.payableDays || 0}
                </span>
              </div>
            </div>

            {/* Multi-Year Switcher (2025 - 2030) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Year:</span>
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

            {/* 12-Month Table Breakdown for Selected Year */}
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
                    <th className="py-2.5 px-3 text-right">Daily Advances</th>
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
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {m.advances > 0 ? formatINR(m.advances) : "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-[180px]">
                          {m.sites && m.sites.length > 0 ? m.sites.join(", ") : "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isSelectedMonth
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {isSelectedMonth ? "Active" : "View"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 1-Hr Permission Audit Trail Log */}
            {dossierData.permissionsLog && dossierData.permissionsLog.length > 0 && (
              <div className="bg-sky-50/50 dark:bg-sky-950/30 rounded-2xl border border-sky-200 dark:border-sky-800 p-4 space-y-2">
                <h4 className="font-extrabold text-xs text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                  <Clock size={14} className="text-sky-600" />
                  <span>1-Hour Permission Records & Audit Notes ({dossierData.permissionsLog.length} Instances)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {dossierData.permissionsLog.map((p: any, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-sky-900 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-sky-700 dark:text-sky-300">
                        <span>{p.date}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950 rounded">1.0 Day Paid</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 italic">{p.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Log Inspector for Selected Month */}
            {activeMonthData && activeMonthData.dailyRecords && activeMonthData.dailyRecords.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar size={14} className="text-blue-600" />
                  <span>Daily Date-by-Date Log Inspector — {activeMonthData.monthName} {activeYear}</span>
                </h4>
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px] sticky top-0">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        {isOffice && <th className="py-2 px-3 text-center">In Time</th>}
                        {isOffice && <th className="py-2 px-3 text-center">Out Time</th>}
                        {!isOffice && <th className="py-2 px-3">Site Location</th>}
                        {!isOffice && <th className="py-2 px-3 text-right">Advance (₹)</th>}
                        <th className="py-2 px-3">Notes / Permission Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeMonthData.dailyRecords.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{r.date}</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                r.status === "P"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : r.status === "1H"
                                  ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                                  : r.status === "H"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : r.status === "PL"
                                  ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                                  : r.status === "UP"
                                  ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                  : r.status === "A"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {r.status === "1H" ? "P·1H" : r.status}
                            </span>
                          </td>
                          {isOffice && <td className="py-2 px-3 text-center text-slate-600">{r.inTime || "—"}</td>}
                          {isOffice && <td className="py-2 px-3 text-center text-slate-600">{r.outTime || "—"}</td>}
                          {!isOffice && <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{r.siteName || "—"}</td>}
                          {!isOffice && (
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                              {r.dailyAdvance > 0 ? `₹${r.dailyAdvance}` : "—"}
                            </td>
                          )}
                          <td className="py-2 px-3 text-slate-500 text-[11px]">{r.permissionNote || r.workNotes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
