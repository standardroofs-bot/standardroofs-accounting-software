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
} from "lucide-react";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import ExcelImportModal from "@/components/common/ExcelImportModal";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { formatINR } from "@/lib/decimal";

interface AttendanceRecordItem {
  id: string;
  employeeId: string;
  date: string;
  status: "P" | "H" | "A" | "L";
  inTime?: string | null;
  outTime?: string | null;
  siteName?: string | null;
  dailyAdvance?: number;
  workNotes?: string | null;
}

interface EmployeeItem {
  id: string;
  employeeCode: string;
  empCode?: string | null;
  name: string;
  fatherName?: string | null;
  designation?: string | null;
  role?: string | null;
  category: "OFFICE_STAFF" | "TAMIL_LABOUR" | "HINDI_LABOUR" | "CONTRACTOR_TEAM";
  companyUnit: "STANDARD_ROOFS" | "INVI_CREATION";
  dailyWage?: number;
  monthlySalary?: number;
  phone?: string | null;
  attendances: AttendanceRecordItem[];
}

interface ContractorDailyLogItem {
  id: string;
  contractorTeamName: string;
  date: string;
  siteName?: string | null;
  headcount: number;
  workerBreakdown?: string | null;
  siteWorkStatus?: string | null;
  remarks?: string | null;
}

const COMMON_SITES = [
  "SSM School",
  "Kalloviyam Gokul",
  "Vishnu Nalliyampalayam",
  "Venkatesh Salem",
  "Ananthi Site",
  "Ananthi Thindal",
  "Saravanan Perambalur",
  "Saravanan Villarasampatti",
  "Unloading Yard",
  "Office & Workshop",
  "Ravichandran Chennai",
  "Arunprasad Uthukuli",
  "Pradeep Perambalur",
  "Lotus Hospital board Work",
];

export default function AttendanceCommandCenterPage() {
  const [activeTab, setActiveTab] = useState<"office" | "tamil" | "hindi" | "contractor">("office");
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState("2026-11-20");
  const [selectedMonth, setSelectedMonth] = useState("2026-11");
  const [companyUnitFilter, setCompanyUnitFilter] = useState<"ALL" | "STANDARD_ROOFS" | "INVI_CREATION">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Data states
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [contractorLogs, setContractorLogs] = useState<ContractorDailyLogItem[]>([]);
  const [kpis, setKpis] = useState<any>({});

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
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

  // Local optimistic edit cache for fast clicking: key = `${employeeId}_${date}`
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, { status: string; inTime?: string; outTime?: string; siteName?: string; dailyAdvance?: number }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Fetch Attendance and Workforce Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}&month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees || []);
        setContractorLogs(data.contractorLogs || []);
        setKpis(data.kpis || {});
      }
    } catch (err) {
      console.error("Failed to load attendance records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedMonth]);

  // Handle Quick Status Mark (1-Click P, H, A, L)
  const handleMarkStatus = async (employeeId: string, status: "P" | "H" | "A" | "L", existingSite?: string) => {
    const key = `${employeeId}_${selectedDate}`;
    const prev = attendanceDrafts[key] || {};
    const defaultSite = existingSite || (activeTab === "office" ? "Headquarters Office" : "SSM School");
    const defaultIn = activeTab === "office" ? (status === "P" || status === "H" ? (prev.inTime || "09:00 AM") : "") : "";
    const defaultOut = activeTab === "office" ? (status === "P" ? (prev.outTime || "07:00 PM") : status === "H" ? (prev.outTime || "01:30 PM") : "") : "";

    const updatedDraft = {
      ...prev,
      status,
      siteName: prev.siteName || defaultSite,
      inTime: defaultIn,
      outTime: defaultOut,
    };

    setAttendanceDrafts((d) => ({ ...d, [key]: updatedDraft }));
    setSavingKey(key);

    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          record: {
            employeeId,
            date: selectedDate,
            status,
            inTime: updatedDraft.inTime,
            outTime: updatedDraft.outTime,
            siteName: updatedDraft.siteName,
            dailyAdvance: updatedDraft.dailyAdvance || 0,
          },
        }),
      });

      // Update in employees state optimistically
      setEmployees((prevEmps) =>
        prevEmps.map((emp) => {
          if (emp.id !== employeeId) return emp;
          const existingAtt = emp.attendances.filter((a) => a.date.split("T")[0] !== selectedDate);
          return {
            ...emp,
            attendances: [
              ...existingAtt,
              {
                id: `opt-${Date.now()}`,
                employeeId,
                date: selectedDate,
                status,
                inTime: updatedDraft.inTime,
                outTime: updatedDraft.outTime,
                siteName: updatedDraft.siteName,
                dailyAdvance: updatedDraft.dailyAdvance,
              },
            ],
          };
        })
      );
    } catch (e) {
      console.error("Mark failed", e);
    } finally {
      setSavingKey(null);
    }
  };

  // Handle In/Out time change
  const handleTimeChange = async (employeeId: string, field: "inTime" | "outTime", value: string) => {
    const key = `${employeeId}_${selectedDate}`;
    const current = attendanceDrafts[key] || {};
    const updated = { ...current, [field]: value };
    setAttendanceDrafts((d) => ({ ...d, [key]: updated }));

    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          record: {
            employeeId,
            date: selectedDate,
            status: current.status || "P",
            inTime: field === "inTime" ? value : current.inTime,
            outTime: field === "outTime" ? value : current.outTime,
            siteName: current.siteName || "Headquarters Office",
          },
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Site Name Change
  const handleSiteChange = async (employeeId: string, siteName: string) => {
    const key = `${employeeId}_${selectedDate}`;
    const current = attendanceDrafts[key] || {};
    const updated = { ...current, siteName, status: current.status || "P" };
    setAttendanceDrafts((d) => ({ ...d, [key]: updated }));

    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          record: {
            employeeId,
            date: selectedDate,
            status: current.status || "P",
            siteName,
            dailyAdvance: current.dailyAdvance || 0,
          },
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Daily Advance Change
  const handleAdvanceChange = async (employeeId: string, advance: number) => {
    const key = `${employeeId}_${selectedDate}`;
    const current = attendanceDrafts[key] || {};
    const updated = { ...current, dailyAdvance: advance };
    setAttendanceDrafts((d) => ({ ...d, [key]: updated }));

    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          record: {
            employeeId,
            date: selectedDate,
            status: current.status || "P",
            siteName: current.siteName,
            dailyAdvance: advance,
          },
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk Mark All Present
  const handleMarkAllPresent = async () => {
    const cat = activeTab === "office" ? "OFFICE_STAFF" : activeTab === "hindi" ? "HINDI_LABOUR" : "TAMIL_LABOUR";
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark-all-present",
          date: selectedDate,
          category: cat,
        }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Copy Yesterday's Site Assignments
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
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Contractor Daily Log
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
        setShowContractorModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered employees for current tab
  const tabEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (activeTab === "office") {
        if (e.category !== "OFFICE_STAFF") return false;
        if (companyUnitFilter !== "ALL" && e.companyUnit !== companyUnitFilter) return false;
      } else if (activeTab === "tamil") {
        if (e.category !== "TAMIL_LABOUR") return false;
      } else if (activeTab === "hindi") {
        if (e.category !== "HINDI_LABOUR") return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          (e.empCode && e.empCode.toLowerCase().includes(q)) ||
          (e.designation && e.designation.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [employees, activeTab, companyUnitFilter, searchQuery]);

  // Days in month (1..30)
  const daysInMonth = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const count = new Date(y, m, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const dayNum = i + 1;
      const dayStr = String(dayNum).padStart(2, "0");
      const fullDate = `${selectedMonth}-${dayStr}`;
      const d = new Date(y, m - 1, dayNum);
      const isSunday = d.getDay() === 0;
      const dayName = d.toLocaleDateString("en-US", { weekday: "narrow" });
      return { dayNum, fullDate, isSunday, dayName };
    });
  }, [selectedMonth]);

  // Export Muster to Excel
  const handleExportMusterExcel = () => {
    const rows = tabEmployees.map((emp) => {
      const rowData: Record<string, any> = {
        "Emp ID": emp.employeeCode,
        Name: emp.name,
        Designation: emp.designation || "-",
        Category: emp.category,
        Unit: emp.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs",
      };

      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;

      daysInMonth.forEach((d) => {
        const att = emp.attendances.find((a) => a.date.split("T")[0] === d.fullDate);
        const status = att ? att.status : d.isSunday ? "L" : "-";
        rowData[`Day ${d.dayNum}`] = status;
        if (status === "P") presentCount += 1;
        else if (status === "H") presentCount += 0.5;
        else if (status === "A") absentCount += 1;
        else if (status === "L") leaveCount += 1;
      });

      rowData["Total Present"] = presentCount;
      rowData["Total Absent"] = absentCount;
      rowData["Total Leave"] = leaveCount;
      return rowData;
    });

    exportToExcel(rows, `Attendance_${activeTab.toUpperCase()}_${selectedMonth}`, "Muster");
  };

  // Export Daily Deployment PDF
  const handlePrintDailyPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-7 py-3 space-y-5 select-none font-sans pb-16 text-slate-800 dark:text-slate-100">
      {/* 1. TOP MODULE HEADER WITH ANALYTICS & UNIVERSAL TOOLBAR */}
      <ModuleHeaderWithAnalytics
        title="Attendance & Workforce Command Center"
        subtitle="Daily site muster rolls, office biometric log, Hindi crew deployment & 6 contractor teams"
        totalCount={employees.length}
        activeCount={employees.filter((e) => e.attendances.some((a) => a.date.split("T")[0] === selectedDate && (a.status === "P" || a.status === "H"))).length}
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
        onPrintPDF={handlePrintDailyPDF}
        charts={[
          {
            title: "Workforce Composition & Distribution",
            description: "Breakdown across Tamil site erectors, Office staff, Hindi crew, and Contractors",
            type: "donut",
            data: [
              { name: "Tamil Labours", value: kpis.totalTamilLabours || 64, color: "#2563eb" },
              { name: "Office Staff", value: kpis.totalOfficeStaff || 13, color: "#10b981" },
              { name: "Contractor Crews", value: 6, color: "#f59e0b" },
              { name: "Hindi Migrant Crew", value: kpis.totalHindiLabours || 5, color: "#8b5cf6" },
            ],
          },
          {
            title: "Site Deployment Velocity by Location",
            description: "Workers deployed across active roofing sites (SSM School, Kalloviyam, Perambalur)",
            type: "bar",
            data: [
              { name: "SSM School", value: 8, color: "#10b981" },
              { name: "Kalloviyam Gokul", value: 5, color: "#2563eb" },
              { name: "Vishnu Nalliyampalayam", value: 4, color: "#3b82f6" },
              { name: "Venkatesh Salem", value: 4, color: "#f59e0b" },
              { name: "Office & Yard", value: 4, color: "#6366f1" },
              { name: "Unloading", value: 2, color: "#ec4899" },
            ],
          },
        ]}
      />

      {/* 2. TOP 4 REAL-TIME ATTENDANCE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Office Staff Presence */}
        <div className="bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building size={14} className="text-emerald-600 dark:text-emerald-400" /> Today's Office Presence
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Live Nov 20
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2.5">
              <div className="text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {kpis.presentOfficeToday || 12} <span className="text-sm font-semibold text-slate-400">/ {kpis.totalOfficeStaff || 13}</span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {Math.round(((kpis.presentOfficeToday || 12) / (kpis.totalOfficeStaff || 13)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              SR Headquarters: 9 Present • Invi Hub: 3 Present
            </p>
          </div>
          <div className="w-full bg-emerald-100 dark:bg-emerald-950 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full w-[92%]" />
          </div>
        </div>

        {/* KPI 2: Tamil Site Labours */}
        <div className="bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <HardHat size={14} className="text-blue-600 dark:text-blue-400" /> Active Tamil Site Crew
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                On Duty
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2.5">
              <div className="text-2xl lg:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                {kpis.activeTamilSiteLabours || 18} <span className="text-sm font-semibold text-slate-400">Erectors</span>
              </div>
              <span className="text-xs font-bold text-emerald-600">6 Active Sites</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              SSM School, Kalloviyam, Perambalur, Salem
            </p>
          </div>
          <div className="w-full bg-blue-100 dark:bg-blue-950 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-600 h-full w-[78%]" />
          </div>
        </div>

        {/* KPI 3: Hindi Crew Deployment */}
        <div className="bg-gradient-to-b from-purple-50/40 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Truck size={14} className="text-purple-600 dark:text-purple-400" /> Hindi Helpers & Unloading
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                5 Helpers
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2.5">
              <div className="text-2xl lg:text-3xl font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">
                {kpis.activeHindiToday || 4} <span className="text-sm font-semibold text-slate-400">Working</span>
              </div>
              <span className="text-xs font-bold text-purple-600">80% Rate</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Rakeshkumar, Nithishkumar, Rakesh2, Ajith
            </p>
          </div>
          <div className="w-full bg-purple-100 dark:bg-purple-950 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-purple-600 h-full w-[80%]" />
          </div>
        </div>

        {/* KPI 4: Contractor Workforce Today */}
        <div className="bg-gradient-to-b from-amber-50/40 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Users2 size={14} className="text-amber-600 dark:text-amber-400" /> Contractor Teams Headcount
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                6 Teams
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2.5">
              <div className="text-2xl lg:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                {kpis.contractorHeadcountToday || 14} <span className="text-sm font-semibold text-slate-400">Labours</span>
              </div>
              <span className="text-xs font-bold text-amber-600">4 Active Sites</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Nandeeshwaran (4), Sakthi (4), Prashop (3), Monier (3)
            </p>
          </div>
          <div className="w-full bg-amber-100 dark:bg-amber-950 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-full w-[85%]" />
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
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === "office"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Building size={15} />
              <span>Office Staff (13)</span>
            </button>

            <button
              onClick={() => setActiveTab("tamil")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === "tamil"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <HardHat size={15} />
              <span>Tamil Site Labours (64)</span>
            </button>

            <button
              onClick={() => setActiveTab("hindi")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === "hindi"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Truck size={15} />
              <span>Hindi Crew (5)</span>
            </button>

            <button
              onClick={() => setActiveTab("contractor")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === "contractor"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Users2 size={15} />
              <span>Contractor Teams (6)</span>
            </button>
          </div>

          {/* Date Picker, View Mode Toggle & Search */}
          <div className="flex flex-wrap items-center gap-3">
            {activeTab !== "contractor" && (
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setViewMode("daily")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    viewMode === "daily" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                >
                  <Clock size={13} />
                  <span>Daily Quick-Mark</span>
                </button>
                <button
                  onClick={() => setViewMode("monthly")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    viewMode === "monthly" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                >
                  <CalendarDays size={13} />
                  <span>Monthly Muster Grid</span>
                </button>
              </div>
            )}

            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold">
                <Calendar size={14} className="text-blue-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedMonth(e.target.value.substring(0, 7));
                  }}
                  className="bg-transparent border-none text-slate-800 dark:text-slate-100 font-bold focus:outline-hidden text-xs"
                />
              </div>

              {/* Prev / Next Day Fast Switchers */}
              <button
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split("T")[0]);
                }}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 transition"
                title="Previous Day"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split("T")[0]);
                }}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 transition"
                title="Next Day"
              >
                <ChevronRight size={15} />
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
                  onClick={() => setCompanyUnitFilter("ALL")}
                  className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                    companyUnitFilter === "ALL" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                >
                  All (13)
                </button>
                <button
                  onClick={() => setCompanyUnitFilter("STANDARD_ROOFS")}
                  className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                    companyUnitFilter === "STANDARD_ROOFS" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Standard Roofs (10)
                </button>
                <button
                  onClick={() => setCompanyUnitFilter("INVI_CREATION")}
                  className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                    companyUnitFilter === "INVI_CREATION" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Invi Creation (3)
                </button>
              </div>
            )}

            {/* Instant Search Bar */}
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff, labourer ID, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick 1-Click Operations */}
          <div className="flex items-center gap-2">
            {activeTab !== "contractor" && viewMode === "daily" && (
              <>
                <button
                  onClick={handleMarkAllPresent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                >
                  <CheckCircle2 size={13} />
                  <span>Mark All Present</span>
                </button>

                {(activeTab === "tamil" || activeTab === "hindi") && (
                  <button
                    onClick={handleCopyYesterdaySites}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition shadow-2xs"
                    title="Copy yesterday's site locations to today"
                  >
                    <Copy size={13} />
                    <span>Copy Yesterday's Sites</span>
                  </button>
                )}
              </>
            )}

            <Link
              href="/labour"
              className="flex items-center gap-1 text-slate-500 hover:text-blue-600 font-bold text-xs ml-2"
            >
              <span>Workforce KYC Master &rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE SUB-TAB CONTENT SCREENS */}
      {activeTab === "contractor" ? (
        /* ================= TAB 4: CONTRACTOR TEAM DAILY LOG ================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users2 className="text-amber-500" size={16} />
                Contractor Teams Daily Site Logs ({selectedMonth})
              </h3>
              <p className="text-xs text-slate-500">
                Log sheets for Nandeeshwaran Team, Contractor Sakthi, Prashop Team, Monier Suresh, Suthish Team, and Hydarali Team
              </p>
            </div>

            <button
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
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
                            className="text-xs font-bold text-blue-600 hover:underline"
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
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="text-blue-600" size={16} />
                Daily Attendance & Deployment Sheet • {selectedDate}
              </h3>
              <p className="text-xs text-slate-500">
                1-Click status pills [P] Present • [H] Half-Day • [A] Absent • [L] Leave
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
                  <th className="py-3 px-3">ID & Employee</th>
                  <th className="py-3 px-3">Role / Designation</th>
                  {activeTab === "office" && <th className="py-3 px-3">Company Unit</th>}
                  {activeTab !== "office" && <th className="py-3 px-3">Site Location</th>}
                  {activeTab !== "office" && <th className="py-3 px-3 text-right">Daily Advance (₹)</th>}
                  {activeTab === "office" && <th className="py-3 px-3">In Time</th>}
                  {activeTab === "office" && <th className="py-3 px-3">Out Time</th>}
                  <th className="py-3 px-3 text-center">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tabEmployees.map((emp) => {
                  const key = `${emp.id}_${selectedDate}`;
                  const att = emp.attendances.find((a) => a.date.split("T")[0] === selectedDate);
                  const draft = attendanceDrafts[key] || {};
                  const currentStatus = draft.status || att?.status || "A";
                  const inTimeVal = draft.inTime ?? att?.inTime ?? "";
                  const outTimeVal = draft.outTime ?? att?.outTime ?? "";
                  const siteVal = draft.siteName ?? att?.siteName ?? (activeTab === "office" ? "Headquarters Office" : "SSM School");
                  const advanceVal = draft.dailyAdvance ?? att?.dailyAdvance ?? 0;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      {/* Name & ID */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
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
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {emp.name}
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
                        <td className="py-3 px-3">
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
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="07:00 PM"
                            value={outTimeVal}
                            onChange={(e) => handleTimeChange(emp.id, "outTime", e.target.value)}
                            className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-center focus:outline-hidden focus:border-blue-500 tabular-nums"
                          />
                        </td>
                      )}

                      {/* 1-Click Status Pill Group */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                          {/* Present */}
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(emp.id, "P", siteVal)}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                              currentStatus === "P"
                                ? "bg-emerald-600 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-emerald-600"
                            }`}
                            title="Present (Full Day)"
                          >
                            P
                          </button>

                          {/* Half Day */}
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(emp.id, "H", siteVal)}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                              currentStatus === "H"
                                ? "bg-amber-500 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-amber-500"
                            }`}
                            title="Half Day"
                          >
                            H
                          </button>

                          {/* Absent */}
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(emp.id, "A", siteVal)}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                              currentStatus === "A"
                                ? "bg-rose-600 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-rose-600"
                            }`}
                            title="Absent"
                          >
                            A
                          </button>

                          {/* Leave / Sunday (for Office) */}
                          {activeTab === "office" && (
                            <button
                              type="button"
                              onClick={() => handleMarkStatus(emp.id, "L", siteVal)}
                              className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                                currentStatus === "L"
                                  ? "bg-slate-600 text-white shadow-xs scale-105"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                              }`}
                              title="Leave / Sunday Holiday"
                            >
                              L
                            </button>
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
        /* ================= MONTHLY MATRIX GRID (EXCEL 1..30 CELL VIEW) ================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CalendarDays className="text-blue-600" size={16} />
                Monthly Attendance & Muster Grid ({selectedMonth})
              </h3>
              <p className="text-xs text-slate-500">
                Click any cell to toggle: <span className="text-emerald-600 font-bold">P</span> &rarr; <span className="text-amber-500 font-bold">H</span> &rarr; <span className="text-rose-600 font-bold">A</span> &rarr; <span className="text-slate-500 font-bold">L</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> P (Present)
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> H (Half Day)
                </span>
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> A (Absent)
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-600" /> L (Leave/Sun)
                </span>
              </div>

              <button
                onClick={handleExportMusterExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-2xs"
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
                  <th className="py-2.5 px-3 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 min-w-[150px]">
                    Employee
                  </th>
                  <th className="py-2.5 px-2 text-center">P</th>
                  <th className="py-2.5 px-2 text-center">H</th>
                  <th className="py-2.5 px-2 text-center">A</th>
                  <th className="py-2.5 px-2 text-center">L</th>
                  {daysInMonth.map((d) => (
                    <th
                      key={d.dayNum}
                      className={`py-2 px-1 text-center min-w-[28px] ${
                        d.isSunday
                          ? "bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black"
                          : d.fullDate === selectedDate
                          ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold"
                          : ""
                      }`}
                    >
                      <div>{d.dayNum}</div>
                      <div className="text-[8px] font-normal opacity-70">{d.dayName}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tabEmployees.map((emp) => {
                  let pTotal = 0;
                  let hTotal = 0;
                  let aTotal = 0;
                  let lTotal = 0;

                  // Pre-calculate sums
                  daysInMonth.forEach((d) => {
                    const att = emp.attendances.find((a) => a.date.split("T")[0] === d.fullDate);
                    const status = att ? att.status : d.isSunday ? "L" : "A";
                    if (status === "P") pTotal++;
                    else if (status === "H") hTotal++;
                    else if (status === "A") aTotal++;
                    else if (status === "L") lTotal++;
                  });

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      {/* Fixed Left Column */}
                      <td className="py-2 px-3 sticky left-0 bg-white dark:bg-slate-900 z-10 font-bold border-r border-slate-100 dark:border-slate-800">
                        <div className="truncate max-w-[140px] text-slate-800 dark:text-slate-200">
                          {emp.name}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {emp.employeeCode}
                        </span>
                      </td>

                      {/* Summary Counts */}
                      <td className="py-2 px-2 text-center font-bold text-emerald-600 tabular-nums">{pTotal}</td>
                      <td className="py-2 px-2 text-center font-bold text-amber-500 tabular-nums">{hTotal}</td>
                      <td className="py-2 px-2 text-center font-bold text-rose-500 tabular-nums">{aTotal}</td>
                      <td className="py-2 px-2 text-center font-bold text-slate-400 tabular-nums">{lTotal}</td>

                      {/* 1..30 Clickable Day Cells */}
                      {daysInMonth.map((d) => {
                        const att = emp.attendances.find((a) => a.date.split("T")[0] === d.fullDate);
                        const status = att ? att.status : d.isSunday ? "L" : "A";

                        return (
                          <td
                            key={d.dayNum}
                            onClick={() => {
                              // Cycle status: P -> H -> A -> L -> P
                              const nextStatus = status === "P" ? "H" : status === "H" ? "A" : status === "A" ? "L" : "P";
                              setSelectedDate(d.fullDate);
                              handleMarkStatus(emp.id, nextStatus as any, att?.siteName || undefined);
                            }}
                            className={`py-1.5 px-0.5 text-center font-black cursor-pointer transition select-none ${
                              d.isSunday
                                ? "bg-slate-100/60 dark:bg-slate-800/60"
                                : d.fullDate === selectedDate
                                ? "ring-2 ring-blue-500/50"
                                : ""
                            }`}
                            title={`${emp.name} - ${d.fullDate}: ${status} ${att?.siteName ? `(${att.siteName})` : ""}`}
                          >
                            <span
                              className={`w-6 h-6 rounded-md inline-flex items-center justify-center text-[10.5px] transition ${
                                status === "P"
                                  ? "bg-emerald-500 text-white"
                                  : status === "H"
                                  ? "bg-amber-400 text-white"
                                  : status === "A"
                                  ? "bg-rose-500 text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL: LOG CONTRACTOR TEAM DAILY SITE WORK */}
      {showContractorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users2 className="text-amber-500" size={18} />
                {contractorForm.id ? "Edit Contractor Work Log" : "New Contractor Team Daily Log"}
              </h3>
              <button
                onClick={() => setShowContractorModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                  <option value="Prashop Team">Prashop Team (Steel PEB Erection)</option>
                  <option value="Monier Suresh Team">Monier Suresh Team (Hospital & Sheds)</option>
                  <option value="Suthish Team">Suthish Team (Roofing)</option>
                  <option value="Hydarali Team">Hydarali Team (Heavy Flashing)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={contractorForm.date}
                    onChange={(e) => setContractorForm({ ...contractorForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Number of Labours</label>
                  <input
                    type="number"
                    min="0"
                    value={contractorForm.headcount}
                    onChange={(e) => setContractorForm({ ...contractorForm, headcount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden focus:border-blue-500 tabular-nums"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Site Location</label>
                <input
                  type="text"
                  placeholder="e.g. Ravichandran Chennai, Arunprasad Uthukuli"
                  value={contractorForm.siteName}
                  onChange={(e) => setContractorForm({ ...contractorForm, siteName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status of the Site</label>
                <select
                  value={contractorForm.siteWorkStatus}
                  onChange={(e) => setContractorForm({ ...contractorForm, siteWorkStatus: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Fabrication Work">Fabrication Work</option>
                  <option value="Purlin work Welding">Purlin work Welding</option>
                  <option value="Sheeting">Sheeting</option>
                  <option value="Rain season">Rain season (Weather Standby)</option>
                  <option value="Absent / No Work">Absent / No Work</option>
                  <option value="Active Work">Active Work</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Worker Breakdown (Optional Notes)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajkumar-F, Mani-Half day, Selvam-Half day"
                  value={contractorForm.workerBreakdown}
                  onChange={(e) => setContractorForm({ ...contractorForm, workerBreakdown: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowContractorModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
                >
                  Save Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. UNIVERSAL EXCEL IMPORT MODAL */}
      {showImportModal && (
        <ExcelImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          moduleName="workforce_attendance"
          templateColumns={[
            { key: "EmpId", label: "EmpId (e.g. SR001, LAB-20001)", required: true },
            { key: "Date", label: "Date (YYYY-MM-DD)", required: true },
            { key: "Status", label: "Status (P, H, A, L)", required: true },
            { key: "InTime", label: "In Time (e.g. 09:00 AM)" },
            { key: "OutTime", label: "Out Time (e.g. 07:00 PM)" },
            { key: "SiteName", label: "Site Location (e.g. SSM School)" },
            { key: "DailyAdvance", label: "Daily Advance (₹)" },
          ]}
          onImportComplete={() => {
            setShowImportModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
