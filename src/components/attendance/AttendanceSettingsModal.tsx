"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  Palmtree,
  Users,
  ShieldCheck,
  Check,
  Plus,
  Trash2,
  Edit2,
  Save,
  Search,
  Sparkles,
  AlertCircle,
  Building,
  HardHat,
  Truck,
  Briefcase,
} from "lucide-react";

interface HolidayItem {
  id: string;
  date: string;
  name: string;
  holidayType: string; // "PL" | "UP" | "HALF_PAID"
  year: number;
  description?: string | null;
}

interface PersonnelItem {
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
  status: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
  initialTab?: "rules" | "holidays" | "personnel";
}

export default function AttendanceSettingsModal({
  isOpen,
  onClose,
  onRefreshData,
  initialTab = "rules",
}: Props) {
  const [activeTab, setActiveTab] = useState<"rules" | "holidays" | "personnel">(initialTab);

  // Holidays state
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [selectedHolidayYear, setSelectedHolidayYear] = useState<number>(2026);
  const [holidayForm, setHolidayForm] = useState({
    date: "",
    name: "",
    holidayType: "PL",
    description: "",
  });
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Personnel inline edit state
  const [personnelList, setPersonnelList] = useState<PersonnelItem[]>([]);
  const [personnelLoading, setPersonnelLoading] = useState(false);
  const [personnelCategoryFilter, setPersonnelCategoryFilter] = useState<string>("ALL");
  const [personnelSearch, setPersonnelSearch] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PersonnelItem>>({});

  useEffect(() => {
    if (isOpen) {
      fetchHolidays();
      fetchPersonnel();
    }
  }, [isOpen, selectedHolidayYear]);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const fetchHolidays = async () => {
    setHolidayLoading(true);
    try {
      const res = await fetch(`/api/attendance/holidays?year=${selectedHolidayYear}`);
      const data = await res.json();
      if (data.success) {
        setHolidays(data.holidays || []);
      }
    } catch (err) {
      console.error("Failed to load holidays:", err);
    } finally {
      setHolidayLoading(false);
    }
  };

  const fetchPersonnel = async () => {
    setPersonnelLoading(true);
    try {
      const res = await fetch("/api/labour");
      const data = await res.json();
      if (data.success) {
        const mapped = (data.workers || []).map((w: any) => ({
          id: w.id,
          name: w.name,
          employeeCode: w.employeeCode,
          empCode: w.empCode,
          designation: w.designation || w.role,
          role: w.role || w.designation,
          category: w.category,
          companyUnit: w.companyUnit,
          dailyWage: w.dailyWage ? Number(w.dailyWage) : null,
          monthlySalary: w.monthlySalary ? Number(w.monthlySalary) : null,
          status: w.status,
        }));
        setPersonnelList(mapped);
      }
    } catch (err) {
      console.error("Failed to load personnel:", err);
    } finally {
      setPersonnelLoading(false);
    }
  };

  // Add / Upsert Holiday
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
          holidayType: holidayForm.holidayType,
          description: holidayForm.description,
          year: parseInt(holidayForm.date.split("-")[0], 10),
          markOfficeStaff: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Holiday "${holidayForm.name}" added and synced to Office Staff!`);
        setHolidayForm({ date: "", name: "", holidayType: "PL", description: "" });
        fetchHolidays();
        onRefreshData?.();
      }
    } catch (err) {
      console.error("Failed to save holiday:", err);
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete holiday "${name}"?`)) return;
    try {
      const res = await fetch(`/api/attendance/holidays?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showNotification(`Holiday "${name}" deleted.`);
        fetchHolidays();
        onRefreshData?.();
      }
    } catch (err) {
      console.error("Failed to delete holiday:", err);
    }
  };

  // 1-Click Apply all holidays for year to office staff
  const handleApplyHolidaysToOfficeStaff = async () => {
    try {
      const res = await fetch("/api/attendance/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "applyAll", year: selectedHolidayYear }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || "All company holidays applied to Office Staff attendance calendars!");
        onRefreshData?.();
      }
    } catch (err) {
      console.error("Failed to apply holidays:", err);
    }
  };

  // Save Inline Edit for Personnel
  const handleSavePersonnelRow = async (id: string) => {
    try {
      const res = await fetch("/api/labour", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          ...editFormData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Updated details for "${editFormData.name || "Worker"}" successfully.`);
        setEditingId(null);
        fetchPersonnel();
        onRefreshData?.();
      }
    } catch (err) {
      console.error("Failed to update personnel:", err);
    }
  };

  if (!isOpen) return null;

  const filteredPersonnel = personnelList.filter((p) => {
    const matchCat =
      personnelCategoryFilter === "ALL" ||
      (personnelCategoryFilter === "OFFICE" && p.category === "OFFICE_STAFF") ||
      (personnelCategoryFilter === "TAMIL" && p.category === "TAMIL_LABOUR") ||
      (personnelCategoryFilter === "HINDI" && p.category === "HINDI_LABOUR") ||
      (personnelCategoryFilter === "CONTRACTOR" && p.category === "CONTRACTOR_TEAM");

    const matchSearch =
      !personnelSearch ||
      p.name.toLowerCase().includes(personnelSearch.toLowerCase()) ||
      p.employeeCode.toLowerCase().includes(personnelSearch.toLowerCase()) ||
      (p.designation && p.designation.toLowerCase().includes(personnelSearch.toLowerCase()));

    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full p-6 space-y-5 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>HR, Attendance & Directory Settings</span>
                <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                  Super Admin
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Configure 7 status codes, 12 official company holidays, and manage personnel directories & rates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Alert Banner */}
        {actionSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
            <Check size={14} className="text-emerald-600" />
            <span className="font-bold">{actionSuccess}</span>
          </div>
        )}

        {/* 3 Main Settings Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "rules"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ShieldCheck size={14} />
            <span>Attendance Statuses & Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("holidays")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "holidays"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Palmtree size={14} />
            <span>Company Holidays ({holidays.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("personnel")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "personnel"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Users size={14} />
            <span>Personnel & Rates Editor ({personnelList.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* TAB 1: STATUS CODES & RULES */}
          {activeTab === "rules" && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="text-blue-600" size={16} />
                  <span>The 7 Official Attendance Statuses & Payable Multipliers</span>
                </h4>
                <p className="text-slate-500 text-xs">
                  These 7 standardized statuses power all attendance calculations, daily roll-calls, monthly grids, and salary payouts.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Status 1: P */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-emerald-500 text-white font-black text-sm flex items-center justify-center">
                        P
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">Present (Full Day)</span>
                        <span className="text-[11px] text-slate-400">Regular full working day</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
                      1.0 Day Paid
                    </span>
                  </div>

                  {/* Status 2: 1H */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-sky-500 text-white font-black text-xs flex items-center justify-center">
                        P·1H
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">1-Hr Permission</span>
                        <span className="text-[11px] text-slate-400">Logged with permission note & time</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-sky-600 bg-sky-50 dark:bg-sky-950 px-2.5 py-1 rounded-lg">
                      1.0 Day Paid
                    </span>
                  </div>

                  {/* Status 3: H */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-amber-500 text-white font-black text-sm flex items-center justify-center">
                        H
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">Half-Day</span>
                        <span className="text-[11px] text-slate-400">Half-day work or afternoon off</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-600 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-lg">
                      0.5 Day Paid
                    </span>
                  </div>

                  {/* Status 4: PL */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center">
                        PL
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">Paid Company Leave</span>
                        <span className="text-[11px] text-slate-400">Company declared paid holiday</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-teal-600 bg-teal-50 dark:bg-teal-950 px-2.5 py-1 rounded-lg">
                      1.0 / 0.5 Day Paid
                    </span>
                  </div>

                  {/* Status 5: UP */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-slate-600 text-white font-black text-xs flex items-center justify-center">
                        UP
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">Unpaid Company Leave</span>
                        <span className="text-[11px] text-slate-400">Declared non-paid holiday / approved leave</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                      0.0 Day (Unpaid)
                    </span>
                  </div>

                  {/* Status 6: A */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-rose-600 text-white font-black text-sm flex items-center justify-center">
                        A
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">Absent</span>
                        <span className="text-[11px] text-slate-400">Unapproved absence</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-rose-600 bg-rose-50 dark:bg-rose-950 px-2.5 py-1 rounded-lg">
                      0.0 Day (Unpaid)
                    </span>
                  </div>

                  {/* Status 7: L */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between md:col-span-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-slate-700 text-white font-black text-sm flex items-center justify-center">
                        L
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">Sunday Weekly Off</span>
                        <span className="text-[11px] text-slate-400">Auto-flagged for 6-day work week office employees (Mon–Sat)</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                      0.0 Day (Non-Payable)
                    </span>
                  </div>
                </div>
              </div>

              {/* Workforce Rule Sets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
                  <span className="text-xs font-extrabold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <Building size={14} /> Rule Set A: Office Employees
                  </span>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                    <li>6-Day Work Week (Monday through Saturday)</li>
                    <li>Every Sunday is automatically marked <strong>L</strong> (Weekly Off — Non-Payable)</li>
                    <li>Supports all 7 statuses (P, 1H, H, PL, UP, A, L)</li>
                    <li><strong>Net Payable Days = P(1.0) + 1H(1.0) + PL(1.0) + 0.5×H + 0.5×(Half-Day PL)</strong></li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
                  <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <HardHat size={14} /> Rule Set B: Site Crews & Contractors
                  </span>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                    <li>Strict <strong>&quot;Work = Paid, No Work = No Pay&quot;</strong></li>
                    <li>No auto-Sunday leave: site crews work any day of the week as scheduled</li>
                    <li>Only days marked <strong>P (1.0)</strong>, <strong>1H (1.0)</strong>, or <strong>H (0.5)</strong> are payable</li>
                    <li>Absents and unmarked rest days count as <strong>0.0 days</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPANY HOLIDAYS */}
          {activeTab === "holidays" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Filter Year:</span>
                  <div className="flex items-center gap-1">
                    {[2025, 2026, 2027, 2028].map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setSelectedHolidayYear(y)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                          selectedHolidayYear === y
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyHolidaysToOfficeStaff}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>⚡ Apply {selectedHolidayYear} Holidays to Office Staff</span>
                </button>
              </div>

              {/* Add Holiday Form */}
              <form onSubmit={handleSaveHoliday} className="p-3.5 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-3">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Plus size={14} className="text-blue-600" /> Add New Holiday
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={holidayForm.date}
                      onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Holiday Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Deepavali, Pongal"
                      value={holidayForm.name}
                      onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Holiday Type</label>
                    <select
                      value={holidayForm.holidayType}
                      onChange={(e) => setHolidayForm({ ...holidayForm, holidayType: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      <option value="PL">Paid Leave (PL — 1.0 Day Paid)</option>
                      <option value="HALF_PAID">Half-Day Paid (0.5 Day Paid)</option>
                      <option value="UP">Non-Paid Leave (UP — 0.0 Day)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
                    >
                      Save Holiday
                    </button>
                  </div>
                </div>
              </form>

              {/* Holidays Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Holiday Name</th>
                      <th className="py-2.5 px-3">Type & Multiplier</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {holidays.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {h.date.split("T")[0]}
                        </td>
                        <td className="py-2 px-3 font-extrabold text-slate-900 dark:text-slate-100">
                          {h.name}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              h.holidayType === "HALF_PAID"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : h.holidayType === "UP"
                                ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                            }`}
                          >
                            {h.holidayType === "HALF_PAID"
                              ? "Half-Day Paid (0.5)"
                              : h.holidayType === "UP"
                              ? "Non-Paid Leave (0.0)"
                              : "Paid Leave (1.0)"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {h.description || "—"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteHoliday(h.id, h.name)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete Holiday"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PERSONNEL & RATES DIRECTORY INLINE EDITOR */}
          {activeTab === "personnel" && (
            <div className="space-y-3 text-xs">
              {/* Category Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                  {[
                    { key: "ALL", label: "All Workforce" },
                    { key: "OFFICE", label: "Office Staff" },
                    { key: "TAMIL", label: "Tamil Labours" },
                    { key: "HINDI", label: "Hindi Crew" },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setPersonnelCategoryFilter(cat.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        personnelCategoryFilter === cat.key
                          ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
                  <input
                    type="text"
                    placeholder="Search name, code, role..."
                    value={personnelSearch}
                    onChange={(e) => setPersonnelSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Personnel Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[50vh]">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px] sticky top-0 z-10">
                      <th className="py-2.5 px-3">ID Code</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Designation / Role</th>
                      <th className="py-2.5 px-3 text-right">Daily Rate / Salary (₹)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPersonnel.map((p) => {
                      const isEditing = editingId === p.id;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          {/* Code */}
                          <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData.employeeCode || ""}
                                onChange={(e) => setEditFormData({ ...editFormData, employeeCode: e.target.value })}
                                className="w-20 px-1.5 py-0.5 rounded border border-blue-400 bg-white dark:bg-slate-800 text-xs font-mono"
                              />
                            ) : (
                              p.employeeCode
                            )}
                          </td>

                          {/* Name */}
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData.name || ""}
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                className="w-36 px-1.5 py-0.5 rounded border border-blue-400 bg-white dark:bg-slate-800 text-xs font-bold"
                              />
                            ) : (
                              p.name
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-2 px-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                p.category === "OFFICE_STAFF"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : p.category === "HINDI_LABOUR"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              }`}
                            >
                              {p.category.replace(/_/g, " ")}
                            </span>
                          </td>

                          {/* Designation */}
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData.designation || ""}
                                onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                                className="w-28 px-1.5 py-0.5 rounded border border-blue-400 bg-white dark:bg-slate-800 text-xs"
                              />
                            ) : (
                              p.designation || "Worker"
                            )}
                          </td>

                          {/* Wage / Salary */}
                          <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-800 dark:text-slate-200">
                            {isEditing ? (
                              <input
                                type="number"
                                value={p.category === "OFFICE_STAFF" ? (editFormData.monthlySalary ?? 0) : (editFormData.dailyWage ?? 0)}
                                onChange={(e) =>
                                  p.category === "OFFICE_STAFF"
                                    ? setEditFormData({ ...editFormData, monthlySalary: Number(e.target.value) })
                                    : setEditFormData({ ...editFormData, dailyWage: Number(e.target.value) })
                                }
                                className="w-24 px-1.5 py-0.5 rounded border border-blue-400 bg-white dark:bg-slate-800 text-xs text-right font-mono"
                              />
                            ) : p.category === "OFFICE_STAFF" ? (
                              p.monthlySalary ? `₹${p.monthlySalary.toLocaleString("en-IN")}/mo` : "—"
                            ) : p.dailyWage ? (
                              `₹${p.dailyWage}/day`
                            ) : (
                              "—"
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-2 px-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              {p.status}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-2 px-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSavePersonnelRow(p.id)}
                                  className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer"
                                  title="Save Row"
                                >
                                  <Save size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                  title="Cancel"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(p.id);
                                  setEditFormData({
                                    name: p.name,
                                    employeeCode: p.employeeCode,
                                    designation: p.designation,
                                    dailyWage: p.dailyWage,
                                    monthlySalary: p.monthlySalary,
                                  });
                                }}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                title="Edit Person"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
