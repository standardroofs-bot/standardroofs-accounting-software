"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Clock,
  Users2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Building,
  Briefcase,
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  Copy,
  Sparkles,
  HardHat,
  Truck,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Check,
  X,
  FileText,
  DollarSign,
  UserCheck,
  Building2,
  ExternalLink,
  Award,
  Palmtree,
  CalendarOff,
  History,
  Timer,
  Info,
} from "lucide-react";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import ExcelImportModal from "@/components/common/ExcelImportModal";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { formatINR } from "@/lib/decimal";

interface AttendanceRecordItem {
  id: string;
  employeeId: string;
  date: string;
  status: "P" | "H" | "1H" | "A" | "L";
  inTime?: string | null;
  outTime?: string | null;
  siteName?: string | null;
  dailyAdvance?: number;
  permissionNote?: string | null;
  permissionHours?: number | null;
  workNotes?: string | null;
}

interface EmployeeItem {
  id: string;
  employeeCode: string;
  empCode?: string | null;
  name: string;
  fatherName?: string | null;
  phone?: string | null;
  designation?: string | null;
  role?: string | null;
  category: "OFFICE_STAFF" | "TAMIL_LABOUR" | "HINDI_LABOUR" | "CONTRACTOR_TEAM";
  companyUnit: "STANDARD_ROOFS" | "INVI_CREATION";
  dailyWage?: number | null;
  monthlySalary?: number | null;
  dateOfJoining?: string | null;
  attendances: AttendanceRecordItem[];
}

interface ContractorLogItem {
  id: string;
  contractorTeamName: string;
  contractorId?: string | null;
  date: string;
  siteName?: string | null;
  headcount: number;
  workerBreakdown?: string | null;
  siteWorkStatus?: string | null;
  remarks?: string | null;
}

interface HolidayItem {
  id: string;
  date: string;
  name: string;
  year: number;
  description?: string | null;
}

const COMMON_SITES = [
  "SSM School",
  "Kalloviyam Gokul",
  "Arunprasad Uthukuli",
  "Venkatesh Salem",
  "Ananthi Thindal",
  "Ravichandran Chennai",
  "Office Maintenance",
  "Yard Unloading",
  "SIPCOT Heavy PEB Shed",
  "Namakkal Cold Storage",
  "Tirupur Spinning Mill",
];

const YEARS = [2024, 2025, 2026, 2027, 2028];
const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<"office" | "tamil" | "hindi" | "contractor">("office");
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");

  // Multi-Year & Multi-Month persistent navigation
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthNum, setSelectedMonthNum] = useState<string>("11");
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-20");

  const selectedMonth = `${selectedYear}-${selectedMonthNum}`;

  // Data state
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [contractorLogs, setContractorLogs] = useState<ContractorLogItem[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [companyUnitFilter, setCompanyUnitFilter] = useState<"ALL" | "STANDARD_ROOFS" | "INVI_CREATION">("ALL");

  // Modals & Popovers
  const [showImportModal, setShowImportModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: "", name: "", markStaff: true });
  
  // Lifetime Multi-Year Dossier Modal
  const [selectedDossierEmployee, setSelectedDossierEmployee] = useState<EmployeeItem | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState<any>(null);
  const [dossierActiveYear, setDossierActiveYear] = useState<string>("2026");

  // Cell Edit Popover Modal (for Monthly Matrix)
  const [cellEditTarget, setCellEditTarget] = useState<{
    employee: EmployeeItem;
    date: string;
    dayNum: number;
    currentStatus: "P" | "H" | "1H" | "A" | "L" | null;
    currentSite?: string | null;
    currentNote?: string | null;
  } | null>(null);
  const [permissionInput, setPermissionInput] = useState("");
  const [siteInput, setSiteInput] = useState("");

  // Quick 1H permission prompt in Daily View
  const [permPromptTarget, setPermPromptTarget] = useState<{
    employeeId: string;
    siteName?: string;
  } | null>(null);

  // Optimistic draft attendance updates
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, Partial<AttendanceRecordItem>>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Contractor Form state
  const [contractorForm, setContractorForm] = useState({
    id: "",
    contractorTeamName: "Nandeeshwaran Team",
    date: selectedDate,
    siteName: "Ravichandran Chennai",
    headcount: 4,
    workerBreakdown: "",
    siteWorkStatus: "Fabrication Work",
    remarks: "",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch Attendance & Roster
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance?date=${selectedDate}&month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees || []);
        setContractorLogs(data.contractorLogs || []);
        setHolidays(data.holidays || []);
        setKpis(data.kpis || {});
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth, selectedDate]);

  // Sync selectedDate when month or year changes
  const handleYearMonthChange = (newYear: number, newMonthNum: string) => {
    setSelectedYear(newYear);
    setSelectedMonthNum(newMonthNum);
    const dayPart = selectedDate.split("-")[2] || "01";
    const maxDays = new Date(newYear, parseInt(newMonthNum, 10), 0).getDate();
    const safeDay = Math.min(parseInt(dayPart, 10), maxDays).toString().padStart(2, "0");
    setSelectedDate(`${newYear}-${newMonthNum}-${safeDay}`);
  };

  // Pre-calculated Month Grid Days
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(selectedYear, parseInt(selectedMonthNum, 10), 0).getDate();
    const days = [];
    const holidayDates = new Set(holidays.map((h) => h.date.split("T")[0]));

    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day).padStart(2, "0");
      const fullDate = `${selectedYear}-${selectedMonthNum}-${dayStr}`;
      const dateObj = new Date(Date.UTC(selectedYear, parseInt(selectedMonthNum, 10) - 1, day));
      const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
      const isSunday = dayOfWeek === 0;
      const isHoliday = holidayDates.has(fullDate);

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      days.push({
        dayNum: day,
        fullDate,
        dayName: dayNames[dayOfWeek],
        isSunday,
        isHoliday,
        isWorkingDay: !isSunday && !isHoliday,
      });
    }
    return days;
  }, [selectedYear, selectedMonthNum, holidays]);

  const totalWorkingDaysInMonth = useMemo(() => {
    return daysInMonth.filter((d) => d.isWorkingDay).length;
  }, [daysInMonth]);

  // Filtered employees for current tab
  const tabEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (activeTab === "office" && emp.category !== "OFFICE_STAFF") return false;
      if (activeTab === "tamil" && emp.category !== "TAMIL_LABOUR") return false;
      if (activeTab === "hindi" && emp.category !== "HINDI_LABOUR") return false;

      if (activeTab === "office" && companyUnitFilter !== "ALL" && emp.companyUnit !== companyUnitFilter) {
        return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(q);
        const matchesCode = emp.employeeCode.toLowerCase().includes(q);
        const matchesEmpCode = emp.empCode?.toLowerCase().includes(q);
        const matchesRole = (emp.designation || emp.role || "").toLowerCase().includes(q);
        return matchesName || matchesCode || matchesEmpCode || matchesRole;
      }
      return true;
    });
  }, [employees, activeTab, companyUnitFilter, searchQuery]);

  // Mark status helper with Optimistic UI
  const handleMarkStatus = async (
    employeeId: string,
    status: "P" | "H" | "1H" | "A" | "L",
    siteName?: string,
    dateOverride?: string,
    permissionNote?: string
  ) => {
    const markDate = dateOverride || selectedDate;
    const draftKey = `${employeeId}_${markDate}`;

    // Optimistic local state update
    setAttendanceDrafts((prev) => ({
      ...prev,
      [draftKey]: {
        ...prev[draftKey],
        status,
        siteName,
        permissionNote: status === "1H" ? permissionNote || "1-Hour Permission" : undefined,
        permissionHours: status === "1H" ? 1.0 : undefined,
      },
    }));

    // Update parent employees array in memory immediately
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const exists = emp.attendances.some((a) => a.date.split("T")[0] === markDate);
        let nextAttendances;
        if (exists) {
          nextAttendances = emp.attendances.map((a) =>
            a.date.split("T")[0] === markDate
              ? {
                  ...a,
                  status,
                  siteName: siteName || a.siteName,
                  permissionNote: status === "1H" ? permissionNote || "1-Hour Permission" : a.permissionNote,
                }
              : a
          );
        } else {
          nextAttendances = [
            ...emp.attendances,
            {
              id: `draft_${Date.now()}`,
              employeeId: emp.id,
              date: markDate,
              status,
              siteName: siteName || (emp.category === "OFFICE_STAFF" ? "Headquarters Office" : "SSM School"),
              dailyAdvance: 0,
              permissionNote: status === "1H" ? permissionNote || "1-Hour Permission" : null,
              permissionHours: status === "1H" ? 1.0 : null,
            },
          ];
        }
        return { ...emp, attendances: nextAttendances };
      })
    );

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          record: {
            employeeId,
            date: markDate,
            status,
            siteName: siteName || undefined,
            permissionNote: status === "1H" ? permissionNote || "1-Hour Permission" : undefined,
            permissionHours: status === "1H" ? 1.0 : undefined,
            inTime: activeTab === "office" ? "09:00 AM" : undefined,
            outTime: activeTab === "office" ? "07:00 PM" : undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Marked [${status}] for ${employees.find((e) => e.id === employeeId)?.name || "Worker"} (${markDate})`
        );
      }
    } catch (err) {
      console.error("Failed to mark attendance:", err);
    }
  };

  // Change site location
  const handleSiteChange = (employeeId: string, siteName: string) => {
    const draftKey = `${employeeId}_${selectedDate}`;
    setAttendanceDrafts((prev) => ({
      ...prev,
      [draftKey]: { ...prev[draftKey], siteName },
    }));

    handleMarkStatus(
      employeeId,
      (attendanceDrafts[draftKey]?.status as any) || "P",
      siteName
    );
  };

  // Change daily advance
  const handleAdvanceChange = async (employeeId: string, dailyAdvance: number) => {
    const draftKey = `${employeeId}_${selectedDate}`;
    setAttendanceDrafts((prev) => ({
      ...prev,
      [draftKey]: { ...prev[draftKey], dailyAdvance },
    }));

    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          record: {
            employeeId,
            date: selectedDate,
            status: attendanceDrafts[draftKey]?.status || "P",
            dailyAdvance,
          },
        }),
      });
      showToast(`Saved advance ₹${dailyAdvance}`);
    } catch (err) {
      console.error("Failed to save advance:", err);
    }
  };

  // Change In / Out Times for Office
  const handleTimeChange = async (employeeId: string, field: "inTime" | "outTime", val: string) => {
    const draftKey = `${employeeId}_${selectedDate}`;
    setAttendanceDrafts((prev) => ({
      ...prev,
      [draftKey]: { ...prev[draftKey], [field]: val },
    }));

    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          record: {
            employeeId,
            date: selectedDate,
            status: attendanceDrafts[draftKey]?.status || "P",
            [field]: val,
          },
        }),
      });
    } catch (err) {
      console.error("Failed to save biometric time:", err);
    }
  };

  // 1-Click "Mark All Present"
  const handleMarkAllPresent = async () => {
    const categoryKey =
      activeTab === "office" ? "OFFICE_STAFF" : activeTab === "hindi" ? "HINDI_LABOUR" : "TAMIL_LABOUR";
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark-all-present",
          date: selectedDate,
          category: categoryKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Marked ${data.count} staff as [P] Present on ${selectedDate}`);
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 1-Click "Auto-Fill Sundays as Weekly Off (L)"
  const handleAutoFillSundays = async () => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto-sunday-leave",
          month: selectedMonth,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Auto-flagged ${data.sundaysCount} Sundays as Weekly Off [L] (${data.markedRecordsCount} records)`);
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 1-Click "Copy Yesterday's Sites"
  const handleCopyYesterdaySites = async () => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "copy-yesterday-sites",
          date: selectedDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Copied site deployments from yesterday (${data.copiedCount} workers)`);
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Multi-Year Lifetime Dossier
  const handleOpenDossier = async (emp: EmployeeItem) => {
    setSelectedDossierEmployee(emp);
    setDossierLoading(true);
    try {
      const res = await fetch(`/api/attendance/history?employeeId=${emp.id}`);
      const data = await res.json();
      if (data.success) {
        setDossierData(data);
        if (data.yearsList && data.yearsList.length > 0) {
          setDossierActiveYear(data.yearsList[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDossierLoading(false);
    }
  };

  // Export Individual Attendance Card
  const handleExportIndividualDossierExcel = () => {
    if (!dossierData || !selectedDossierEmployee) return;
    const yearData = dossierData.yearlyData[dossierActiveYear];
    if (!yearData) return;

    const exportRows = yearData.months.map((m: any) => ({
      Year: dossierActiveYear,
      Month: m.monthName,
      "Present (P)": m.present,
      "Half-Day (H)": m.halfDay,
      "1-Hr Permission (1H)": m.permission,
      "Absent (A)": m.absent,
      "Leaves / Sundays (L)": m.leave,
      "Net Payable Days": m.payableDays,
      "Site Advances (₹)": m.advances,
      "Sites Deployed": m.sites.join(", ") || "Office / Base",
    }));

    exportToExcel(
      exportRows,
      `${selectedDossierEmployee.employeeCode}_${selectedDossierEmployee.name}_Attendance_${dossierActiveYear}`,
      "Dossier"
    );
  };

  // Declare Holiday in Modal
  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.date || !holidayForm.name) return;

    try {
      const res = await fetch("/api/attendance/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          date: holidayForm.date,
          name: holidayForm.name,
          markAllStaff: holidayForm.markStaff,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Declared holiday "${holidayForm.name}" on ${holidayForm.date} (Updated ${data.staffMarkedCount} staff as [L])`
        );
        setShowHolidayModal(false);
        setHolidayForm({ date: "", name: "", markStaff: true });
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Contractor Log
  const handleSaveContractorLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "contractor-log",
          record: contractorForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Saved work log for ${contractorForm.contractorTeamName}`);
        setShowContractorModal(false);
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export Monthly Muster to Excel
  const handleExportMusterExcel = () => {
    const rows = tabEmployees.map((emp) => {
      const base: Record<string, any> = {
        "Emp Code": emp.employeeCode,
        Name: emp.name,
        Role: emp.designation || emp.role || "Worker",
        Unit: emp.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs",
      };

      let p = 0;
      let h = 0;
      let p1h = 0;
      let a = 0;
      let l = 0;

      daysInMonth.forEach((d) => {
        const att = emp.attendances.find((x) => x.date.split("T")[0] === d.fullDate);
        const status = att ? att.status : d.isSunday ? "L" : "—";
        base[`Day ${d.dayNum} (${d.dayName})`] = status;

        if (status === "P") p++;
        else if (status === "H") h++;
        else if (status === "1H") p1h++;
        else if (status === "A") a++;
        else if (status === "L") l++;
      });

      base["Present (P)"] = p;
      base["Half-Day (H)"] = h;
      base["1-Hr Perm (1H)"] = p1h;
      base["Absent (A)"] = a;
      base["Leaves/Sun (L)"] = l;
      base["Net Payable Days"] = p + p1h + h * 0.5 + l;

      return base;
    });

    exportToExcel(rows, `Attendance_${activeTab.toUpperCase()}_${selectedMonth}`, "MonthlyMuster");
  };

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-7 py-3 space-y-5 select-none font-sans pb-20 text-slate-800 dark:text-slate-100">
      
      {/* 1. TOP MODULE HEADER WITH ANALYTICS & UNIVERSAL TOOLBAR */}
      <ModuleHeaderWithAnalytics
        title="Attendance & Workforce Command Center"
        subtitle="6-day work week engine, auto-Sunday leave, 1-hr permissions, daily deployment, and multi-year records"
        totalCount={employees.length}
        activeCount={
          employees.filter((e) =>
            e.attendances.some(
              (a) =>
                a.date.split("T")[0] === selectedDate &&
                (a.status === "P" || a.status === "H" || a.status === "1H")
            )
          ).length
        }
        archivedCount={employees.filter((e) => e.category === "OFFICE_STAFF").length}
        primaryAction={{
          label: "+ Log Contractor Team",
          onClick: () => {
            setContractorForm({
              id: "",
              contractorTeamName: "Nandeeshwaran Team",
              date: selectedDate,
              siteName: "Ravichandran Chennai",
              headcount: 4,
              workerBreakdown: "",
              siteWorkStatus: "Fabrication Work",
              remarks: "",
            });
            setShowContractorModal(true);
          },
        }}
        onImportExcel={() => setShowImportModal(true)}
        onExportExcel={handleExportMusterExcel}
        onPrintPDF={() => window.print()}
        extraControls={
          <button
            type="button"
            onClick={() => setShowHolidayModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-200 dark:border-amber-800 transition cursor-pointer"
          >
            <Palmtree size={14} className="text-amber-600" />
            <span>Company Holidays ({holidays.length})</span>
          </button>
        }
      />

      {/* Floating Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. TOP 4 REAL-TIME ATTENDANCE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Office Staff Presence */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building size={14} className="text-emerald-600 dark:text-emerald-400" /> Office Presence
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {selectedDate}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {kpis.presentOfficeToday || 0}
                <span className="text-sm font-semibold text-slate-400"> / {kpis.totalOfficeStaff || 13}</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {Math.round(((kpis.presentOfficeToday || 0) / (kpis.totalOfficeStaff || 13)) * 100)}% Present
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              SR: 10 staff • Invi: 3 staff • Leaves: {kpis.leaveOfficeToday || 0}
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full"
              style={{
                width: `${Math.round(((kpis.presentOfficeToday || 0) / (kpis.totalOfficeStaff || 13)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* KPI 2: Active Tamil Site Labours */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <HardHat size={14} className="text-blue-600 dark:text-blue-400" /> Tamil Site Labours
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                On Duty
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                {kpis.activeTamilSiteLabours || 0}
                <span className="text-sm font-semibold text-slate-400"> / {kpis.totalTamilLabours || 64}</span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {Object.keys(kpis.siteBreakdown || {}).length} Active Sites
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              {Object.keys(kpis.siteBreakdown || {}).slice(0, 3).join(", ") || "SSM School, Kalloviyam..."}
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full"
              style={{
                width: `${Math.min(100, Math.round(((kpis.activeTamilSiteLabours || 0) / (kpis.totalTamilLabours || 64)) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* KPI 3: Hindi Migrant Crew */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Truck size={14} className="text-purple-600 dark:text-purple-400" /> Hindi Helpers & Crew
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {kpis.totalHindiLabours || 5} Total
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
                {kpis.activeHindiToday || 4}
                <span className="text-sm font-semibold text-slate-400"> Working</span>
              </div>
              <span className="text-xs font-bold text-purple-600">80% Utilization</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Rakeshkumar1, Nithish, Rakesh2, Ajith, Mithun
            </p>
          </div>
          <div className="w-full bg-purple-100 dark:bg-purple-950 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-purple-600 h-full w-[80%]" />
          </div>
        </div>

        {/* KPI 4: Contractor Teams Headcount */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Users2 size={14} className="text-amber-600 dark:text-amber-400" /> Contractor Teams
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                6 Teams
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {kpis.contractorHeadcountToday || 14}
                <span className="text-sm font-semibold text-slate-400"> Labours</span>
              </div>
              <span className="text-xs font-bold text-amber-600">Active Sites</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              Nandeeshwaran, Sakthi, Prashop, Suresh, Suthish, Hydarali
            </p>
          </div>
          <div className="w-full bg-amber-100 dark:bg-amber-950 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-full w-[70%]" />
          </div>
        </div>
      </div>

      {/* 3. DEDICATED 4-SUBTAB NAVIGATION & CONTROL STRIP */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          {/* 4 Main Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => setActiveTab("office")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "office"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Building size={15} />
              <span>Office Staff ({employees.filter((e) => e.category === "OFFICE_STAFF").length || 13})</span>
            </button>

            <button
              onClick={() => setActiveTab("tamil")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "tamil"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <HardHat size={15} />
              <span>Tamil Site Labours ({employees.filter((e) => e.category === "TAMIL_LABOUR").length || 64})</span>
            </button>

            <button
              onClick={() => setActiveTab("hindi")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "hindi"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Truck size={15} />
              <span>Hindi Crew ({employees.filter((e) => e.category === "HINDI_LABOUR").length || 5})</span>
            </button>

            <button
              onClick={() => setActiveTab("contractor")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "contractor"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Users2 size={15} />
              <span>Contractor Teams (6)</span>
            </button>
          </div>

          {/* Persistent Year & Month Selector + Daily / Monthly View Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            {activeTab !== "contractor" && (
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode("daily")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === "daily" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                >
                  <Clock size={13} />
                  <span>Daily Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("monthly")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === "monthly" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                >
                  <CalendarDays size={13} />
                  <span>Monthly Matrix</span>
                </button>
              </div>
            )}

            {/* Persistent Year Dropdown */}
            <select
              value={selectedYear}
              onChange={(e) => handleYearMonthChange(Number(e.target.value), selectedMonthNum)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  FY {y}
                </option>
              ))}
            </select>

            {/* Persistent Month Dropdown */}
            <select
              value={selectedMonthNum}
              onChange={(e) => handleYearMonthChange(selectedYear, e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Date Picker (with Day Nav) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split("T")[0]);
                }}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 transition"
                title="Previous Day"
              >
                <ChevronLeft size={14} />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  const [y, m] = e.target.value.split("-");
                  if (y && m) {
                    setSelectedYear(Number(y));
                    setSelectedMonthNum(m);
                  }
                }}
                className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold focus:outline-hidden text-xs"
              />

              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split("T")[0]);
                }}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 transition"
                title="Next Day"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-Filters & Quick Bulk Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "office" && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCompanyUnitFilter("ALL")}
                  className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                    companyUnitFilter === "ALL" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                >
                  All (13)
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyUnitFilter("STANDARD_ROOFS")}
                  className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                    companyUnitFilter === "STANDARD_ROOFS" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Standard Roofs (10)
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyUnitFilter("INVI_CREATION")}
                  className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                    companyUnitFilter === "INVI_CREATION" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Invi Creation (3)
                </button>
              </div>
            )}

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Search staff, labourer ID, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {activeTab !== "contractor" && (
              <>
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 transition"
                  title="Mark all staff in this view as [P] Present today"
                >
                  <Check size={13} />
                  <span>Mark All Present [P]</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoFillSundays}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 transition"
                  title="Automatically flag all Sundays in this month as Weekly Off [L]"
                >
                  <CalendarOff size={13} />
                  <span>Auto-Sundays [L]</span>
                </button>
              </>
            )}

            {activeTab === "tamil" && (
              <button
                type="button"
                onClick={handleCopyYesterdaySites}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 transition"
                title="Copy all site locations from yesterday"
              >
                <Copy size={13} />
                <span>Copy Yesterday's Sites</span>
              </button>
            )}

            <Link
              href="/labour"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Workforce KYC Directory</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKFORCE CONTENT: (A) CONTRACTORS, (B) DAILY SHEET, (C) MONTHLY MATRIX */}
      {activeTab === "contractor" ? (
        /* ================= CONTRACTOR TEAMS DAILY SITE LOGS ================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Briefcase className="text-amber-500" size={16} />
                Contractor Teams Daily Site Logs ({selectedMonth})
              </h3>
              <p className="text-xs text-slate-500">
                Log sheets for Nandeeshwaran Team, Contractor Sakthi, Prashop Team, Monier Suresh, Suthish Team, and Hydarali Team
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setContractorForm({
                  id: "",
                  contractorTeamName: "Nandeeshwaran Team",
                  date: selectedDate,
                  siteName: "Ravichandran Chennai",
                  headcount: 4,
                  workerBreakdown: "",
                  siteWorkStatus: "Fabrication Work",
                  remarks: "",
                });
                setShowContractorModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>+ New Contractor Log</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-bold text-slate-400">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Contractor Team</th>
                  <th className="py-3 px-3">Site Location</th>
                  <th className="py-3 px-3 text-center">Headcount</th>
                  <th className="py-3 px-3">Worker Breakdown</th>
                  <th className="py-3 px-3">Site Work Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {contractorLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No contractor logs found for this period. Click <strong>+ New Contractor Log</strong> to add one.
                    </td>
                  </tr>
                ) : (
                  contractorLogs.map((log) => {
                    const logDate = log.date.split("T")[0];
                    const isToday = logDate === selectedDate;
                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                          isToday ? "bg-amber-50/40 dark:bg-amber-950/20" : ""
                        }`}
                      >
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {logDate}
                          {isToday && (
                            <span className="ml-2 text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                              Selected
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-blue-600 dark:text-blue-400">
                          {log.contractorTeamName}
                        </td>
                        <td className="py-3 px-3 font-medium flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <MapPin size={13} className="text-slate-400" />
                          <span>{log.siteName || "Site Standby"}</span>
                        </td>
                        <td className="py-3 px-3 text-center tabular-nums">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                              log.headcount > 0
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {log.headcount} Labours
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px] max-w-[200px] truncate">
                          {log.workerBreakdown || "—"}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                              log.siteWorkStatus?.includes("Fabrication") || log.siteWorkStatus?.includes("Welding")
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : log.siteWorkStatus?.includes("Rain")
                                ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300"
                                : log.siteWorkStatus?.includes("No Work") || log.siteWorkStatus?.includes("Absent")
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {log.siteWorkStatus || "Active"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setContractorForm({
                                id: log.id,
                                contractorTeamName: log.contractorTeamName,
                                date: logDate,
                                siteName: log.siteName || "",
                                headcount: log.headcount,
                                workerBreakdown: log.workerBreakdown || "",
                                siteWorkStatus: log.siteWorkStatus || "Active Work",
                                remarks: log.remarks || "",
                              });
                              setShowContractorModal(true);
                            }}
                            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === "daily" ? (
        /* ================= DAILY QUICK-MARK TABLE (TABS 1, 2, 3) ================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="text-blue-600" size={16} />
                  Daily Attendance & Deployment Sheet • {selectedDate}
                </h3>
                {new Date(`${selectedDate}T00:00:00.000Z`).getUTCDay() === 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-black">
                    Weekly Off (Sunday)
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                    Working Day
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                1-Click status pills: [P] Present • [H] Half-Day • [1H] 1-Hr Permission • [A] Absent • [L] Leave/Sunday
              </p>
            </div>

            <div className="text-xs text-slate-500 font-semibold tabular-nums">
              Showing <strong>{tabEmployees.length}</strong> personnel
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-bold text-slate-400">
                  <th className="py-3 px-3">ID & Personnel (Click for Dossier)</th>
                  <th className="py-3 px-3">Role / Designation</th>
                  {activeTab === "office" && <th className="py-3 px-3">Company Unit</th>}
                  {activeTab !== "office" && <th className="py-3 px-3">Site Location</th>}
                  {activeTab !== "office" && <th className="py-3 px-3 text-right">Daily Advance (₹)</th>}
                  {activeTab === "office" && <th className="py-3 px-3 text-center">In Time</th>}
                  {activeTab === "office" && <th className="py-3 px-3 text-center">Out Time</th>}
                  <th className="py-3 px-3 text-center min-w-[240px]">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tabEmployees.map((emp) => {
                  const key = `${emp.id}_${selectedDate}`;
                  const att = emp.attendances.find((a) => a.date.split("T")[0] === selectedDate);
                  const draft = attendanceDrafts[key] || {};
                  
                  // Clean Unmarked State Check:
                  // If explicit record exists in draft or DB, use it.
                  // Otherwise, if Sunday -> auto "L". If non-Sunday -> null (Unmarked / Pending)
                  const isSun = new Date(`${selectedDate}T00:00:00.000Z`).getUTCDay() === 0;
                  const currentStatus = draft.status !== undefined ? draft.status : att?.status ? (att.status as any) : isSun ? "L" : null;

                  const inTimeVal = draft.inTime ?? att?.inTime ?? "";
                  const outTimeVal = draft.outTime ?? att?.outTime ?? "";
                  const siteVal = draft.siteName ?? att?.siteName ?? (activeTab === "office" ? "Headquarters Office" : "SSM School");
                  const advanceVal = draft.dailyAdvance ?? att?.dailyAdvance ?? 0;
                  const permNote = draft.permissionNote ?? att?.permissionNote ?? "";

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      {/* Name & ID (Click opens Lifetime Multi-Year Dossier) */}
                      <td className="py-3 px-3">
                        <div
                          onClick={() => handleOpenDossier(emp)}
                          className="flex items-center gap-2.5 cursor-pointer group"
                          title="Click to view full Multi-Year & Lifetime Attendance Dossier"
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition group-hover:scale-105 ${
                              activeTab === "office"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : activeTab === "hindi"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {emp.employeeCode.slice(-3)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline flex items-center gap-1.5">
                              {emp.name}
                              <History size={11} className="opacity-0 group-hover:opacity-100 text-blue-600 transition" />
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {emp.employeeCode} {emp.empCode ? `(${emp.empCode})` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {emp.designation || emp.role || "Worker"}
                        </span>
                        {emp.dailyWage ? (
                          <span className="text-[10.5px] text-slate-400 block tabular-nums">
                            ₹{emp.dailyWage}/day
                          </span>
                        ) : null}
                      </td>

                      {/* Company Unit for Office */}
                      {activeTab === "office" && (
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              emp.companyUnit === "INVI_CREATION"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {emp.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs"}
                          </span>
                        </td>
                      )}

                      {/* Site Location for Labours */}
                      {activeTab !== "office" && (
                        <td className="py-3 px-3">
                          <div className="relative min-w-[190px]">
                            <select
                              value={siteVal}
                              onChange={(e) => handleSiteChange(emp.id, e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                            >
                              {COMMON_SITES.map((site) => (
                                <option key={site} value={site}>
                                  {site}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      )}

                      {/* Daily Pocket Advance for Labours */}
                      {activeTab !== "office" && (
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-slate-400 font-bold">₹</span>
                            <input
                              type="number"
                              value={advanceVal || ""}
                              placeholder="0"
                              onChange={(e) => handleAdvanceChange(emp.id, Number(e.target.value) || 0)}
                              className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-right tabular-nums text-xs font-bold focus:outline-hidden focus:border-blue-500"
                            />
                          </div>
                        </td>
                      )}

                      {/* Office In Time */}
                      {activeTab === "office" && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="text"
                            placeholder="09:00 AM"
                            value={inTimeVal}
                            onChange={(e) => handleTimeChange(emp.id, "inTime", e.target.value)}
                            className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-center focus:outline-hidden focus:border-blue-500 tabular-nums"
                          />
                        </td>
                      )}

                      {/* Office Out Time */}
                      {activeTab === "office" && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="text"
                            placeholder="07:00 PM"
                            value={outTimeVal}
                            onChange={(e) => handleTimeChange(emp.id, "outTime", e.target.value)}
                            className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-center focus:outline-hidden focus:border-blue-500 tabular-nums"
                          />
                        </td>
                      )}

                      {/* 1-Click Status Pill Group [P] [H] [1H] [A] [L] with Clean Unmarked State */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                          {/* Present (P) */}
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(emp.id, "P", siteVal)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                              currentStatus === "P"
                                ? "bg-emerald-600 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            }`}
                            title="Present (1.0 Full Day)"
                          >
                            P
                          </button>

                          {/* Half Day (H) */}
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(emp.id, "H", siteVal)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                              currentStatus === "H"
                                ? "bg-amber-500 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            }`}
                            title="Half Day (0.5 Day)"
                          >
                            H
                          </button>

                          {/* 1-Hour Permission (1H) */}
                          <button
                            type="button"
                            onClick={() => {
                              // If already 1H, re-confirm or open prompt
                              setPermPromptTarget({ employeeId: emp.id, siteName: siteVal });
                              setPermissionInput(permNote || "1-Hour Morning Permission");
                            }}
                            className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                              currentStatus === "1H"
                                ? "bg-cyan-600 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
                            }`}
                            title="1-Hour Permission (1.0 Day with Permission Log)"
                          >
                            1H
                          </button>

                          {/* Absent (A) */}
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(emp.id, "A", siteVal)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                              currentStatus === "A"
                                ? "bg-rose-600 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            }`}
                            title="Absent (0.0 Day)"
                          >
                            A
                          </button>

                          {/* Leave / Sunday (L) */}
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(emp.id, "L", siteVal)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                              currentStatus === "L"
                                ? "bg-slate-700 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                            title="Leave / Sunday Holiday"
                          >
                            L
                          </button>

                          {/* Unmarked Indicator */}
                          {currentStatus === null && (
                            <span className="text-[10px] text-slate-400 px-1 font-semibold" title="Pending HR Mark">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= MONTHLY MATRIX GRID (1..31 DAYS WITH CLICKABLE CELLS & SUMMARY) ================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CalendarDays className="text-blue-600" size={16} />
                  Monthly Attendance & Muster Grid ({selectedMonth})
                </h3>
                <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold">
                  {totalWorkingDaysInMonth} Working Days
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any cell to edit status: <strong className="text-emerald-600">P (1.0)</strong>, <strong className="text-amber-500">H (0.5)</strong>, <strong className="text-cyan-600">1H (1.0)</strong>, <strong className="text-rose-600">A (0.0)</strong>, <strong className="text-slate-600">L (Weekly Off)</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> P
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> H
                </span>
                <span className="flex items-center gap-1 text-cyan-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-600" /> 1H
                </span>
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> A
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-600" /> L
                </span>
              </div>

              <button
                type="button"
                onClick={handleExportMusterExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet size={13} />
                <span>Export (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                  <th className="py-2.5 px-3 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 min-w-[160px] border-r border-slate-200 dark:border-slate-700">
                    Personnel Name
                  </th>

                  {/* 1..31 Days Header */}
                  {daysInMonth.map((d) => (
                    <th
                      key={d.dayNum}
                      className={`py-2 px-1 text-center min-w-[28px] border-r border-slate-100 dark:border-slate-800/50 ${
                        d.isSunday
                          ? "bg-slate-200/70 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-black"
                          : d.isHoliday
                          ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold"
                          : d.fullDate === selectedDate
                          ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black"
                          : ""
                      }`}
                    >
                      <div>{d.dayNum}</div>
                      <div className="text-[8px] font-normal opacity-70">{d.dayName}</div>
                    </th>
                  ))}

                  {/* Right Sticky Summary Columns */}
                  <th className="py-2.5 px-2 text-center bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black border-l border-slate-200">
                    P (1.0)
                  </th>
                  <th className="py-2.5 px-2 text-center bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black">
                    H (0.5)
                  </th>
                  <th className="py-2.5 px-2 text-center bg-cyan-50 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-black">
                    1H (1.0)
                  </th>
                  <th className="py-2.5 px-2 text-center bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-black">
                    A (0.0)
                  </th>
                  <th className="py-2.5 px-2 text-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black">
                    L (Sun)
                  </th>
                  <th className="py-2.5 px-3 text-center bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-black sticky right-0 z-10 border-l border-blue-200 shadow-xs">
                    Payable Days
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tabEmployees.map((emp) => {
                  let pTotal = 0;
                  let hTotal = 0;
                  let p1hTotal = 0;
                  let aTotal = 0;
                  let lTotal = 0;

                  // Pre-calculate sums with Auto-Sunday Rule
                  daysInMonth.forEach((d) => {
                    const att = emp.attendances.find((a) => a.date.split("T")[0] === d.fullDate);
                    const status = att ? att.status : d.isSunday ? "L" : null;

                    if (status === "P") pTotal++;
                    else if (status === "H") hTotal++;
                    else if (status === "1H") p1hTotal++;
                    else if (status === "A") aTotal++;
                    else if (status === "L") lTotal++;
                  });

                  const netPayableDays = pTotal + p1hTotal + hTotal * 0.5 + lTotal;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      {/* Fixed Left Column (Clickable to open Dossier) */}
                      <td className="py-2 px-3 sticky left-0 bg-white dark:bg-slate-900 z-10 font-bold border-r border-slate-200 dark:border-slate-800">
                        <div
                          onClick={() => handleOpenDossier(emp)}
                          className="truncate max-w-[150px] text-slate-800 dark:text-slate-200 hover:text-blue-600 cursor-pointer flex items-center justify-between"
                          title="Click to view full Tenure Dossier"
                        >
                          <span className="truncate">{emp.name}</span>
                          <History size={11} className="text-slate-400 opacity-60 shrink-0 ml-1" />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {emp.employeeCode}
                        </span>
                      </td>

                      {/* 1..31 Clickable Day Cells */}
                      {daysInMonth.map((d) => {
                        const att = emp.attendances.find((a) => a.date.split("T")[0] === d.fullDate);
                        const status = att ? att.status : d.isSunday ? "L" : null;

                        return (
                          <td
                            key={d.dayNum}
                            onClick={() => {
                              setCellEditTarget({
                                employee: emp,
                                date: d.fullDate,
                                dayNum: d.dayNum,
                                currentStatus: status,
                                currentSite: att?.siteName,
                                currentNote: att?.permissionNote,
                              });
                              setSiteInput(att?.siteName || (emp.category === "OFFICE_STAFF" ? "Headquarters Office" : "SSM School"));
                              setPermissionInput(att?.permissionNote || "");
                            }}
                            className={`py-1.5 px-0.5 text-center font-black cursor-pointer transition select-none border-r border-slate-100 dark:border-slate-800/50 hover:bg-blue-50/70 dark:hover:bg-blue-900/30 ${
                              d.isSunday
                                ? "bg-slate-100/60 dark:bg-slate-800/60"
                                : d.fullDate === selectedDate
                                ? "ring-2 ring-blue-500/50"
                                : ""
                            }`}
                            title={`${emp.name} - ${d.fullDate}: ${status || "Pending"} ${
                              att?.siteName ? `[${att.siteName}]` : ""
                            } ${att?.permissionNote ? `(Perm: ${att.permissionNote})` : ""}`}
                          >
                            <span
                              className={`w-6 h-6 rounded-md inline-flex items-center justify-center text-[10px] font-black transition ${
                                status === "P"
                                  ? "bg-emerald-500 text-white"
                                  : status === "H"
                                  ? "bg-amber-400 text-white"
                                  : status === "1H"
                                  ? "bg-cyan-600 text-white"
                                  : status === "A"
                                  ? "bg-rose-500 text-white"
                                  : status === "L"
                                  ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                  : "bg-slate-100/60 text-slate-300 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {status || "—"}
                            </span>
                          </td>
                        );
                      })}

                      {/* Right Sticky Summary Counts */}
                      <td className="py-2 px-2 text-center font-bold text-emerald-600 tabular-nums bg-emerald-50/30 dark:bg-emerald-950/20 border-l border-slate-200">
                        {pTotal}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-amber-500 tabular-nums bg-amber-50/30 dark:bg-amber-950/20">
                        {hTotal}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-cyan-600 tabular-nums bg-cyan-50/30 dark:bg-cyan-950/20">
                        {p1hTotal}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-rose-500 tabular-nums bg-rose-50/30 dark:bg-rose-950/20">
                        {aTotal}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-500 tabular-nums bg-slate-100/40 dark:bg-slate-800/40">
                        {lTotal}
                      </td>
                      <td className="py-2 px-3 text-center font-black text-blue-700 dark:text-blue-300 tabular-nums bg-blue-50/70 dark:bg-blue-950/60 sticky right-0 z-10 border-l border-blue-200 shadow-xs">
                        {netPayableDays}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL: CELL EDIT POPOVER (FOR MONTHLY MATRIX) */}
      {cellEditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  {cellEditTarget.employee.name}
                </h4>
                <p className="text-[11px] text-slate-400">
                  Date: <strong>{cellEditTarget.date}</strong> (Day {cellEditTarget.dayNum})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCellEditTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-slate-700 dark:text-slate-300">Set Status</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { key: "P", label: "P", desc: "Present (1.0)", bg: "bg-emerald-600 text-white" },
                  { key: "H", label: "H", desc: "Half-Day (0.5)", bg: "bg-amber-500 text-white" },
                  { key: "1H", label: "1H", desc: "1-Hr Perm (1.0)", bg: "bg-cyan-600 text-white" },
                  { key: "A", label: "A", desc: "Absent (0.0)", bg: "bg-rose-600 text-white" },
                  { key: "L", label: "L", desc: "Weekly Off / Leave", bg: "bg-slate-700 text-white" },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      handleMarkStatus(
                        cellEditTarget.employee.id,
                        s.key as any,
                        siteInput || undefined,
                        cellEditTarget.date,
                        permissionInput || undefined
                      );
                      setCellEditTarget(null);
                    }}
                    className={`py-2 rounded-xl font-black text-xs transition cursor-pointer flex flex-col items-center justify-center ${
                      cellEditTarget.currentStatus === s.key ? s.bg + " ring-2 ring-blue-500" : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Site Selector for Labours */}
              {cellEditTarget.employee.category !== "OFFICE_STAFF" && (
                <div className="pt-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Site Location</label>
                  <select
                    value={siteInput}
                    onChange={(e) => setSiteInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    {COMMON_SITES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Permission Note */}
              <div className="pt-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Permission / Work Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Doctor appointment, 1-hr morning permission"
                  value={permissionInput}
                  onChange={(e) => setPermissionInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    handleMarkStatus(
                      cellEditTarget.employee.id,
                      "P",
                      siteInput,
                      cellEditTarget.date,
                      permissionInput
                    );
                    setCellEditTarget(null);
                  }}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setCellEditTarget(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: 1-HOUR PERMISSION PROMPT IN DAILY VIEW */}
      {permPromptTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Timer className="text-cyan-600" size={16} />
                Log 1-Hour Permission [1H]
              </h4>
              <button
                type="button"
                onClick={() => setPermPromptTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                1-Hour permission grants <strong>1.0 full day attendance credit</strong> with an official time slip record.
              </p>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Permission Reason / Note
                </label>
                <input
                  type="text"
                  value={permissionInput}
                  onChange={(e) => setPermissionInput(e.target.value)}
                  placeholder="e.g. Doctor checkup, Morning delay, Bank work"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPermPromptTarget(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleMarkStatus(
                      permPromptTarget.employeeId,
                      "1H",
                      permPromptTarget.siteName,
                      selectedDate,
                      permissionInput || "1-Hour Permission"
                    );
                    setPermPromptTarget(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs"
                >
                  Confirm [1H]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: EMPLOYEE MULTI-YEAR & LIFETIME ATTENDANCE DOSSIER */}
      {selectedDossierEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-md">
                  {selectedDossierEmployee.employeeCode.slice(-3)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {selectedDossierEmployee.name}
                    </h3>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                      {selectedDossierEmployee.employeeCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedDossierEmployee.designation || selectedDossierEmployee.role || "Worker"} •{" "}
                    {selectedDossierEmployee.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs"} •{" "}
                    Joined: {new Date(selectedDossierEmployee.dateOfJoining || Date.now()).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportIndividualDossierExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet size={14} />
                  <span>Export Card (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDossierEmployee(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Lifetime Summary KPIs */}
            {dossierData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
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
            )}

            {/* Year Selector Tabs */}
            {dossierData?.yearsList && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {dossierData.yearsList.map((yr: string) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setDossierActiveYear(yr)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          dossierActiveYear === yr
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
                {dossierData.yearlyData?.[dossierActiveYear] && (
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
                        {dossierData.yearlyData[dossierActiveYear].months.map((m: any) => (
                          <tr key={m.monthIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                              {m.monthName} {dossierActiveYear}
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
        </div>
      )}

      {/* 8. MODAL: COMPANY HOLIDAY CALENDAR */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Palmtree className="text-amber-500" size={18} />
                  Company Holiday Calendar ({selectedYear})
                </h3>
                <p className="text-xs text-slate-500">
                  Standard Roofs official declared leaves & Tamil Nadu public holidays
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHolidayModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* List of current holidays */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <div>
                      <strong className="text-slate-900 dark:text-slate-100 block">{h.name}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">{h.date.split("T")[0]}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    Official [L]
                  </span>
                </div>
              ))}
            </div>

            {/* Add Holiday Form */}
            <form onSubmit={handleSaveHoliday} className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3 text-xs">
              <strong className="block text-slate-800 dark:text-slate-200">Declare New Public Holiday</strong>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Holiday Date</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Holiday Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diwali, Pongal, May Day"
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="markStaff"
                  checked={holidayForm.markStaff}
                  onChange={(e) => setHolidayForm({ ...holidayForm, markStaff: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <label htmlFor="markStaff" className="text-slate-600 dark:text-slate-300 cursor-pointer">
                  Mark as Leave [L] across all active employees in 1 click
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
              >
                + Declare Holiday & Auto-Mark [L]
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: LOG CONTRACTOR TEAM DAILY SITE WORK */}
      {showContractorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users2 className="text-amber-500" size={18} />
                {contractorForm.id ? "Edit Contractor Work Log" : "New Contractor Team Daily Log"}
              </h3>
              <button
                type="button"
                onClick={() => setShowContractorModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveContractorLog} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contractor Team</label>
                <select
                  value={contractorForm.contractorTeamName}
                  onChange={(e) => setContractorForm({ ...contractorForm, contractorTeamName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Nandeeshwaran Team">Nandeeshwaran Team (Fabrication & Welding)</option>
                  <option value="Contractor Sakthi">Contractor Sakthi (Roofing & Sheeting)</option>
                  <option value="Prashop Team">Prashop Team (Site Erection)</option>
                  <option value="Monier Suresh">Monier Suresh Team (Purlin Welding)</option>
                  <option value="Suthish Team">Suthish Team (Labour Support)</option>
                  <option value="Hydarali Team">Hydarali Team (Civil & Gutter Works)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={contractorForm.date}
                    onChange={(e) => setContractorForm({ ...contractorForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Site Location</label>
                  <select
                    value={contractorForm.siteName}
                    onChange={(e) => setContractorForm({ ...contractorForm, siteName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden"
                  >
                    {COMMON_SITES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Headcount (Labours)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={contractorForm.headcount}
                    onChange={(e) => setContractorForm({ ...contractorForm, headcount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Site Work Status</label>
                  <select
                    value={contractorForm.siteWorkStatus}
                    onChange={(e) => setContractorForm({ ...contractorForm, siteWorkStatus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden"
                  >
                    <option value="Fabrication Work">Fabrication Work</option>
                    <option value="Purlin Work Welding">Purlin Work Welding</option>
                    <option value="Roofing Sheeting">Roofing Sheeting</option>
                    <option value="Rain Season Delay">Rain Season Delay</option>
                    <option value="No Work / Absent">No Work / Absent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Worker Breakdown (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Rajkumar-F, Mani-H, Selvam-H"
                  value={contractorForm.workerBreakdown}
                  onChange={(e) => setContractorForm({ ...contractorForm, workerBreakdown: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowContractorModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. UNIVERSAL EXCEL IMPORT MODAL */}
      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        moduleName="Workforce Attendance"
        templateColumns={[
          { key: "employeeCode", label: "Employee Code (e.g. SR001, 20001)", required: true },
          { key: "date", label: "Date (YYYY-MM-DD)", required: true },
          { key: "status", label: "Status (P, H, 1H, A, L)", required: true },
          { key: "siteName", label: "Site Location" },
          { key: "inTime", label: "In Time (Office)" },
          { key: "outTime", label: "Out Time (Office)" },
          { key: "dailyAdvance", label: "Daily Advance (₹)" },
        ]}
        onImportComplete={() => {
          showToast("Imported attendance records successfully");
          fetchAttendance();
        }}
      />
    </div>
  );
}
