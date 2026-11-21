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
  Calendar,
  DollarSign,
  Phone,
  UserCheck,
  Layers,
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
  category: "OFFICE_STAFF" | "TAMIL_LABOUR" | "HINDI_LABOUR" | "CONTRACTOR_TEAM";
  companyUnit?: "STANDARD_ROOFS" | "INVI_CREATION" | null;
  phone?: string | null;
  dailyWage?: number | null;
  monthlySalary?: number | null;
  status: string;
  isContractor?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
  initialTab?: "personnel" | "holidays" | "rules";
}

export default function AttendanceSettingsModal({
  isOpen,
  onClose,
  onRefreshData,
  initialTab = "personnel",
}: Props) {
  const [activeTab, setActiveTab] = useState<"personnel" | "holidays" | "rules">(initialTab);

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

  // Personnel state
  const [personnelList, setPersonnelList] = useState<PersonnelItem[]>([]);
  const [personnelLoading, setPersonnelLoading] = useState(false);
  const [personnelCategoryFilter, setPersonnelCategoryFilter] = useState<string>("ALL");
  const [personnelSearch, setPersonnelSearch] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PersonnelItem>>({});

  // Add New Personnel Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: "",
    employeeCode: "",
    empCode: "",
    category: "OFFICE_STAFF" as "OFFICE_STAFF" | "TAMIL_LABOUR" | "HINDI_LABOUR" | "CONTRACTOR_TEAM",
    companyUnit: "STANDARD_ROOFS" as "STANDARD_ROOFS" | "INVI_CREATION",
    designation: "",
    role: "",
    phone: "",
    dailyWage: 850,
    monthlySalary: 15000,
  });

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
      const [empRes, conRes] = await Promise.all([
        fetch("/api/labour?status=ALL"),
        fetch("/api/labour?category=CONTRACTOR_TEAM&status=ALL"),
      ]);

      const empData = await empRes.json();
      const conData = await conRes.json();

      const combined: PersonnelItem[] = [];

      if (empData.success && Array.isArray(empData.labourers)) {
        empData.labourers.forEach((w: any) => {
          combined.push({
            id: w.id,
            name: w.name,
            employeeCode: w.employeeCode,
            empCode: w.empCode,
            designation: w.designation || w.role,
            role: w.role || w.designation,
            category: w.category,
            companyUnit: w.companyUnit,
            phone: w.phone,
            dailyWage: w.dailyWage ? Number(w.dailyWage) : null,
            monthlySalary: w.monthlySalary ? Number(w.monthlySalary) : null,
            status: w.status,
            isContractor: false,
          });
        });
      }

      if (conData.success && Array.isArray(conData.labourers)) {
        conData.labourers.forEach((c: any) => {
          combined.push({
            id: c.id,
            name: c.name,
            employeeCode: c.code || "CONT",
            empCode: c.code,
            designation: c.specialty || "Roofing Contractor",
            role: c.specialty || "Roofing Contractor",
            category: "CONTRACTOR_TEAM",
            companyUnit: "STANDARD_ROOFS",
            phone: c.phone,
            dailyWage: null,
            monthlySalary: null,
            status: c.status || "ACTIVE",
            isContractor: true,
          });
        });
      }

      setPersonnelList(combined);
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
  const handleSavePersonnelRow = async (id: string, isContractor = false) => {
    try {
      const endpoint = `/api/labour/${id}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          isContractor,
          ...editFormData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Updated details for "${editFormData.name || "Personnel"}" successfully.`);
        setEditingId(null);
        fetchPersonnel();
        onRefreshData?.();
      } else {
        alert(data.error || "Failed to update record.");
      }
    } catch (err) {
      console.error("Failed to update personnel:", err);
    }
  };

  // Archive / Delete Personnel
  const handleDeletePersonnelRow = async (id: string, name: string, isContractor = false) => {
    if (!confirm(`Are you sure you want to archive "${name}"?`)) return;
    try {
      const endpoint = `/api/labour/${id}?isContractor=${isContractor}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showNotification(`"${name}" has been safely archived.`);
        fetchPersonnel();
        onRefreshData?.();
      }
    } catch (err) {
      console.error("Failed to archive personnel:", err);
    }
  };

  // Create New Personnel
  const handleCreatePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.name) {
      alert("Name is required.");
      return;
    }

    try {
      const res = await fetch("/api/labour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addFormData,
          dailyWage: addFormData.category === "OFFICE_STAFF" ? 0 : Number(addFormData.dailyWage),
          monthlySalary: addFormData.category === "OFFICE_STAFF" ? Number(addFormData.monthlySalary) : 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Added new member: "${addFormData.name}"!`);
        setShowAddModal(false);
        setAddFormData({
          name: "",
          employeeCode: "",
          empCode: "",
          category: "OFFICE_STAFF",
          companyUnit: "STANDARD_ROOFS",
          designation: "",
          role: "",
          phone: "",
          dailyWage: 850,
          monthlySalary: 15000,
        });
        fetchPersonnel();
        onRefreshData?.();
      } else {
        alert(data.error || "Failed to create new record.");
      }
    } catch (err) {
      console.error("Failed to create personnel:", err);
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
      (p.designation && p.designation.toLowerCase().includes(personnelSearch.toLowerCase())) ||
      (p.phone && p.phone.includes(personnelSearch));

    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold shadow-xs">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Attendance & Workforce System Settings</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                  Super Admin
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Manage workforce directory, company holidays, 6-day work-week rules, and rate structures
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Notification */}
        {actionSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check size={14} className="text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* 3 Main Settings Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("personnel")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "personnel"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Users size={15} />
            <span>Personnel & Roles ({personnelList.length})</span>
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
            <Palmtree size={15} />
            <span>Company Holidays ({holidays.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "rules"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ShieldCheck size={15} />
            <span>Status Codes & Rules</span>
          </button>
        </div>

        {/* ================= TAB 1: PERSONNEL & ROLES INLINE EDITOR ================= */}
        {activeTab === "personnel" && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                {[
                  { key: "ALL", label: `All (${personnelList.length})` },
                  { key: "OFFICE", label: `Office Staff (${personnelList.filter((p) => p.category === "OFFICE_STAFF").length})` },
                  { key: "TAMIL", label: `Tamil Labours (${personnelList.filter((p) => p.category === "TAMIL_LABOUR").length})` },
                  { key: "HINDI", label: `Hindi Crew (${personnelList.filter((p) => p.category === "HINDI_LABOUR").length})` },
                  { key: "CONTRACTOR", label: `Contractors (${personnelList.filter((p) => p.category === "CONTRACTOR_TEAM").length})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setPersonnelCategoryFilter(t.key)}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      personnelCategoryFilter === t.key
                        ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
                  <input
                    type="text"
                    placeholder="Search name, code, role..."
                    value={personnelSearch}
                    onChange={(e) => setPersonnelSearch(e.target.value)}
                    className="w-full pl-8 pr-3 h-[34px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3.5 h-[34px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>+ Add New</span>
                </button>
              </div>
            </div>

            {/* Personnel Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">ID / Code</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Designation / Role</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3 text-right">Daily Rate / Salary</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {personnelLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Loading directory records...
                      </td>
                    </tr>
                  ) : filteredPersonnel.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No personnel found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPersonnel.map((person) => {
                      const isEditing = editingId === person.id;
                      return (
                        <tr
                          key={person.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                            isEditing ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                          }`}
                        >
                          {/* Code */}
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData.employeeCode ?? person.employeeCode}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, employeeCode: e.target.value })
                                }
                                className="w-20 px-2 py-1 rounded border border-blue-400 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                              />
                            ) : (
                              person.empCode || person.employeeCode
                            )}
                          </td>

                          {/* Full Name */}
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData.name ?? person.name}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, name: e.target.value })
                                }
                                className="w-40 px-2 py-1 rounded border border-blue-400 bg-white dark:bg-slate-900 text-xs font-bold"
                              />
                            ) : (
                              person.name
                            )}
                          </td>

                          {/* Role / Designation */}
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData.designation ?? (person.designation || "")}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, designation: e.target.value, role: e.target.value })
                                }
                                className="w-36 px-2 py-1 rounded border border-blue-400 bg-white dark:bg-slate-900 text-xs"
                              />
                            ) : (
                              person.designation || person.role || "—"
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                person.category === "OFFICE_STAFF"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : person.category === "TAMIL_LABOUR"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  : person.category === "HINDI_LABOUR"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {person.category.replace("_", " ")}
                            </span>
                          </td>

                          {/* Company Unit */}
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {person.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs"}
                          </td>

                          {/* Phone */}
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData.phone ?? (person.phone || "")}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, phone: e.target.value })
                                }
                                placeholder="Phone"
                                className="w-28 px-2 py-1 rounded border border-blue-400 bg-white dark:bg-slate-900 text-xs font-mono"
                              />
                            ) : (
                              person.phone || "—"
                            )}
                          </td>

                          {/* Daily Rate / Salary */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                            {isEditing ? (
                              person.category === "OFFICE_STAFF" ? (
                                <input
                                  type="number"
                                  value={editFormData.monthlySalary ?? (person.monthlySalary || 0)}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      monthlySalary: Number(e.target.value),
                                    })
                                  }
                                  placeholder="Salary"
                                  className="w-24 px-2 py-1 rounded border border-blue-400 bg-white dark:bg-slate-900 text-xs text-right font-mono"
                                />
                              ) : (
                                <input
                                  type="number"
                                  value={editFormData.dailyWage ?? (person.dailyWage || 0)}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      dailyWage: Number(e.target.value),
                                    })
                                  }
                                  placeholder="Daily ₹"
                                  className="w-20 px-2 py-1 rounded border border-blue-400 bg-white dark:bg-slate-900 text-xs text-right font-mono"
                                />
                              )
                            ) : person.category === "OFFICE_STAFF" ? (
                              person.monthlySalary ? `₹${person.monthlySalary.toLocaleString()}/mo` : "—"
                            ) : person.dailyWage ? (
                              `₹${person.dailyWage}/day`
                            ) : (
                              "—"
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSavePersonnelRow(person.id, person.isContractor)}
                                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                                  title="Save Changes"
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 hover:bg-slate-300 transition cursor-pointer"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(person.id);
                                    setEditFormData({
                                      name: person.name,
                                      employeeCode: person.employeeCode,
                                      designation: person.designation,
                                      role: person.role,
                                      phone: person.phone,
                                      dailyWage: person.dailyWage,
                                      monthlySalary: person.monthlySalary,
                                    });
                                  }}
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePersonnelRow(person.id, person.name, person.isContractor)}
                                  className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                  title="Archive"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: COMPANY HOLIDAYS ================= */}
        {activeTab === "holidays" && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50/60 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-200/80 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <Palmtree className="text-amber-600 shrink-0" size={18} />
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Select Calendar Year:
                </span>
                <select
                  value={selectedHolidayYear}
                  onChange={(e) => setSelectedHolidayYear(Number(e.target.value))}
                  className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-bold text-amber-900 dark:text-amber-200"
                >
                  {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleApplyHolidaysToOfficeStaff}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Apply All {selectedHolidayYear} Holidays to Office Staff (1-Click)</span>
              </button>
            </div>

            {/* Add Holiday Form */}
            <form onSubmit={handleSaveHoliday} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <input
                type="date"
                required
                value={holidayForm.date}
                onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
              />

              <input
                type="text"
                required
                placeholder="Holiday Name (e.g. Deepavali)"
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
              />

              <select
                value={holidayForm.holidayType}
                onChange={(e) => setHolidayForm({ ...holidayForm, holidayType: e.target.value })}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <option value="PL">Paid Leave (PL - 1.0 Day)</option>
                <option value="HALF_PAID">Half-Day Paid (0.5 Day)</option>
                <option value="UP">Non-Paid Leave (UP - 0.0 Day)</option>
              </select>

              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Holiday</span>
              </button>
            </form>

            {/* Holidays List */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Holiday Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Impact on Payable Days</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {holidayLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Loading holidays...
                      </td>
                    </tr>
                  ) : holidays.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No company holidays registered for {selectedHolidayYear}.
                      </td>
                    </tr>
                  ) : (
                    holidays.map((h) => {
                      const d = String(h.date).split("T")[0];
                      return (
                        <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {d}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                            {h.name}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                h.holidayType === "PL"
                                  ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                                  : h.holidayType === "HALF_PAID"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {h.holidayType === "PL"
                                ? "Paid Holiday (PL)"
                                : h.holidayType === "HALF_PAID"
                                ? "Half-Day Paid (0.5)"
                                : "Unpaid Holiday (UP)"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {h.holidayType === "PL"
                              ? "+1.0 Payable Day"
                              : h.holidayType === "HALF_PAID"
                              ? "+0.5 Payable Day"
                              : "0.0 Non-Payable"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteHoliday(h.id, h.name)}
                              className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete Holiday"
                            >
                              <Trash2 size={13} />
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
        )}

        {/* ================= TAB 3: WORK-WEEK RULES & STATUS CODES ================= */}
        {activeTab === "rules" && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Office Staff Rule Card */}
              <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2.5">
                <h4 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <Building size={16} className="text-emerald-600" />
                  <span>Rule Set A — Office Employees (Standard Roofs & Invi)</span>
                </h4>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                  <li><strong>Work Week:</strong> 6 days per week (Monday through Saturday).</li>
                  <li><strong>Sunday Weekly Off:</strong> Every Sunday is automatically marked as <strong>L</strong> (Weekly Off — 0.0 non-payable).</li>
                  <li><strong>Company Holidays:</strong> Official holidays count as <strong>PL</strong> (Paid Leave = 1.0 day payable) or <strong>Half-Day Paid</strong> (0.5 day payable).</li>
                  <li><strong>1-Hour Permission:</strong> Tagged as <strong>P·1H</strong> with note and counts as full present day (1.0).</li>
                  <li>
                    <strong>Net Payable Days Formula:</strong>
                    <div className="mt-1 font-mono text-[11px] p-2 bg-white dark:bg-slate-900 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                      Net Payable = P (1.0) + 1H (1.0) + PL (1.0) + (H × 0.5) + (HalfPaid PL × 0.5)
                    </div>
                  </li>
                </ul>
              </div>

              {/* Site Labour & Contractor Rule Card */}
              <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 space-y-2.5">
                <h4 className="text-sm font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <HardHat size={16} className="text-blue-600" />
                  <span>Rule Set B — Tamil Labours, Hindi Crew & Contractors</span>
                </h4>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                  <li><strong>Strict Principle:</strong> "Work = Paid, No Work = No Pay".</li>
                  <li><strong>Sundays:</strong> Sundays are NOT auto-marked L. If labours work on Sunday at project sites, they receive full pay!</li>
                  <li><strong>Contractor Teams:</strong> Headcount × daily site work logged in muster sheet.</li>
                  <li>
                    <strong>Net Payable Days Formula:</strong>
                    <div className="mt-1 font-mono text-[11px] p-2 bg-white dark:bg-slate-900 rounded-lg border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                      Net Payable = P (1.0) + 1H (1.0) + (H × 0.5)
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Standard 7 Attendance Statuses */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Official Standard Status Codes
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {[
                  { code: "P", label: "Present", val: "1.0 Day", bg: "bg-emerald-600 text-white" },
                  { code: "P·1H", label: "1-Hr Perm", val: "1.0 Day", bg: "bg-sky-600 text-white" },
                  { code: "H", label: "Half-Day", val: "0.5 Day", bg: "bg-amber-500 text-white" },
                  { code: "PL", label: "Paid Leave", val: "1.0 Day", bg: "bg-teal-600 text-white" },
                  { code: "UP", label: "Unpaid Leave", val: "0.0 Day", bg: "bg-slate-600 text-white" },
                  { code: "A", label: "Absent", val: "0.0 Day", bg: "bg-rose-600 text-white" },
                  { code: "L", label: "Sunday Off", val: "0.0 Day", bg: "bg-slate-700 text-white" },
                ].map((s) => (
                  <div key={s.code} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-1">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${s.bg}`}>
                      {s.code}
                    </span>
                    <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">{s.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
          <span className="text-xs text-slate-400">
            Changes save directly to Neon PostgreSQL cloud database
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

      {/* ================= MODAL: ADD NEW PERSONNEL / CONTRACTOR ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus size={16} className="text-blue-600" />
                <span>Add New Member / Contractor</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreatePersonnel} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name / Contractor Team Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anandha Kumar or New Roofing Team"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category Block *
                  </label>
                  <select
                    value={addFormData.category}
                    onChange={(e: any) =>
                      setAddFormData({
                        ...addFormData,
                        category: e.target.value,
                        dailyWage: e.target.value === "OFFICE_STAFF" ? 0 : 850,
                        monthlySalary: e.target.value === "OFFICE_STAFF" ? 15000 : 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="OFFICE_STAFF">Office Staff</option>
                    <option value="TAMIL_LABOUR">Tamil Site Labour</option>
                    <option value="HINDI_LABOUR">Hindi Crew</option>
                    <option value="CONTRACTOR_TEAM">Contractor Team</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Company Unit
                  </label>
                  <select
                    value={addFormData.companyUnit}
                    onChange={(e: any) =>
                      setAddFormData({ ...addFormData, companyUnit: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="STANDARD_ROOFS">Standard Roofs</option>
                    <option value="INVI_CREATION">Invi Creation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role / Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Site Welder / Supervisor"
                    value={addFormData.designation}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        designation: e.target.value,
                        role: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={addFormData.phone}
                    onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {addFormData.category === "OFFICE_STAFF" ? (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Monthly Salary (₹)
                    </label>
                    <input
                      type="number"
                      value={addFormData.monthlySalary}
                      onChange={(e) =>
                        setAddFormData({ ...addFormData, monthlySalary: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Daily Wage Rate (₹)
                    </label>
                    <input
                      type="number"
                      value={addFormData.dailyWage}
                      onChange={(e) =>
                        setAddFormData({ ...addFormData, dailyWage: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Custom ID / Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Leave blank for auto ID"
                    value={addFormData.employeeCode}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        employeeCode: e.target.value,
                        empCode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
