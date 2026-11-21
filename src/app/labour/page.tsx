"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Users2,
  Plus,
  DollarSign,
  Calendar,
  AlertCircle,
  Clock,
  Wallet,
  CheckCircle2,
  Building,
  HardHat,
  Receipt,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Trash2,
  Edit2,
  Search,
  Filter,
  Printer,
  RotateCcw,
  UserCheck,
  UserX,
  CreditCard,
  Building2,
  Truck,
  Phone,
  MapPin,
  X,
  FileCheck,
  History,
  CalendarDays,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import ArchiveConfirmModal from "@/components/common/ArchiveConfirmModal";
import ExcelImportModal from "@/components/common/ExcelImportModal";
import EmployeeMultiYearDossierModal from "@/components/attendance/EmployeeMultiYearDossierModal";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

interface WorkerItem {
  id: string;
  employeeCode: string;
  empCode?: string | null;
  name: string;
  fatherName?: string | null;
  dateOfJoining?: string | null;
  phone?: string | null;
  address?: string | null;
  aadhaarNumber?: string | null;
  panNumber?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankIfsc?: string | null;
  ifscCode?: string | null;
  designation?: string | null;
  role?: string | null;
  category: "OFFICE_STAFF" | "TAMIL_LABOUR" | "HINDI_LABOUR" | "CONTRACTOR_TEAM";
  companyUnit: "STANDARD_ROOFS" | "INVI_CREATION";
  status: "ACTIVE" | "ARCHIVED";
  dailyWage?: number;
  monthlySalary?: number;
  baseWage?: number;
  specialty?: string | null;
  isContractor?: boolean;
}

export default function WorkforceKYCDirectoryPage() {
  const [activeCategory, setActiveCategory] = useState<"OFFICE_STAFF" | "TAMIL_LABOUR" | "HINDI_LABOUR" | "CONTRACTOR_TEAM">("OFFICE_STAFF");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [companyUnitFilter, setCompanyUnitFilter] = useState<"ALL" | "STANDARD_ROOFS" | "INVI_CREATION">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Workforce state
  const [workers, setWorkers] = useState<WorkerItem[]>([]);

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerItem | null>(null);
  const [dossierWorker, setDossierWorker] = useState<WorkerItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    empCode: "",
    employeeCode: "",
    fatherName: "",
    dateOfJoining: "",
    phone: "",
    address: "",
    aadhaarNumber: "",
    panNumber: "",
    bankName: "",
    bankAccountNo: "",
    bankIfsc: "",
    designation: "",
    category: "OFFICE_STAFF",
    companyUnit: "STANDARD_ROOFS",
    dailyWage: 850,
    monthlySalary: 15000,
    specialty: "",
  });

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/labour?category=${activeCategory}&status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setWorkers(data.labourers || []);
      }
    } catch (err) {
      console.error("Failed to load workforce:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [activeCategory, statusFilter, searchQuery]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      id: "",
      name: "",
      empCode: "",
      employeeCode: "",
      fatherName: "",
      dateOfJoining: new Date().toISOString().split("T")[0],
      phone: "",
      address: "",
      aadhaarNumber: "",
      panNumber: "",
      bankName: "",
      bankAccountNo: "",
      bankIfsc: "",
      designation: activeCategory === "OFFICE_STAFF" ? "Staff" : activeCategory === "CONTRACTOR_TEAM" ? "Contractor Lead" : "Site Helper",
      category: activeCategory,
      companyUnit: "STANDARD_ROOFS",
      dailyWage: 850,
      monthlySalary: activeCategory === "OFFICE_STAFF" ? 15000 : 0,
      specialty: "",
    });
    setSelectedWorker(null);
    setShowAddEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (worker: WorkerItem) => {
    setSelectedWorker(worker);
    setFormData({
      id: worker.id,
      name: worker.name,
      empCode: worker.empCode || "",
      employeeCode: worker.employeeCode,
      fatherName: worker.fatherName || "",
      dateOfJoining: worker.dateOfJoining ? worker.dateOfJoining.split("T")[0] : "",
      phone: worker.phone || "",
      address: worker.address || "",
      aadhaarNumber: worker.aadhaarNumber || "",
      panNumber: worker.panNumber || "",
      bankName: worker.bankName || "",
      bankAccountNo: worker.bankAccountNo || "",
      bankIfsc: worker.bankIfsc || worker.ifscCode || "",
      designation: worker.designation || worker.role || "",
      category: worker.category,
      companyUnit: worker.companyUnit || "STANDARD_ROOFS",
      dailyWage: worker.dailyWage || 850,
      monthlySalary: worker.monthlySalary || 0,
      specialty: worker.specialty || "",
    });
    setShowAddEditModal(true);
  };

  // Save / Update Worker
  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(formData.id);
      const url = "/api/labour";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dateOfJoining: formData.dateOfJoining ? new Date(formData.dateOfJoining).toISOString() : null,
          isContractor: activeCategory === "CONTRACTOR_TEAM",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddEditModal(false);
        fetchWorkers();
      } else {
        alert(data.error || "Failed to save record.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Archive / Restore Worker
  const handleToggleArchive = async () => {
    if (!selectedWorker) return;
    try {
      const action = statusFilter === "ACTIVE" ? "archive" : "restore";
      await fetch("/api/labour", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedWorker.id,
          action,
          isContractor: activeCategory === "CONTRACTOR_TEAM",
        }),
      });
      setShowArchiveModal(false);
      setSelectedWorker(null);
      fetchWorkers();
    } catch (err) {
      console.error(err);
    }
  };

  // KYC Verification check
  const getKYCStatus = (w: WorkerItem) => {
    const hasAadhaar = Boolean(w.aadhaarNumber && w.aadhaarNumber.length >= 12);
    const hasBank = Boolean(w.bankAccountNo && (w.bankIfsc || w.ifscCode));
    const hasPan = Boolean(w.panNumber && w.panNumber.length >= 10);

    if (hasAadhaar && hasBank) {
      return { status: "Verified", color: "emerald", label: "KYC Verified" };
    }
    if (hasAadhaar || hasBank || hasPan) {
      return { status: "Partial", color: "blue", label: "Partial Docs" };
    }
    return { status: "Pending", color: "amber", label: "Pending KYC" };
  };

  // Filtered workers by company unit (for Office)
  const displayedWorkers = useMemo(() => {
    if (activeCategory === "OFFICE_STAFF" && companyUnitFilter !== "ALL") {
      return workers.filter((w) => w.companyUnit === companyUnitFilter);
    }
    return workers;
  }, [workers, activeCategory, companyUnitFilter]);

  // Export to Excel
  const handleExportExcel = () => {
    const rows = displayedWorkers.map((w) => ({
      "Employee ID": w.employeeCode,
      "Code": w.empCode || "-",
      "Full Name": w.name,
      "Father's Name": w.fatherName || "-",
      "Date of Joining": w.dateOfJoining ? new Date(w.dateOfJoining).toLocaleDateString("en-IN") : "-",
      "Category": w.category,
      "Company Unit": w.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs",
      "Designation / Role": w.designation || w.role || "-",
      "Phone": w.phone || "-",
      "Address": w.address || "-",
      "Aadhaar Number": w.aadhaarNumber || "-",
      "PAN Number": w.panNumber || "-",
      "Bank Name": w.bankName || "-",
      "Bank Account No": w.bankAccountNo || "-",
      "IFSC Code": w.bankIfsc || w.ifscCode || "-",
      "Daily Wage (₹)": w.dailyWage || "-",
      "Monthly Salary (₹)": w.monthlySalary || "-",
      "KYC Status": getKYCStatus(w).label,
    }));

    exportToExcel(rows, `Workforce_KYC_${activeCategory}_${statusFilter}`, "Workforce");
  };

  // Print PDF Roster
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-7 py-3 space-y-5 select-none font-sans pb-16 text-slate-800 dark:text-slate-100">
      {/* 1. TOP MODULE HEADER WITH ANALYTICS & TOOLBAR */}
      <ModuleHeaderWithAnalytics
        title="Workforce & Labour KYC Directory"
        subtitle="Comprehensive personnel master, banking & Aadhaar records, and salary profiles"
        totalCount={workers.length}
        activeCount={workers.filter((w) => w.status === "ACTIVE").length}
        archivedCount={workers.filter((w) => w.status === "ARCHIVED").length}
        primaryAction={{
          label: `+ Add ${
            activeCategory === "OFFICE_STAFF"
              ? "Office Staff"
              : activeCategory === "CONTRACTOR_TEAM"
              ? "Contractor"
              : "Site Worker"
          }`,
          onClick: handleOpenAdd,
        }}
        onImportExcel={() => setShowImportModal(true)}
        onExportExcel={handleExportExcel}
        onPrintPDF={handlePrintPDF}
        charts={[
          {
            title: "Workforce KYC Verification Status",
            description: "Aadhaar and bank account documentation rate across all categories",
            type: "donut",
            data: [
              { name: "Verified Documents", value: 38, color: "#10b981" },
              { name: "Partial Bank / Aadhaar", value: 24, color: "#2563eb" },
              { name: "Pending KYC Collection", value: 26, color: "#f59e0b" },
            ],
          },
          {
            title: "Staff & Labour Monthly Wage Liability (₹)",
            description: "Fixed monthly payroll + estimated site muster wages",
            type: "bar",
            data: [
              { name: "Office Staff (SR)", value: 147000, color: "#2563eb" },
              { name: "Invi Digital Hub", value: 29500, color: "#8b5cf6" },
              { name: "Tamil Site Muster", value: 185000, color: "#10b981" },
              { name: "Hindi Crew", value: 24500, color: "#f59e0b" },
              { name: "Contractor Stage Bills", value: 160000, color: "#ec4899" },
            ],
          },
        ]}
      />

      {/* 2. DEDICATED 4-CATEGORY TABS & TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => setActiveCategory("OFFICE_STAFF")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeCategory === "OFFICE_STAFF"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Building size={15} />
              <span>Office Staff (13)</span>
            </button>

            <button
              onClick={() => setActiveCategory("TAMIL_LABOUR")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeCategory === "TAMIL_LABOUR"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <HardHat size={15} />
              <span>Tamil Site Labours (64)</span>
            </button>

            <button
              onClick={() => setActiveCategory("HINDI_LABOUR")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeCategory === "HINDI_LABOUR"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Truck size={15} />
              <span>Hindi Crew (5)</span>
            </button>

            <button
              onClick={() => setActiveCategory("CONTRACTOR_TEAM")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeCategory === "CONTRACTOR_TEAM"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Users2 size={15} />
              <span>Contractors (6)</span>
            </button>
          </div>

          {/* Active / Archived Pill & Quick Links */}
          <div className="flex items-center gap-3">
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "ACTIVE" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                }`}
              >
                Active Roster
              </button>
              <button
                onClick={() => setStatusFilter("ARCHIVED")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "ARCHIVED" ? "bg-white dark:bg-slate-900 text-rose-600 shadow-xs" : "text-slate-500"
                }`}
              >
                Archived
              </button>
            </div>

            <Link
              href="/attendance"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 transition shadow-2xs"
            >
              <Clock size={13} />
              <span>Attendance Command Center &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Sub-Filters & Instant Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {activeCategory === "OFFICE_STAFF" && (
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
            <div className="relative min-w-[260px]">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, ID, role, Aadhaar, PAN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="text-xs text-slate-500 font-semibold tabular-nums">
            Total <strong>{displayedWorkers.length}</strong> personnel in view
          </div>
        </div>
      </div>

      {/* 3. WORKFORCE & KYC MASTER TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-bold text-slate-400">
                <th className="py-3 px-3">Personnel Profile</th>
                <th className="py-3 px-3">Category & Unit</th>
                <th className="py-3 px-3">Designation / Role</th>
                <th className="py-3 px-3 text-right">Wage / Salary (₹)</th>
                <th className="py-3 px-3">Contact & Phone</th>
                <th className="py-3 px-3">Aadhaar & PAN</th>
                <th className="py-3 px-3">Bank Details</th>
                <th className="py-3 px-3 text-center">KYC Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedWorkers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No workforce profiles found matching your search.
                  </td>
                </tr>
              ) : (
                displayedWorkers.map((w) => {
                  const kyc = getKYCStatus(w);
                  return (
                    <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      {/* Name & ID */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setDossierWorker(w)}
                            title="Click to view Lifetime Attendance Dossier"
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 cursor-pointer hover:opacity-80 transition ${
                              w.category === "OFFICE_STAFF"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : w.category === "HINDI_LABOUR"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                : w.category === "CONTRACTOR_TEAM"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {w.employeeCode.slice(-3)}
                          </button>
                          <div>
                            <button
                              type="button"
                              onClick={() => setDossierWorker(w)}
                              className="font-extrabold text-slate-900 dark:text-slate-100 text-left hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center gap-1.5"
                              title="Click to view Lifetime Attendance Dossier"
                            >
                              <span>{w.name}</span>
                              <History size={11} className="text-blue-500 opacity-60" />
                            </button>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="font-mono">{w.employeeCode}</span>
                              {w.fatherName && <span>• S/O {w.fatherName}</span>}
                              {w.dateOfJoining && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  • Joined {new Date(w.dateOfJoining).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Unit */}
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            w.companyUnit === "INVI_CREATION"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : w.category === "CONTRACTOR_TEAM"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {w.companyUnit === "INVI_CREATION"
                            ? "Invi Creation"
                            : w.category === "OFFICE_STAFF"
                            ? "Standard Roofs (Office)"
                            : w.category === "HINDI_LABOUR"
                            ? "Hindi Migrant Crew"
                            : w.category === "CONTRACTOR_TEAM"
                            ? "Contractor Team"
                            : "Standard Roofs (Tamil)"}
                        </span>
                      </td>

                      {/* Designation */}
                      <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {w.designation || w.specialty || w.role || "Worker"}
                      </td>

                      {/* Wage / Salary */}
                      <td className="py-3 px-3 text-right tabular-nums font-bold">
                        {w.monthlySalary ? (
                          <div>
                            <span className="text-slate-900 dark:text-slate-100">{formatINR(w.monthlySalary)}</span>
                            <span className="text-[10px] text-slate-400 block font-normal">Monthly</span>
                          </div>
                        ) : w.dailyWage ? (
                          <div>
                            <span className="text-blue-600 dark:text-blue-400">₹{w.dailyWage}</span>
                            <span className="text-[10px] text-slate-400 block font-normal">Per Day</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone size={12} className="text-slate-400" />
                          <span>{w.phone || "—"}</span>
                        </div>
                        {w.address && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[140px]" title={w.address}>
                            {w.address}
                          </span>
                        )}
                      </td>

                      {/* Aadhaar & PAN */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-800 dark:text-slate-200">
                            {w.aadhaarNumber ? `XXXX XXXX ${w.aadhaarNumber.slice(-4)}` : "—"}
                          </span>
                          <span className="text-[10px] text-slate-400 block uppercase">
                            {w.panNumber || "No PAN"}
                          </span>
                        </div>
                      </td>

                      {/* Bank Details */}
                      <td className="py-3 px-3 text-[11px]">
                        {w.bankAccountNo ? (
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {w.bankName || "Bank"}: A/C ...{w.bankAccountNo.slice(-4)}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              IFSC: {w.bankIfsc || w.ifscCode || "—"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">No Bank on File</span>
                        )}
                      </td>

                      {/* KYC Status Badge */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                            kyc.color === "emerald"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : kyc.color === "blue"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {kyc.color === "emerald" ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                          <span>{kyc.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDossierWorker(w)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                            title="View Lifetime Multi-Year Attendance Dossier"
                          >
                            <History size={14} />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(w)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Profile & KYC"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedWorker(w);
                              setShowArchiveModal(true);
                            }}
                            className={`p-1.5 rounded-lg transition ${
                              statusFilter === "ACTIVE"
                                ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            }`}
                            title={statusFilter === "ACTIVE" ? "Archive Worker" : "Restore Worker"}
                          >
                            {statusFilter === "ACTIVE" ? <Trash2 size={14} /> : <RotateCcw size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL: ADD / EDIT WORKER & KYC DETAILS */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserCheck className="text-blue-600" size={18} />
                {formData.id ? `Edit Profile: ${formData.name}` : `Add New Workforce Profile`}
              </h3>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWorker} className="space-y-4 text-xs">
              {/* Row 1: Name, Code & Father Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thennarasu M"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Employee / Labour ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 20001, SR011"
                    value={formData.empCode || formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, empCode: e.target.value, employeeCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Category, Company Unit & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="OFFICE_STAFF">Office Staff</option>
                    <option value="TAMIL_LABOUR">Tamil Site Labour</option>
                    <option value="HINDI_LABOUR">Hindi Migrant Crew</option>
                    <option value="CONTRACTOR_TEAM">Contractor Team</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company Unit</label>
                  <select
                    value={formData.companyUnit}
                    onChange={(e) => setFormData({ ...formData, companyUnit: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="STANDARD_ROOFS">Standard Roofs</option>
                    <option value="INVI_CREATION">Invi Creation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Designation / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Layer, Welder, Helper, HR"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Daily Wage or Monthly Salary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {formData.category === "OFFICE_STAFF" ? (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fixed Monthly Salary (₹)</label>
                    <input
                      type="number"
                      value={formData.monthlySalary}
                      onChange={(e) => setFormData({ ...formData, monthlySalary: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold tabular-nums focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Per Day Daily Wage (₹)</label>
                    <input
                      type="number"
                      value={formData.dailyWage}
                      onChange={(e) => setFormData({ ...formData, dailyWage: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold tabular-nums focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date of Joining</label>
                  <input
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 4: KYC Aadhaar & PAN */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="font-extrabold uppercase text-[10.5px] text-blue-600 block mb-2">
                  Statutory KYC Verification (Aadhaar & PAN)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Aadhaar Number (12 Digits)</label>
                    <input
                      type="text"
                      maxLength={14}
                      placeholder="XXXX XXXX XXXX"
                      value={formData.aadhaarNumber}
                      onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">PAN Number (10 Alphanumeric)</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="ABCDE1234F"
                      value={formData.panNumber}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono uppercase focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Bank Details */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="font-extrabold uppercase text-[10.5px] text-emerald-600 block mb-2">
                  Direct Bank Remittance Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. ICICI Bank, SBI"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 15520500XXXX"
                      value={formData.bankAccountNo}
                      onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="e.g. ICIC0001552"
                      value={formData.bankIfsc}
                      onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono uppercase focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Residential Address */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Residential Address</label>
                <textarea
                  rows={2}
                  placeholder="Street, Village / City, District, Pincode"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
                >
                  Save Profile & KYC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: ARCHIVE / RESTORE CONFIRMATION */}
      {showArchiveModal && selectedWorker && (
        <ArchiveConfirmModal
          isOpen={showArchiveModal}
          onClose={() => {
            setShowArchiveModal(false);
            setSelectedWorker(null);
          }}
          onConfirm={handleToggleArchive}
          title={statusFilter === "ACTIVE" ? `Archive Worker: ${selectedWorker.name}` : `Restore Worker: ${selectedWorker.name}`}
          message={
            statusFilter === "ACTIVE"
              ? `Are you sure you want to archive ${selectedWorker.name} (${selectedWorker.employeeCode})? Their KYC and historical attendance data will remain safely preserved in the database.`
              : `Restore ${selectedWorker.name} (${selectedWorker.employeeCode}) back to the active workforce roster?`
          }
          isRestore={statusFilter === "ARCHIVED"}
        />
      )}

      {/* 6. UNIVERSAL EXCEL IMPORT MODAL */}
      {showImportModal && (
        <ExcelImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          moduleName="workforce_master"
          templateColumns={[
            { key: "EmpId", label: "Emp ID (e.g. SR011, 20072)", required: true },
            { key: "Name", label: "Full Name", required: true },
            { key: "Category", label: "Category (OFFICE_STAFF / TAMIL_LABOUR / HINDI_LABOUR / CONTRACTOR_TEAM)", required: true },
            { key: "Designation", label: "Designation / Role" },
            { key: "DailyWage", label: "Daily Wage (₹)" },
            { key: "MonthlySalary", label: "Monthly Salary (₹)" },
            { key: "Phone", label: "Phone Number" },
            { key: "Aadhaar", label: "Aadhaar Number" },
            { key: "PAN", label: "PAN Number" },
            { key: "BankName", label: "Bank Name" },
            { key: "AccountNo", label: "Account Number" },
            { key: "IFSC", label: "IFSC Code" },
          ]}
          onImportComplete={() => {
            setShowImportModal(false);
            fetchWorkers();
          }}
        />
      )}

      {/* 7. LIFETIME MULTI-YEAR ATTENDANCE DOSSIER MODAL */}
      <EmployeeMultiYearDossierModal
        isOpen={Boolean(dossierWorker)}
        onClose={() => setDossierWorker(null)}
        employee={dossierWorker}
      />
    </div>
  );
}
