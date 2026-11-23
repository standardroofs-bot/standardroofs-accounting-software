"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Send,
  Building,
  Briefcase,
  Layers,
  FileText,
  Shield,
  HelpCircle,
  X,
  Smartphone,
  Check,
  AlertTriangle,
  Flame,
  Sunrise,
  Sunset,
  ArrowRight,
  Hourglass,
  CalendarCheck2,
  Inbox,
  Coffee,
  FileUp,
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";

interface CalendarDay {
  dayNum: number;
  date: string;
  dayName: string;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  status: string;
  inTime: string | null;
  outTime: string | null;
  permissionSlot: "MORNING" | "EVENING" | null;
  permissionTime: string | null;
  permissionNote: string | null;
  otHours: number;
  otTimeRange: string | null;
  otReason: string | null;
  workNotes: string | null;
}

interface LeaveRequestItem {
  id: string;
  leaveCategory: string;
  dayType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const AVAILABLE_YEARS = [2025, 2026, 2027, 2028, 2029, 2030];

export default function MyAttendancePage() {
  const [activeTab, setActiveTab] = useState<"home" | "requests" | "calendar">("home");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(10); // 0-indexed: 10 = Nov
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Request Modals
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [requestModalType, setRequestModalType] = useState<"leave" | "permission" | "general">("leave");
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);

  // Selected Day Detail Modal for Calendar
  const [selectedDayDetail, setSelectedDayDetail] = useState<CalendarDay | null>(null);

  // Filter for requests tab
  const [requestFilter, setRequestFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  // Form states
  const [leaveCategory, setLeaveCategory] = useState<string>("PLANNED");
  const [leaveDayType, setLeaveDayType] = useState<string>("FULL_DAY");
  const [permissionSlot, setPermissionSlot] = useState<"MORNING" | "EVENING">("MORNING");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState<string>("");
  const [generalCategory, setGeneralCategory] = useState<string>("Late Login Notice");

  const selectedMonthStr = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, "0")}`;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchMyAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/my-attendance?month=${selectedMonthStr}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        showToast(json.error || "Failed to load personal attendance.");
      }
    } catch (err) {
      console.error(err);
      showToast("Network connection error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAttendance();
  }, [selectedMonthStr]);

  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      if (selectedYear > 2025) {
        setSelectedYear(selectedYear - 1);
        setSelectedMonthIndex(11);
      }
    } else {
      setSelectedMonthIndex(selectedMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      if (selectedYear < 2030) {
        setSelectedYear(selectedYear + 1);
        setSelectedMonthIndex(0);
      }
    } else {
      setSelectedMonthIndex(selectedMonthIndex + 1);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const openQuickModal = (type: "leave" | "permission" | "general") => {
    setRequestModalType(type);
    setReason("");
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);
    if (type === "permission") {
      setPermissionSlot("MORNING");
    }
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmittingRequest(true);
    try {
      let payload: any = {
        startDate,
        endDate: requestModalType === "permission" ? startDate : endDate,
        reason: reason.trim(),
      };

      if (requestModalType === "leave") {
        payload.leaveCategory = leaveCategory;
        payload.dayType = leaveDayType;
      } else if (requestModalType === "permission") {
        payload.leaveCategory = "PERMISSION_1H";
        payload.dayType = permissionSlot; // MORNING or EVENING
      } else {
        payload.leaveCategory = "GENERAL_REQUEST";
        payload.dayType = "FULL_DAY";
        payload.reason = reason.trim() ? `[${generalCategory}] ${reason.trim()}` : `[${generalCategory}]`;
      }

      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resJson = await res.json();

      if (resJson.success) {
        showToast("Request submitted successfully to HR!");
        setShowRequestModal(false);
        setReason("");
        fetchMyAttendance();
        setActiveTab("requests");
      } else {
        alert(resJson.error || "Failed to submit request.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Network error submitting request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleExportMyExcel = () => {
    if (!data || !data.calendarDays) return;
    const rows = data.calendarDays.map((d: CalendarDay) => ({
      Date: d.date,
      Day: d.dayName,
      Status: d.status,
      "In Time": d.inTime || "—",
      "Out Time": d.outTime || "—",
      "1-Hr Permission Slot": d.permissionSlot || "—",
      "Permission Time Window": d.permissionTime || "—",
      "Permission Note": d.permissionNote || "—",
      "OT Hours": d.otHours || 0,
      "OT Time Window": d.otTimeRange || "—",
      "OT Reason": d.otReason || "—",
      "Holiday / Notes": d.holidayName || d.workNotes || "—",
    }));

    exportToExcel(
      rows,
      `My_Attendance_${data.employee?.employeeCode || "SR"}_${selectedMonthStr}`,
      "AttendanceSlip"
    );
  };

  const emp = data?.employee;
  const scorecard = data?.scorecard;
  const leaveRequests: LeaveRequestItem[] = data?.leaveRequests || [];

  const pendingRequestsCount = leaveRequests.filter((r) => r.status === "PENDING").length;

  const filteredRequests = leaveRequests.filter((r) => {
    if (requestFilter === "ALL") return true;
    return r.status === requestFilter;
  });

  if (emp && emp.companyUnit === "INVI_CREATION") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white text-center">
        <div className="max-w-md p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Access Restricted</h2>
            <p className="text-xs text-slate-400 mt-1">
              The Employee Self-Service (ESS) Portal is exclusively reserved for Standard Roofs office employees (SR001–SR010).
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans pb-24">
      {/* 1. Mobile-First Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
              {emp ? emp.name.charAt(0) : "SR"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate max-w-[180px] sm:max-w-none">
                  {emp ? emp.name : "My Attendance"}
                </h1>
                {emp?.employeeCode && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                    {emp.employeeCode}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                {emp?.designation || emp?.role || "Office Staff"} &middot;{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {emp?.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PwaInstallPrompt variant="compact" label="Install App" />
            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 transition cursor-pointer flex items-center gap-1.5"
              title="Logout"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* 2. Top Segmented Navigation Tabs */}
        <div className="max-w-4xl mx-auto px-4 pb-2">
          <nav className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "home"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Smartphone size={14} />
              <span>Home & Requests</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("requests")}
              className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "requests"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Inbox size={14} />
              <span>My Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-black text-[10px] animate-pulse">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "calendar"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Calendar size={14} />
              <span>Calendar</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles size={14} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* ======================================================== */}
        {/* TAB 1: HOME & QUICK REQUESTS                             */}
        {/* ======================================================== */}
        {activeTab === "home" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* PWA Install Banner (If not running standalone) */}
            <PwaInstallPrompt variant="banner" />

            {/* 4 KPIs */}
            {scorecard ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* KPI 1: Days Worked */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900/60 p-3.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1 truncate">
                    <CalendarCheck2 size={12} /> Days Worked
                  </span>
                  <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1 tabular-nums">
                    {scorecard.netPayableDays}
                    <span className="text-xs font-semibold text-slate-400"> / {scorecard.scheduledWorkingDays}d</span>
                  </div>
                  <div className="w-full bg-blue-100 dark:bg-blue-950 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, scorecard.attendancePercentage)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 block mt-1">
                    {scorecard.attendancePercentage}% Efficiency
                  </span>
                </div>

                {/* KPI 2: 1-Hr Permissions */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 flex items-center gap-1 truncate">
                    <Clock size={12} /> 1-Hr Permissions
                  </span>
                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 tabular-nums">
                    {scorecard.p1hCount}
                    <span className="text-xs font-semibold text-slate-400"> used</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[10.5px] text-slate-500 font-medium">
                    <span className="px-1.5 py-0.2 rounded-md bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold">
                      {scorecard.mrgPermCount}M
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold">
                      {scorecard.evePermCount}E
                    </span>
                  </div>
                </div>

                {/* KPI 3: Leaves Taken */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 flex items-center gap-1 truncate">
                    <Coffee size={12} /> Leaves Taken
                  </span>
                  <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1 tabular-nums">
                    {scorecard.plCount + scorecard.upCount}
                    <span className="text-xs font-semibold text-slate-400"> days</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 mt-2">
                    PL (Paid): <strong className="text-teal-600">{scorecard.plCount}</strong> &middot; UP:{" "}
                    <strong className="text-rose-500">{scorecard.upCount}</strong>
                  </p>
                </div>

                {/* KPI 4: Pending Approvals */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 p-3.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1 truncate">
                    <Hourglass size={12} /> Pending Requests
                  </span>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                    {pendingRequestsCount}
                    <span className="text-xs font-semibold text-slate-400"> review</span>
                  </div>
                  <span className="text-[10.5px] text-slate-400 block mt-2">
                    {pendingRequestsCount === 0 ? "All requests processed" : "Awaiting HR review"}
                  </span>
                </div>
              </div>
            ) : null}

            {/* 3 Quick 1-Tap Action Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Quick Actions & Requests
                </h3>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                  1-Tap Instant Submit
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Action Card A: Apply Leave */}
                <div
                  onClick={() => openQuickModal("leave")}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Calendar size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      PL / UP / Sick
                    </span>
                  </div>
                  <div className="mt-3">
                    <strong className="text-sm font-black text-slate-900 dark:text-slate-100 block group-hover:text-blue-600 transition">
                      Apply Leave
                    </strong>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Planned paid leave (PL), emergency sick leave, or unpaid leave (UP)
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <span>Request Leave</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Action Card B: Request 1-Hr Permission */}
                <div
                  onClick={() => openQuickModal("permission")}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                      <Clock size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                      1.0 Day Credit
                    </span>
                  </div>
                  <div className="mt-3">
                    <strong className="text-sm font-black text-slate-900 dark:text-slate-100 block group-hover:text-sky-600 transition">
                      1-Hr Permission
                    </strong>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Morning (9–10 AM) or Evening (6:30–7:30 PM) with full-day attendance credit
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400">
                    <span>Select Slot</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Action Card C: General / Shift Request */}
                <div
                  onClick={() => openQuickModal("general")}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <FileText size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      General Log
                    </span>
                  </div>
                  <div className="mt-3">
                    <strong className="text-sm font-black text-slate-900 dark:text-slate-100 block group-hover:text-indigo-600 transition">
                      General / Shift Request
                    </strong>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Submit late login notice, site duty assignment, or overtime note to HR
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <span>Submit Note</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Pending Requests Snippet */}
            {pendingRequestsCount > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Hourglass size={14} className="text-amber-600 animate-spin" />
                    <span>{pendingRequestsCount} Request(s) Awaiting HR Review</span>
                  </span>
                  <button
                    onClick={() => setActiveTab("requests")}
                    className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                  >
                    View Status &rarr;
                  </button>
                </div>
                <div className="divide-y divide-amber-200/60 dark:divide-amber-800/40 text-xs">
                  {leaveRequests
                    .filter((r) => r.status === "PENDING")
                    .slice(0, 2)
                    .map((req) => (
                      <div key={req.id} className="py-2 flex items-center justify-between">
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 font-bold">
                            {req.leaveCategory === "PERMISSION_1H"
                              ? `1-Hr Permission (${req.dayType === "EVENING" ? "Evening" : "Morning"})`
                              : req.leaveCategory === "GENERAL_REQUEST"
                              ? "General / Shift Request"
                              : req.leaveCategory === "PLANNED"
                              ? "Planned Leave"
                              : req.leaveCategory === "UNPLANNED"
                              ? "Unplanned Leave"
                              : req.leaveCategory === "SICK"
                              ? "Sick Leave"
                              : req.leaveCategory === "EMERGENCY"
                              ? "Emergency Leave"
                              : "Leave Request"}
                          </strong>
                          <p className="text-[11px] text-slate-500 italic truncate max-w-xs sm:max-w-md">
                            {req.reason ? `"${req.reason}"` : <span className="text-slate-400 not-italic">No reason provided (Optional)</span>}
                          </p>
                        </div>
                        <span className="font-mono text-[10.5px] text-slate-500 shrink-0">
                          {req.startDate?.split("T")[0]}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MY REQUEST STATUS & HISTORY                       */}
        {/* ======================================================== */}
        {activeTab === "requests" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header & Filter Row */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Inbox size={16} className="text-blue-600" />
                  <span>My Submitted Requests & Approvals</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Track live approval status from HR & view feedback notes
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setRequestFilter(st)}
                    className={`py-1 px-2.5 rounded-lg transition cursor-pointer text-[11px] ${
                      requestFilter === st
                        ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Request Cards */}
            {filteredRequests.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <Inbox size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No requests found
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You haven't submitted any requests in this status category.
                </p>
                <button
                  type="button"
                  onClick={() => openQuickModal("leave")}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  + Submit a Request
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req) => {
                  const isApproved = req.status === "APPROVED";
                  const isRejected = req.status === "REJECTED";
                  const isPending = req.status === "PENDING";

                  if (emp && emp.companyUnit === "INVI_CREATION") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white text-center">
        <div className="max-w-md p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Access Restricted</h2>
            <p className="text-xs text-slate-400 mt-1">
              The Employee Self-Service (ESS) Portal is exclusively reserved for Standard Roofs office employees (SR001–SR010).
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
                    <div
                      key={req.id}
                      className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border transition shadow-2xs space-y-3 ${
                        isApproved
                          ? "border-emerald-200 dark:border-emerald-900/50"
                          : isRejected
                          ? "border-rose-200 dark:border-rose-900/50"
                          : "border-amber-200 dark:border-amber-900/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                              {req.leaveCategory === "PERMISSION_1H"
                                ? `1-Hour Permission (${req.dayType === "EVENING" ? "Evening 6:30–7:30 PM" : "Morning 9–10 AM"})`
                                : req.leaveCategory === "GENERAL_REQUEST"
                                ? "General / Shift Request"
                                : req.leaveCategory === "PLANNED"
                                ? "Planned Leave"
                                : req.leaveCategory === "UNPLANNED"
                                ? "Unplanned Leave"
                                : req.leaveCategory === "SICK"
                                ? "Sick Leave"
                                : req.leaveCategory === "EMERGENCY"
                                ? "Emergency Leave"
                                : "Leave Request"}
                            </strong>
                          </div>
                          <span className="font-mono text-xs text-slate-500 block mt-0.5">
                            {req.startDate?.split("T")[0]}
                            {req.startDate?.split("T")[0] !== req.endDate?.split("T")[0]
                              ? ` to ${req.endDate?.split("T")[0]}`
                              : ""}{" "}
                            ({req.leaveCategory === "PERMISSION_1H" ? "1-Hour" : `${req.totalDays || 1} day(s)`})
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10.5px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : isRejected
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse"
                          }`}
                        >
                          {isApproved && <CheckCircle2 size={12} />}
                          {isRejected && <XCircle size={12} />}
                          {isPending && <Hourglass size={12} />}
                          <span>{isPending ? "Pending Review" : req.status}</span>
                        </span>
                      </div>

                      {/* Reason */}
                      <div className="text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">
                          My Note / Reason
                        </span>
                        <p className="italic">"{req.reason}"</p>
                      </div>

                      {/* HR Review Note / Timestamp */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>Submitted on {new Date(req.createdAt).toLocaleDateString()}</span>
                        {isApproved && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <Check size={12} /> Approved by {req.reviewedBy || "HR Admin"}
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            HR Note: {req.rejectionNote || "Rejected"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: MONTHLY CALENDAR MATRIX                           */}
        {/* ======================================================== */}
        {activeTab === "calendar" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Multi-Year & Month Switcher Strip */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Year Switcher */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  {AVAILABLE_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                {/* Month Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handlePrevMonth}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <select
                    value={selectedMonthIndex}
                    onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                    className="bg-transparent font-bold text-xs px-2 text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleNextMonth}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportMyExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                  title="Export Attendance Slip (.xlsx)"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <span>Export (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Status Legend Strip */}
            <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-slate-100/70 dark:bg-slate-900 rounded-xl text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> P (Present 1.0)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> 1H·M / 1H·E (1-Hr Perm)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> H (Half-Day 0.5)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> PL (Planned Paid)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> A / UP (Absent 0.0)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> L (Sunday Off)
              </span>
            </div>

            {/* Day-by-Day Interactive Grid */}
            {loading ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs text-slate-500 font-bold">Loading monthly calendar...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {data?.calendarDays?.map((d: CalendarDay) => {
                  const isPresent = d.status === "P";
                  const is1H = d.status === "1H";
                  const isHalf = d.status === "H";
                  const isPL = d.status === "PL";
                  const isUP = d.status === "UP";
                  const isAbsent = d.status === "A";
                  const isSunday = d.isSunday;
                  const isHoliday = d.isHoliday;

                  let badgeColor = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
                  let statusLabel = d.status;

                  if (isPresent) {
                    badgeColor = "bg-emerald-500 text-white font-extrabold shadow-2xs";
                    statusLabel = "P";
                  } else if (is1H) {
                    badgeColor = "bg-sky-500 text-white font-extrabold shadow-2xs";
                    statusLabel = d.permissionSlot === "EVENING" ? "1H·E" : "1H·M";
                  } else if (isHalf) {
                    badgeColor = "bg-amber-500 text-white font-bold shadow-2xs";
                    statusLabel = "H";
                  } else if (isPL) {
                    badgeColor = "bg-teal-600 text-white font-bold shadow-2xs";
                    statusLabel = "PL";
                  } else if (isUP) {
                    badgeColor = "bg-slate-600 text-white font-bold";
                    statusLabel = "UP";
                  } else if (isAbsent) {
                    badgeColor = "bg-rose-500 text-white font-bold";
                    statusLabel = "A";
                  } else if (isSunday) {
                    badgeColor = "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                    statusLabel = "L";
                  }

                  if (emp && emp.companyUnit === "INVI_CREATION") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white text-center">
        <div className="max-w-md p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Access Restricted</h2>
            <p className="text-xs text-slate-400 mt-1">
              The Employee Self-Service (ESS) Portal is exclusively reserved for Standard Roofs office employees (SR001–SR010).
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
                    <div
                      key={d.dayNum}
                      onClick={() => setSelectedDayDetail(d)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between h-24 hover:ring-2 hover:ring-blue-400 bg-white dark:bg-slate-900 ${
                        isSunday
                          ? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                      title="Click to view full day details"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                          {d.dayNum}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          {d.dayName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-black ${badgeColor}`}
                        >
                          {statusLabel}
                        </span>

                        {d.otHours > 0 && (
                          <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.2 rounded-md border border-amber-200 dark:border-amber-800">
                            +{d.otHours}h
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: QUICK REQUEST POPUP (Leave, 1H, General)         */}
      {/* ======================================================== */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold ${
                    requestModalType === "leave"
                      ? "bg-blue-600"
                      : requestModalType === "permission"
                      ? "bg-sky-600"
                      : "bg-indigo-600"
                  }`}
                >
                  {requestModalType === "leave" && <Calendar size={18} />}
                  {requestModalType === "permission" && <Clock size={18} />}
                  {requestModalType === "general" && <FileText size={18} />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {requestModalType === "leave" && "Apply for Leave"}
                    {requestModalType === "permission" && "Request 1-Hour Permission"}
                    {requestModalType === "general" && "Submit General / Shift Request"}
                  </h3>
                  <p className="text-[10.5px] text-slate-500">
                    Auto-synced with HR Attendance Matrix upon approval
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
                title="Close"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-3.5 text-xs">
              {/* Type 1: Leave specific controls */}
              {requestModalType === "leave" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Leave Category *
                      </label>
                      <select
                        value={leaveCategory}
                        onChange={(e) => setLeaveCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      >
                        <option value="PLANNED">Planned Leave</option>
                        <option value="UNPLANNED">Unplanned Leave</option>
                        <option value="SICK">Sick Leave</option>
                        <option value="EMERGENCY">Emergency Leave</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Duration *
                      </label>
                      <select
                        value={leaveDayType}
                        onChange={(e) => setLeaveDayType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      >
                        <option value="FULL_DAY">Full-Day (1.0)</option>
                        <option value="HALF_DAY">Half-Day (0.5)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        End Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Type 2: 1-Hr Permission controls */}
              {requestModalType === "permission" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Permission Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Choose Time Window *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPermissionSlot("MORNING")}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          permissionSlot === "MORNING"
                            ? "border-sky-500 bg-sky-50 dark:bg-sky-950/60 ring-2 ring-sky-400"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-sky-600 dark:text-sky-400">
                          <Sunrise size={14} />
                          <span>Morning Slot</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                          09:00 AM – 10:00 AM
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPermissionSlot("EVENING")}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          permissionSlot === "EVENING"
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-950/60 ring-2 ring-purple-400"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400">
                          <Sunset size={14} />
                          <span>Evening Slot</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                          06:30 PM – 07:30 PM
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Type 3: General / Shift controls */}
              {requestModalType === "general" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Request Type *
                      </label>
                      <select
                        value={generalCategory}
                        onChange={(e) => setGeneralCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      >
                        <option value="Work Handover Note">Submit Work Handover Note</option>
                        <option value="Late Login Notice">Late Login Notice</option>
                        <option value="Overtime (OT) Log">Overtime (OT) Log</option>
                        <option value="Site Duty / WFH Request">Site Duty / WFH Request</option>
                        <option value="Punch Correction">Punch Correction</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Effective Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Common Reason Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Explanation (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    requestModalType === "permission"
                      ? "e.g. Doctor appointment, family errand (optional)"
                      : "e.g. Family function, medical checkup, personal travel (optional)"
                  }
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingRequest ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DAY DETAIL VIEW FOR CALENDAR MATRIX             */}
      {/* ======================================================== */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  {selectedDayDetail.dayName}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {selectedDayDetail.date}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
                title="Close"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <span className="font-bold text-slate-600 dark:text-slate-400">Status</span>
                <span className="px-2.5 py-0.5 rounded-full font-black text-xs uppercase bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  {selectedDayDetail.status}
                </span>
              </div>

              {selectedDayDetail.inTime && (
                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[10px] text-slate-400 block font-bold">Punch In</span>
                    <strong className="font-mono">{selectedDayDetail.inTime}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[10px] text-slate-400 block font-bold">Punch Out</span>
                    <strong className="font-mono">{selectedDayDetail.outTime || "—"}</strong>
                  </div>
                </div>
              )}

              {selectedDayDetail.permissionSlot && (
                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200">
                  <strong className="font-bold block">
                    1-Hour Permission ({selectedDayDetail.permissionSlot})
                  </strong>
                  <span className="font-mono text-[11px] block text-sky-700 dark:text-sky-300">
                    {selectedDayDetail.permissionTime || "Standard slot"}
                  </span>
                  {selectedDayDetail.permissionNote && (
                    <p className="text-[11px] italic mt-1">"{selectedDayDetail.permissionNote}"</p>
                  )}
                </div>
              )}

              {selectedDayDetail.otHours > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                  <strong className="font-bold block">
                    Overtime Logged: +{selectedDayDetail.otHours}h
                  </strong>
                  {selectedDayDetail.otTimeRange && (
                    <span className="font-mono text-[11px] block">{selectedDayDetail.otTimeRange}</span>
                  )}
                  {selectedDayDetail.otReason && (
                    <p className="text-[11px] italic mt-1">"{selectedDayDetail.otReason}"</p>
                  )}
                </div>
              )}

              {selectedDayDetail.holidayName && (
                <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200">
                  <strong className="font-bold block">Holiday: {selectedDayDetail.holidayName}</strong>
                </div>
              )}

              {selectedDayDetail.workNotes && !selectedDayDetail.permissionNote && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300">
                  <span className="text-[10px] text-slate-400 block font-bold">Notes</span>
                  <p className="italic">"{selectedDayDetail.workNotes}"</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayDetail(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
