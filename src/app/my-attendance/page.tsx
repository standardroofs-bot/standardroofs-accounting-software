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
  Printer,
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
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

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

export default function MyAttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-11");
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [leaveForm, setLeaveForm] = useState({
    leaveCategory: "PLANNED",
    dayType: "FULL_DAY",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchMyAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/my-attendance?month=${selectedMonth}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        showToast(json.error || "Failed to load personal attendance.");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error loading attendance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAttendance();
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prev = new Date(Date.UTC(y, m - 2, 1));
    const yStr = prev.getUTCFullYear();
    const mStr = String(prev.getUTCMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${yStr}-${mStr}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const next = new Date(Date.UTC(y, m, 1));
    const yStr = next.getUTCFullYear();
    const mStr = String(next.getUTCMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${yStr}-${mStr}`);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      window.location.href = "/login";
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.reason.trim()) {
      alert("Please provide a reason for your leave request.");
      return;
    }
    setLeaveSubmitting(true);
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaveForm),
      });
      const resJson = await res.json();
      if (resJson.success) {
        showToast("Leave application submitted successfully for HR approval!");
        setShowLeaveModal(false);
        setLeaveForm({
          leaveCategory: "PLANNED",
          dayType: "FULL_DAY",
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date().toISOString().split("T")[0],
          reason: "",
        });
        fetchMyAttendance();
      } else {
        alert(resJson.error || "Failed to submit leave request.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting leave request.");
    } finally {
      setLeaveSubmitting(false);
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
      `My_Attendance_${data.employee.employeeCode}_${selectedMonth}`,
      "AttendanceSlip"
    );
  };

  const emp = data?.employee;
  const scorecard = data?.scorecard;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans pb-16">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md">
              SR
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <span>Employee Self-Service Portal</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  ESS v2.6
                </span>
              </h1>
              <p className="text-[11px] text-slate-500">
                Attendance calendar, leave balance, OT hours & permission tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {emp && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold border border-slate-200 dark:border-slate-700">
                <User size={14} className="text-blue-600" />
                <span>{emp.name}</span>
                <span className="text-slate-400 font-mono text-[10px]">({emp.employeeCode})</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 transition cursor-pointer"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles size={14} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Employee Profile Header & Month Switcher Strip */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
              {emp ? emp.name.charAt(0) : "E"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {emp ? emp.name : "Loading Employee Profile..."}
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {emp?.employeeCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <Briefcase size={12} className="text-slate-400" />
                <span>{emp?.designation || emp?.role || "Office Staff"}</span>
                <span>•</span>
                <Building size={12} className="text-slate-400" />
                <span>{emp?.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs"}</span>
              </p>
            </div>
          </div>

          {/* Month Switcher + Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-black text-xs px-3 font-mono">
                {selectedMonth}
              </span>
              <button
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-1.5 px-4 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Apply for Leave</span>
            </button>

            <button
              onClick={handleExportMyExcel}
              className="flex items-center gap-1.5 px-3.5 h-10 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
              title="Download Monthly Attendance Slip (.xlsx)"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>

        {/* 6 Real-time Personal Attendance KPI Scorecards */}
        {scorecard && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Card 1: Net Payable Days */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900/60 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1 truncate">
                <Calendar size={12} /> Net Payable Days
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
                {scorecard.attendancePercentage}% Attendance Rate
              </span>
            </div>

            {/* Card 2: Present Days */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1 truncate">
                <CheckCircle2 size={12} /> Present Days
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {scorecard.pCount}
                <span className="text-xs font-semibold text-slate-400"> full</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Half-days: <strong>{scorecard.hCount}</strong> (0.5d)
              </p>
            </div>

            {/* Card 3: 1-Hr Permissions (Morning vs. Evening) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 flex items-center gap-1 truncate">
                <Clock size={12} /> 1-Hr Permissions
              </span>
              <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 tabular-nums">
                {scorecard.p1hCount}
                <span className="text-xs font-semibold text-slate-400"> total</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Mrg: <strong>{scorecard.mrgPermCount}</strong> • Eve: <strong>{scorecard.evePermCount}</strong>
              </p>
            </div>

            {/* Card 4: Overtime (OT) Hours */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1 truncate">
                <Clock size={12} /> Overtime (OT)
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                {scorecard.totalOTHours}
                <span className="text-xs font-semibold text-slate-400"> hrs</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-bold">
                Logged & verified
              </p>
            </div>

            {/* Card 5: Leaves Taken */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 flex items-center gap-1 truncate">
                <Layers size={12} /> Leaves Taken
              </span>
              <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1 tabular-nums">
                {scorecard.plCount + scorecard.upCount}
                <span className="text-xs font-semibold text-slate-400"> days</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                PL: <strong>{scorecard.plCount}</strong> • Unpaid: <strong>{scorecard.upCount}</strong>
              </p>
            </div>

            {/* Card 6: Sundays & Holidays */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 truncate">
                <Shield size={12} /> Sundays & Offs
              </span>
              <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 tabular-nums">
                {scorecard.sundaysCount + scorecard.holidayCount}
                <span className="text-xs font-semibold text-slate-400"> days</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {scorecard.sundaysCount} Sun • {scorecard.holidayCount} Holidays
              </p>
            </div>
          </div>
        )}

        {/* Monthly Attendance Calendar Sheet */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="text-blue-600" size={16} />
                <span>Monthly Attendance Sheet • {selectedMonth}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official biometric / HR muster record with permission slots and overtime logs
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white">P: Present</span>
              <span className="px-2 py-0.5 rounded-md bg-sky-500 text-white">1H·M: Mrg Perm</span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-600 text-white">1H·E: Eve Perm</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-400 text-white">H: Half-Day</span>
              <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white">PL: Paid Leave</span>
              <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white">A: Absent</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200">L: Sunday</span>
            </div>
          </div>

          {/* Responsive Daily Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10.5px] uppercase font-bold text-slate-400">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Day</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">In Time</th>
                  <th className="py-2.5 px-3 text-center">Out Time</th>
                  <th className="py-2.5 px-3">1-Hr Permission</th>
                  <th className="py-2.5 px-3">Overtime (OT)</th>
                  <th className="py-2.5 px-3">Work / Holiday Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.calendarDays?.map((d: CalendarDay) => {
                  const isPresent = d.status === "P";
                  const is1H = d.status === "1H";
                  const isHalf = d.status === "H";
                  const isPL = d.status === "PL";
                  const isUP = d.status === "UP";
                  const isAbsent = d.status === "A";
                  const isLeave = d.status === "L";

                  return (
                    <tr
                      key={d.date}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                        d.isSunday ? "bg-slate-50/50 dark:bg-slate-900/50 font-medium" : ""
                      }`}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {d.date}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`font-bold ${d.isSunday ? "text-rose-500" : "text-slate-600 dark:text-slate-300"}`}>
                          {d.dayName}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[42px] h-6 px-1.5 rounded-lg font-black text-[10px] transition ${
                            isPresent
                              ? "bg-emerald-500 text-white shadow-2xs"
                              : is1H
                              ? d.permissionSlot === "EVENING"
                                ? "bg-cyan-600 text-white shadow-2xs font-extrabold"
                                : "bg-sky-500 text-white shadow-2xs font-extrabold"
                              : isHalf
                              ? "bg-amber-400 text-white shadow-2xs"
                              : isPL
                              ? "bg-teal-600 text-white shadow-2xs"
                              : isUP
                              ? "bg-slate-600 text-white shadow-2xs"
                              : isAbsent
                              ? "bg-rose-500 text-white shadow-2xs"
                              : isLeave
                              ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                              : "bg-slate-100 text-slate-400 border border-dashed border-slate-300"
                          }`}
                        >
                          {is1H
                            ? d.permissionSlot === "EVENING"
                              ? "1H·E"
                              : "1H·M"
                            : d.status || "—"}
                        </span>
                      </td>

                      {/* In Time */}
                      <td className="py-2 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                        {d.inTime || (d.isSunday ? "—" : "09:00 AM")}
                      </td>

                      {/* Out Time */}
                      <td className="py-2 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                        {d.outTime || (d.isSunday ? "—" : "07:00 PM")}
                      </td>

                      {/* 1-Hr Permission */}
                      <td className="py-2 px-3">
                        {is1H ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold text-[10px] font-mono">
                              {d.permissionSlot === "EVENING" ? "Evening (06:30-07:30)" : "Morning (09:00-10:00)"}
                            </span>
                            {d.permissionNote && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[140px]" title={d.permissionNote}>
                                {d.permissionNote}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Overtime (OT) */}
                      <td className="py-2 px-3">
                        {d.otHours > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black text-[10px] font-mono">
                              +{d.otHours}h OT
                            </span>
                            {d.otTimeRange && (
                              <span className="text-[10px] font-mono text-slate-400">
                                ({d.otTimeRange})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Work / Holiday Note */}
                      <td className="py-2 px-3 text-slate-500">
                        {d.holidayName ? (
                          <span className="font-bold text-teal-600 dark:text-teal-400">
                            🎉 {d.holidayName}
                          </span>
                        ) : (
                          d.workNotes || (d.isSunday ? "Weekly Off" : "—")
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* My Leave Applications & Approval Status Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="text-blue-600" size={16} />
                <span>My Leave Applications & Requests</span>
              </h3>
              <p className="text-xs text-slate-500">
                Directly reviewed by HR / Super Admin. Approved leaves auto-mark your monthly attendance.
              </p>
            </div>

            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>New Request</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10.5px] uppercase font-bold text-slate-400">
                  <th className="py-2.5 px-3">Date Applied</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Leave Period</th>
                  <th className="py-2.5 px-3 text-center">Total Days</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Review Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.leaveRequests?.length > 0 ? (
                  data.leaveRequests.map((req: LeaveRequestItem) => (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {req.createdAt.split("T")[0]}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {req.leaveCategory} LEAVE
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {req.startDate.split("T")[0]} → {req.endDate.split("T")[0]}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono">
                        {Number(req.totalDays)}d
                      </td>
                      <td className="py-2.5 px-3 max-w-[200px] truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black text-[10px] ${
                            req.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : req.status === "REJECTED"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
                          }`}
                        >
                          {req.status === "APPROVED" && <CheckCircle2 size={12} />}
                          {req.status === "REJECTED" && <XCircle size={12} />}
                          {req.status === "PENDING" && <Clock size={12} />}
                          <span>{req.status}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {req.rejectionNote || (req.reviewedBy ? `Approved by ${req.reviewedBy}` : "Under HR review")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No leave requests submitted yet. Click <strong>+ Apply for Leave</strong> to submit one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Leave Application Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Send size={18} className="text-blue-600" />
                  <span>Submit Leave Application</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select your leave category and dates for manager/HR approval
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
              {/* Category */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Leave Category
                </label>
                <select
                  value={leaveForm.leaveCategory}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveCategory: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden"
                >
                  <option value="PLANNED">Planned Leave (PL — Paid Leave)</option>
                  <option value="UNPLANNED">Unplanned Leave (UP — Unpaid Leave)</option>
                  <option value="SICK">Sick Leave (Medical / Health)</option>
                  <option value="EMERGENCY">Emergency Family Leave</option>
                </select>
              </div>

              {/* Day Type */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Day Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveForm({ ...leaveForm, dayType: "FULL_DAY" })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer border ${
                      leaveForm.dayType === "FULL_DAY"
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Full Day (1.0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveForm({ ...leaveForm, dayType: "HALF_DAY" })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer border ${
                      leaveForm.dayType === "HALF_DAY"
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Half Day (0.5)
                  </button>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Leave
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Family function in native place, doctor appointment..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-hidden"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaveSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {leaveSubmitting ? "Submitting..." : "Submit Leave Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
