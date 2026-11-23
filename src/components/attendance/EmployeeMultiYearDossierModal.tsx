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
  Timer,
  Flame,
  Award,
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
  const [activeTab, setActiveTab] = useState<"SCORECARD" | "MONTHLY" | "OVERTIME" | "PERMISSIONS">("SCORECARD");
  const [downloadPeriod, setDownloadPeriod] = useState<"SELECTED_MONTH" | "FULL_YEAR" | "FISCAL_YEAR">("FULL_YEAR");

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

  const currentYearData = dossierData?.yearlyData?.[activeYear];
  const activeMonthData = currentYearData?.months?.[selectedMonthIndex];
  const isOffice = employee.category === "OFFICE_STAFF";

  // Exact HRIS calendar math for selected activeYear (Standard Roofs 6-Day Work Week Rule)
  const yearNum = parseInt(activeYear, 10);
  const isLeap = (yearNum % 4 === 0 && yearNum % 100 !== 0) || yearNum % 400 === 0;
  const totalDaysInYear = isLeap ? 366 : 365;

  // Exact count of Sundays across all 12 calendar months in the selected year
  let sundaysInYear = 0;
  for (let m = 0; m < 12; m++) {
    const daysInM = new Date(yearNum, m + 1, 0).getDate();
    for (let d = 1; d <= daysInM; d++) {
      if (new Date(yearNum, m, d).getDay() === 0) sundaysInYear++;
    }
  }
  const companyHolidaysCount = 2; // Declared Company Public Holidays (Pongal, Diwali, May Day)
  const totalSundaysAndLeaves = sundaysInYear + companyHolidaysCount; // 52 Sundays + 2 Holidays = 54 Non-Working Days
  const scheduledOrgWorkingDays = totalDaysInYear - totalSundaysAndLeaves; // 365 - 54 = 311 Days (NOT 360!)

  const yearTotals = currentYearData?.totals || {};
  const actualDaysWorked = yearTotals.payableDays || 0;
  const attendancePercentage = Math.min(100, Math.round((actualDaysWorked / scheduledOrgWorkingDays) * 100));

  // Selected Month calculations
  const monthDaysCount = activeMonthData ? new Date(yearNum, selectedMonthIndex + 1, 0).getDate() : 30;
  let monthSundaysCount = 0;
  if (activeMonthData) {
    for (let d = 1; d <= monthDaysCount; d++) {
      if (new Date(yearNum, selectedMonthIndex, d).getDay() === 0) monthSundaysCount++;
    }
  }
  const monthHolidaysCount = selectedMonthIndex === 10 ? 2 : 0; // Nov has 2 holidays
  const monthOrgWorkingDays = monthDaysCount - monthSundaysCount - monthHolidaysCount;
  const monthDaysWorked = activeMonthData?.payableDays || 0;
  const monthAttendancePercentage = monthOrgWorkingDays > 0 ? Math.min(100, Math.round((monthDaysWorked / monthOrgWorkingDays) * 100)) : 0;

  const handleExportExcel = (mode: "FULL_YEAR" | "SELECTED_MONTH" | "FISCAL_YEAR") => {
    if (!dossierData || !employee) return;
    const yearData = dossierData.yearlyData?.[activeYear];
    if (!yearData) return;

    if (isContractorTeam) {
      const exportRows = yearData.months.map((m: any) => ({
        Year: activeYear,
        Month: m.monthName,
        "Total Labours (Headcount)": m.headcount,
        "Active Work Days": m.logsCount,
        "OT Hours": m.otHours || 0,
        "Sites Deployed": m.sites?.join(", ") || "-",
      }));
      exportToExcel(
        exportRows,
        `${employee.name}_Contractor_Dossier_${activeYear}`,
        "ContractorDossier"
      );
      return;
    }

    if (mode === "SELECTED_MONTH" && activeMonthData) {
      const exportRows: any[] = [
        {
          "Section / Record": "--- MONTHLY SCORECARD ---",
          Date: `${activeMonthData.monthName} ${activeYear}`,
          Status: "SUMMARY",
          "In / Out Time": "-",
          "Location / Deployed Site": activeMonthData.sites?.join(", ") || (isOffice ? "Headquarters" : "-"),
          "1H Permission": `${activeMonthData.permission || 0} (${activeMonthData.permissionMorning || 0}M / ${activeMonthData.permissionEvening || 0}E)`,
          "OT Hours": activeMonthData.otHours || 0,
          "Remarks / Notes": `Net Payable: ${activeMonthData.payableDays} Days | Scheduled Days: ${monthOrgWorkingDays} | Efficiency: ${monthAttendancePercentage}%`,
        },
        ...((activeMonthData.dailyRecords || []).map((r: any) => ({
          "Section / Record": "Daily Attendance Log",
          Date: r.date,
          Status: r.status,
          "In / Out Time": `${r.inTime || "09:00 AM"} - ${r.outTime || "07:00 PM"}`,
          "Location / Deployed Site": r.siteName || (isOffice ? "Headquarters Office" : "-"),
          "1H Permission": r.permissionNote ? `${r.permissionSlot || "1H"}: ${r.permissionNote}` : "-",
          "OT Hours": r.otHours ? `+${r.otHours}h (${r.otTimeRange || ""})` : 0,
          "Remarks / Notes": r.otReason || r.workNotes || "-",
        }))),
      ];

      exportToExcel(
        exportRows,
        `${employee.employeeCode}_${employee.name}_${activeMonthData.monthName}_${activeYear}`,
        "MonthAttendance"
      );
      return;
    }

    // Comprehensive 3-Section Annual or Fiscal Year Report
    const exportRows: any[] = [];

    // SECTION 1: ANNUAL SCORECARD
    exportRows.push({
      "Report Type": "SECTION 1: ANNUAL HRIS SCORECARD",
      "Field / Month": "Total Calendar Days",
      "Metric / Value": totalDaysInYear,
      "Payable / Status": "-",
      "Overtime / Hours": "-",
      Details: `${activeYear} Calendar Days`,
    });
    exportRows.push({
      "Report Type": "SECTION 1: ANNUAL HRIS SCORECARD",
      "Field / Month": "Sundays & Company Holidays",
      "Metric / Value": totalSundaysAndLeaves,
      "Payable / Status": "-",
      "Overtime / Hours": "-",
      Details: `${sundaysInYear} Sundays + ${companyHolidaysCount} Declared Public Holidays`,
    });
    exportRows.push({
      "Report Type": "SECTION 1: ANNUAL HRIS SCORECARD",
      "Field / Month": "Org Scheduled Working Days",
      "Metric / Value": scheduledOrgWorkingDays,
      "Payable / Status": "-",
      "Overtime / Hours": "-",
      Details: `365 - 54 = 311 Days Official Work Calendar`,
    });
    exportRows.push({
      "Report Type": "SECTION 1: ANNUAL HRIS SCORECARD",
      "Field / Month": "Net Days Worked (Net Payable)",
      "Metric / Value": actualDaysWorked,
      "Payable / Status": "-",
      "Overtime / Hours": "-",
      Details: `P(1.0) + 1H(1.0) + H(0.5) + PL(1.0)`,
    });
    exportRows.push({
      "Report Type": "SECTION 1: ANNUAL HRIS SCORECARD",
      "Field / Month": "Annual Attendance Efficiency",
      "Metric / Value": `${attendancePercentage}%`,
      "Payable / Status": "-",
      "Overtime / Hours": "-",
      Details: `Days Worked / Org Working Days (${actualDaysWorked}/${scheduledOrgWorkingDays})`,
    });
    exportRows.push({
      "Report Type": "SECTION 1: ANNUAL HRIS SCORECARD",
      "Field / Month": "Total Overtime Hours",
      "Metric / Value": `${yearTotals.otHours || 0}h`,
      "Payable / Status": "-",
      "Overtime / Hours": "-",
      Details: `Cumulative OT Hours across all 12 months`,
    });
    exportRows.push({
      "Report Type": "SECTION 1: ANNUAL HRIS SCORECARD",
      "Field / Month": "1-Hour Permissions",
      "Metric / Value": `${yearTotals.permission || 0} (${yearTotals.permissionMorning || 0}M / ${yearTotals.permissionEvening || 0}E)`,
      "Payable / Status": "-",
      "Overtime / Hours": "-",
      Details: `Morning (9-10 AM) / Evening (6:30-7:30 PM) Permissions`,
    });

    // Divider
    exportRows.push({ "Report Type": "---", "Field / Month": "---", "Metric / Value": "---", "Payable / Status": "---", "Overtime / Hours": "---", Details: "---" });

    // SECTION 2: 12-MONTH MATRIX BREAKDOWN
    yearData.months.forEach((m: any) => {
      exportRows.push({
        "Report Type": "SECTION 2: 12-MONTH MATRIX",
        "Field / Month": `${m.monthName} ${activeYear}`,
        "Metric / Value": `P:${m.present} | 1H:${m.permission} | H:${m.halfDay} | PL:${m.paidLeave || 0} | UP:${m.unpaidLeave || 0} | A:${m.absent} | L:${m.leave}`,
        "Payable / Status": `Payable: ${m.payableDays} Days`,
        "Overtime / Hours": `${m.otHours || 0}h`,
        Details: `Sites: ${m.sites?.join(", ") || "-"}`,
      });
    });

    // Divider
    exportRows.push({ "Report Type": "---", "Field / Month": "---", "Metric / Value": "---", "Payable / Status": "---", "Overtime / Hours": "---", Details: "---" });

    // SECTION 3: ALL LOGGED DAILY RECORDS
    yearData.months.forEach((m: any) => {
      (m.dailyRecords || []).forEach((r: any) => {
        exportRows.push({
          "Report Type": "SECTION 3: DAILY LOG",
          "Field / Month": r.date,
          "Metric / Value": `Status: ${r.status}`,
          "Payable / Status": `Timing: ${r.inTime || "09:00 AM"} - ${r.outTime || "07:00 PM"}`,
          "Overtime / Hours": r.otHours ? `+${r.otHours}h (${r.otTimeRange || ""})` : "0h",
          Details: `${r.siteName ? `Site: ${r.siteName} | ` : ""}${r.permissionNote ? `1H: ${r.permissionNote} | ` : ""}${r.otReason ? `OT: ${r.otReason} | ` : ""}${r.workNotes || ""}`,
        });
      });
    });

    const filePrefix = mode === "FISCAL_YEAR" ? `FY_${activeYear}_${Number(activeYear) + 1}` : `Annual_${activeYear}`;
    exportToExcel(
      exportRows,
      `${employee.employeeCode}_${employee.name}_Dossier_${filePrefix}`,
      "HRISAttendanceDossier"
    );
  };

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
                  HRIS Attendance Dossier
                </span>
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <Briefcase size={12} />
                <span>{employee.designation || employee.role || (isContractorTeam ? "Contractor Team" : "Workforce")}</span>
                <span>•</span>
                <span className="capitalize">{employee.category.replace(/_/g, " ").toLowerCase()}</span>
                <span>•</span>
                <span className="text-slate-400">Tenure Attendance Record (Pure HRIS)</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Selector */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDownloadPeriod("SELECTED_MONTH")}
                className={`px-2 py-1 rounded-lg transition cursor-pointer text-[10px] ${
                  downloadPeriod === "SELECTED_MONTH"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs font-extrabold"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Month ({activeMonthData?.monthName || "Nov"})
              </button>
              <button
                type="button"
                onClick={() => setDownloadPeriod("FULL_YEAR")}
                className={`px-2 py-1 rounded-lg transition cursor-pointer text-[10px] ${
                  downloadPeriod === "FULL_YEAR"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs font-extrabold"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Full Year ({activeYear})
              </button>
              <button
                type="button"
                onClick={() => setDownloadPeriod("FISCAL_YEAR")}
                className={`px-2 py-1 rounded-lg transition cursor-pointer text-[10px] ${
                  downloadPeriod === "FISCAL_YEAR"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs font-extrabold"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                FY (Apr–Mar)
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleExportExcel(downloadPeriod)}
              disabled={!dossierData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition disabled:opacity-50 cursor-pointer shadow-xs"
              title="Download structured Excel (.xlsx) with Scorecard, 12-Month Matrix & Daily Log"
            >
              <Download size={13} className="text-emerald-600" />
              <span>Export (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 font-bold text-xs transition cursor-pointer shadow-xs"
              title="Print standard A4 Attendance Dossier"
            >
              <Printer size={13} className="text-blue-600" />
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
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {/* Top Navigation & Year Switcher Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              {/* Year Switcher */}
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

              {/* View Tabs */}
              <div className="flex items-center p-0.5 bg-slate-200/60 dark:bg-slate-800 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab("SCORECARD")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    activeTab === "SCORECARD" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Year Scorecard
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("MONTHLY")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    activeTab === "MONTHLY" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  12-Month Matrix
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("OVERTIME")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    activeTab === "OVERTIME" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Overtime Log ({dossierData.overtimeLog?.length || 0})
                </button>
                {!isContractorTeam && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("PERMISSIONS")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      activeTab === "PERMISSIONS" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    1-Hr Permissions ({dossierData.permissionsLog?.length || 0})
                  </button>
                )}
              </div>
            </div>

            {/* TAB 1: ANNUAL & FISCAL SCORECARD */}
            {activeTab === "SCORECARD" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Days</span>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                      {totalDaysInYear}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Calendar Days</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Sundays & Off</span>
                    <span className="text-xl font-black text-slate-700 dark:text-slate-300 tabular-nums">
                      {totalSundaysAndLeaves}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{sundaysInYear} Sun + {companyHolidaysCount} Hol</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">Org Working Days</span>
                    <span className="text-xl font-black text-blue-600 tabular-nums">
                      {scheduledOrgWorkingDays}
                    </span>
                    <span className="text-[10px] text-blue-500 block mt-0.5 font-bold">365 − 54 Non-Working</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Days Worked</span>
                    <span className="text-xl font-black text-emerald-600 tabular-nums">
                      {actualDaysWorked}
                    </span>
                    <span className="text-[10px] text-emerald-500 block mt-0.5">Net Payable</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 block">Attendance %</span>
                    <span className="text-xl font-black text-indigo-600 tabular-nums">
                      {attendancePercentage}%
                    </span>
                    <span className="text-[10px] text-indigo-400 block mt-0.5">Annual Efficiency</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block">Total OT</span>
                    <span className="text-xl font-black text-amber-600 tabular-nums">
                      {yearTotals.otHours || 0}h
                    </span>
                    <span className="text-[10px] text-amber-500 block mt-0.5">Overtime Hours</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-300 block">1H Permissions</span>
                    <span className="text-xl font-black text-sky-600 tabular-nums">
                      {yearTotals.permission || 0}
                    </span>
                    <span className="text-[10px] text-sky-500 block mt-0.5">
                      {yearTotals.permissionMorning || 0}M · {yearTotals.permissionEvening || 0}E
                    </span>
                  </div>
                </div>

                {/* Lifetime Summary Tenure KPIs */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Tenure Summary Across All Years
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">Total Present (P)</span>
                      <strong className="text-base text-emerald-600 font-black">{dossierData.lifetimeSummary?.present || 0}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">Half-Days (H)</span>
                      <strong className="text-base text-amber-500 font-black">{dossierData.lifetimeSummary?.halfDay || 0}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">1-Hr Perm (1H)</span>
                      <strong className="text-base text-sky-600 font-black">{dossierData.lifetimeSummary?.permission || 0}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">Total OT Hours</span>
                      <strong className="text-base text-amber-600 font-black">{dossierData.lifetimeSummary?.otHours || 0}h</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">Total Absent (A)</span>
                      <strong className="text-base text-rose-500 font-black">{dossierData.lifetimeSummary?.absent || 0}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">Net Payable Days</span>
                      <strong className="text-base text-blue-600 font-black">{dossierData.lifetimeSummary?.payableDays || 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 12-MONTH MATRIX & DAILY RECORD INSPECTOR */}
            {activeTab === "MONTHLY" && (
              <div className="space-y-4">
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
                        <th className="py-2.5 px-2 text-center text-amber-600">OT (HRS)</th>
                        <th className="py-2.5 px-2 text-center text-slate-600">L (Sun)</th>
                        <th className="py-2.5 px-2 text-center font-black bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          Net Payable
                        </th>
                        <th className="py-2.5 px-3">Sites Deployed</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
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
                            <td className="py-2 px-2 text-center font-bold text-sky-600 tabular-nums">
                              {m.permission}
                              {m.permission > 0 && (
                                <span className="text-[9px] text-slate-400 block font-normal">
                                  {m.permissionMorning || 0}M / {m.permissionEvening || 0}E
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-amber-500 tabular-nums">{m.halfDay}</td>
                            <td className="py-2 px-2 text-center font-bold text-teal-600 tabular-nums">{m.paidLeave || 0}</td>
                            <td className="py-2 px-2 text-center font-bold text-slate-500 tabular-nums">{m.unpaidLeave || 0}</td>
                            <td className="py-2 px-2 text-center font-bold text-rose-500 tabular-nums">{m.absent}</td>
                            <td className="py-2 px-2 text-center font-bold text-amber-600 tabular-nums">{m.otHours || 0}h</td>
                            <td className="py-2 px-2 text-center font-bold text-slate-400 tabular-nums">{m.leave}</td>
                            <td className="py-2 px-2 text-center font-black text-blue-700 dark:text-blue-300 tabular-nums bg-blue-50/50 dark:bg-blue-950/30">
                              {m.payableDays}
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
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

                {/* Daily Records Inspector for Selected Month */}
                {activeMonthData && (
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Daily Attendance Inspector • {activeMonthData.monthName} {activeYear} ({activeMonthData.dailyRecords?.length || 0} Entries)
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleExportExcel("SELECTED_MONTH")}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Download size={12} />
                        Export {activeMonthData.monthName} (.xlsx)
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold text-[10px] uppercase sticky top-0">
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3 text-center">Status</th>
                            <th className="py-2 px-3 text-center">In / Out Time</th>
                            <th className="py-2 px-3 text-center">Overtime</th>
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
                            activeMonthData.dailyRecords?.map((rec: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
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
                                    {rec.status === "1H" ? (rec.permissionSlot === "EVENING" ? "1H·E" : "1H·M") : rec.status}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center font-mono text-slate-500">
                                  {rec.inTime && rec.outTime ? `${rec.inTime} - ${rec.outTime}` : rec.inTime || rec.outTime || "—"}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {rec.otHours && rec.otHours > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                                      +{rec.otHours}h {rec.otTimeRange ? `(${rec.otTimeRange})` : ""}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                  {rec.siteName || (isOffice ? "Headquarters Office" : "—")}
                                </td>
                                <td className="py-2 px-3 text-slate-500 italic max-w-[280px] truncate">
                                  {rec.permissionNote || rec.workNotes || rec.otReason || "—"}
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

            {/* TAB 3: DEDICATED OVERTIME (OT) LOG */}
            {activeTab === "OVERTIME" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Flame className="text-amber-500" size={16} />
                    <span>Overtime (OT) Audit Log • Lifetime Total: {dossierData.lifetimeSummary?.otHours || 0} Hours</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-bold">
                    {dossierData.overtimeLog?.length || 0} OT Sessions Logged
                  </span>
                </div>

                {(!dossierData.overtimeLog || dossierData.overtimeLog.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                    No overtime hours logged for this personnel yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-center">OT Hours</th>
                          <th className="py-2.5 px-3">Time Range</th>
                          <th className="py-2.5 px-3">Reason / Justification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dossierData.overtimeLog.map((ot: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {ot.date}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold text-xs">
                                +{ot.otHours} Hours
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                              {ot.otTimeRange || "Standard Extended Shift"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 italic">
                              {ot.otReason || "Urgent site work / fabrication"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: 1-HOUR PERMISSION AUDIT LOG (MORNING VS. EVENING) */}
            {activeTab === "PERMISSIONS" && !isContractorTeam && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Timer className="text-cyan-600" size={16} />
                    <span>1-Hour Permission History ({dossierData.permissionsLog?.length || 0} Total Permissions)</span>
                  </h4>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 font-bold">
                      Morning: {dossierData.lifetimeSummary?.permissionMorning || 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-100 text-cyan-800 font-bold">
                      Evening: {dossierData.lifetimeSummary?.permissionEvening || 0}
                    </span>
                  </div>
                </div>

                {(!dossierData.permissionsLog || dossierData.permissionsLog.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                    No 1-hour permission slips logged for this personnel.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {dossierData.permissionsLog.map((p: any, i: number) => {
                      const isEve = p.slot === "EVENING";
                      return (
                        <div key={i} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                            <span className="font-mono">{p.date}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                isEve ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300" : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                              }`}
                            >
                              {isEve ? "Evening 1H·E" : "Morning 1H·M"}
                            </span>
                          </div>
                          {p.time && (
                            <p className="text-[11px] font-mono text-slate-400">
                              Time: {p.time}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                            "{p.note || "Official 1-Hour Permission"}"
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 print:hidden">
          <span className="text-xs text-slate-400">
            Attendance verification record • Standard Roofs Books HRIS (Workspace 3)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* PRINTABLE A4 DOSSIER LAYOUT (Visible only during window.print()) */}
        <div className="hidden print:block p-4 space-y-4 text-black bg-white">
          <div className="border-b-2 border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">STANDARD ROOFS BOOKS</h1>
                <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                  Official Workforce Attendance & HRIS Dossier
                </h2>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <p className="font-bold">Period: {downloadPeriod === "SELECTED_MONTH" ? `${activeMonthData?.monthName} ${activeYear}` : downloadPeriod === "FISCAL_YEAR" ? `FY ${activeYear}-${Number(activeYear) + 1}` : `Annual Jan–Dec ${activeYear}`}</p>
                <p>Printed: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-3 p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-xs">
              <div><span className="text-[9px] font-bold text-slate-500 uppercase block">Name</span><strong>{employee.name}</strong></div>
              <div><span className="text-[9px] font-bold text-slate-500 uppercase block">Code</span><strong className="font-mono">{employee.employeeCode}</strong></div>
              <div><span className="text-[9px] font-bold text-slate-500 uppercase block">Role</span><strong>{employee.designation || employee.role || "Workforce"}</strong></div>
              <div><span className="text-[9px] font-bold text-slate-500 uppercase block">Unit</span><strong>{employee.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs"}</strong></div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              1. Attendance Scorecard Summary ({activeYear})
            </h3>
            <table className="w-full text-xs border-collapse border border-slate-400 text-center">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-slate-400 p-1.5">Calendar Days</th>
                  <th className="border border-slate-400 p-1.5">Sundays & Off</th>
                  <th className="border border-slate-400 p-1.5">Org Working Days</th>
                  <th className="border border-slate-400 p-1.5">Days Worked</th>
                  <th className="border border-slate-400 p-1.5">Efficiency %</th>
                  <th className="border border-slate-400 p-1.5">Total OT</th>
                  <th className="border border-slate-400 p-1.5">1H Permissions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-mono font-bold">
                  <td className="border border-slate-400 p-1.5">{totalDaysInYear}</td>
                  <td className="border border-slate-400 p-1.5">{totalSundaysAndLeaves}</td>
                  <td className="border border-slate-400 p-1.5 text-blue-800">{scheduledOrgWorkingDays}</td>
                  <td className="border border-slate-400 p-1.5 text-emerald-800">{actualDaysWorked}</td>
                  <td className="border border-slate-400 p-1.5">{attendancePercentage}%</td>
                  <td className="border border-slate-400 p-1.5">{yearTotals.otHours || 0}h</td>
                  <td className="border border-slate-400 p-1.5">{yearTotals.permission || 0} ({yearTotals.permissionMorning || 0}M/{yearTotals.permissionEvening || 0}E)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              2. 12-Month Attendance Breakdown ({activeYear})
            </h3>
            <table className="w-full text-[10px] border-collapse border border-slate-400 text-center">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-slate-400 p-1 text-left">Month</th>
                  <th className="border border-slate-400 p-1">P (1.0)</th>
                  <th className="border border-slate-400 p-1">1H (1.0)</th>
                  <th className="border border-slate-400 p-1">H (0.5)</th>
                  <th className="border border-slate-400 p-1">PL (1.0)</th>
                  <th className="border border-slate-400 p-1">UP (0.0)</th>
                  <th className="border border-slate-400 p-1">A (0.0)</th>
                  <th className="border border-slate-400 p-1">OT (Hrs)</th>
                  <th className="border border-slate-400 p-1">L (Sun)</th>
                  <th className="border border-slate-400 p-1 font-black">Net Payable</th>
                </tr>
              </thead>
              <tbody>
                {currentYearData?.months?.map((m: any) => (
                  <tr key={m.monthName} className="font-mono">
                    <td className="border border-slate-400 p-1 text-left font-sans font-bold">{m.monthName}</td>
                    <td className="border border-slate-400 p-1">{m.present}</td>
                    <td className="border border-slate-400 p-1">{m.permission}</td>
                    <td className="border border-slate-400 p-1">{m.halfDay}</td>
                    <td className="border border-slate-400 p-1">{m.paidLeave || 0}</td>
                    <td className="border border-slate-400 p-1">{m.unpaidLeave || 0}</td>
                    <td className="border border-slate-400 p-1">{m.absent}</td>
                    <td className="border border-slate-400 p-1">{m.otHours || 0}h</td>
                    <td className="border border-slate-400 p-1">{m.leave}</td>
                    <td className="border border-slate-400 p-1 font-bold">{m.payableDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
            <span>HR & Accounts Department • Standard Roofs Books</span>
            <span>Authorized Signatory: _________________________</span>
          </div>
        </div>
      </div>
    </div>
  );
}
