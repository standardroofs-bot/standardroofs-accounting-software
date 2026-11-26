"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  HardHat,
  Users2,
  Truck,
  Plus,
  Search,
  Download,
  Printer,
  History,
  FileSpreadsheet,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Phone,
  FileCheck,
  ShieldCheck,
  CreditCard,
  Building,
  GraduationCap,
  Sparkles,
  Upload,
  X,
  ExternalLink,
  Loader2,
  Settings,
  LayoutGrid,
  List,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import ArchiveConfirmModal from "@/components/common/ArchiveConfirmModal";
import AttendanceSettingsModal from "@/components/attendance/AttendanceSettingsModal";
import EmployeeMultiYearDossierModal from "@/components/attendance/EmployeeMultiYearDossierModal";
import WorkerKycProfileDrawer, { WorkerKycData } from "@/components/labour/WorkerKycProfileDrawer";
import { OfferLetterAndExitModal } from "@/components/labour/OfferLetterAndExitModal";
import LabourSmartImportModal from "@/components/labour/LabourSmartImportModal";
import { exportToExcel } from "@/lib/exportUtils";
import { ViewportPortal } from "@/components/ui/ViewportPortal";
import { InitialsAvatar } from "@/components/ui/ErpPrimitives";

type SegmentType = "SR_OFFICE" | "INVI_OFFICE" | "TAMIL" | "HINDI" | "CONTRACTOR";

export default function LabourWorkforceMasterPage() {
  const [activeSegment, setActiveSegment] = useState<SegmentType>("SR_OFFICE");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showSalaries, setShowSalaries] = useState(false);
  const [offerExitModal, setOfferExitModal] = useState<{
    mode: "OFFER_LETTER" | "EXIT_FNF";
    worker: any;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && String(d.user?.role || "").toUpperCase() === "SUPER_ADMIN") setIsSuperAdmin(true);
      })
      .catch(() => {});
  }, []);

  // Workforce records from DB
  const [workers, setWorkers] = useState<any[]>([]);
  const [segmentCounts, setSegmentCounts] = useState({
    srOffice: 10,
    inviOffice: 3,
    tamil: 71,
    hindi: 5,
    contractor: 6,
    total: 95,
  });

  // Modals state
  const [showSmartImportModal, setShowSmartImportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Selected Worker state
  const [selectedWorkerForKyc, setSelectedWorkerForKyc] = useState<WorkerKycData | null>(null);
  const [selectedWorkerForDossier, setSelectedWorkerForDossier] = useState<any | null>(null);
  const [selectedWorkerForAction, setSelectedWorkerForAction] = useState<any | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    employeeCode: "",
    empCode: "",
    fatherName: "",
    dob: "",
    phone: "",
    address: "",
    photoUrl: "",
    category: "OFFICE_STAFF",
    companyUnit: "STANDARD_ROOFS",
    designation: "",
    monthlySalary: 15000,
    dailyWage: 850,
    baseWage: 0,
    tradeSpecialty: "",
    contractorLeadName: "",
    defaultHeadcount: 1,
    dateOfJoining: new Date().toISOString().split("T")[0],
    aadhaarNumber: "",
    aadhaarDocUrl: "",
    panNumber: "",
    panDocUrl: "",
    drivingLicenseNumber: "",
    drivingLicenseDocUrl: "",
    bankAccountName: "",
    bankName: "",
    bankAccountNo: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankBranch: "",
    location: "Erode",
    state: "Tamil Nadu",
    defaultVehicleAllowance: 0,
    tenthDetails: "",
    twelfthDetails: "",
    graduationDetails: "",
    experienceJson: "",
  });

  const [modalKycTab, setModalKycTab] = useState<"profile" | "kyc" | "bank" | "education">("profile");
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Fetch Workers based on current segment
  const fetchWorkers = async () => {
    setLoading(true);
    try {
      let url = "/api/labour?";
      const params = new URLSearchParams();
      params.set("status", statusFilter);

      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      if (activeSegment === "SR_OFFICE") {
        params.set("category", "OFFICE_STAFF");
        params.set("companyUnit", "STANDARD_ROOFS");
      } else if (activeSegment === "INVI_OFFICE") {
        params.set("category", "OFFICE_STAFF");
        params.set("companyUnit", "INVI_CREATION");
      } else if (activeSegment === "TAMIL") {
        params.set("category", "TAMIL_LABOUR");
      } else if (activeSegment === "HINDI") {
        params.set("category", "HINDI_LABOUR");
      } else if (activeSegment === "CONTRACTOR") {
        params.set("category", "CONTRACTOR_TEAM");
      }

      const res = await fetch(`${url}${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setWorkers(data.labourers || []);
        if (data.segmentCounts) {
          setSegmentCounts(data.segmentCounts);
        }
      }
    } catch (err) {
      console.error("Failed to load workforce directory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [activeSegment, statusFilter, searchQuery]);

  // Handle open Add Modal
  const handleOpenAdd = () => {
    let cat = "OFFICE_STAFF";
    let unit = "STANDARD_ROOFS";
    let desig = "Staff";
    let mSal = 15000;
    let dWage = 850;

    if (activeSegment === "INVI_OFFICE") {
      cat = "OFFICE_STAFF";
      unit = "INVI_CREATION";
      desig = ""; // Kept blank for Invi team
      mSal = 15000;
      dWage = 0;
    } else if (activeSegment === "TAMIL") {
      cat = "TAMIL_LABOUR";
      desig = "Fitter / Layer";
      mSal = 0;
      dWage = 850;
    } else if (activeSegment === "HINDI") {
      cat = "HINDI_LABOUR";
      desig = "Site Helper";
      mSal = 0;
      dWage = 750;
    } else if (activeSegment === "CONTRACTOR") {
      cat = "CONTRACTOR_TEAM";
      desig = "Contractor Lead";
      mSal = 0;
      dWage = 1200;
    }

    setFormData({
      id: "",
      name: "",
      employeeCode: "",
      empCode: "",
      fatherName: "",
      dob: "",
      phone: "",
      address: "",
      photoUrl: "",
      category: cat,
      companyUnit: unit,
      designation: desig,
      monthlySalary: mSal,
      dailyWage: dWage,
      baseWage: 0,
      tradeSpecialty: "",
      contractorLeadName: "",
      defaultHeadcount: 1,
      dateOfJoining: new Date().toISOString().split("T")[0],
      aadhaarNumber: "",
      aadhaarDocUrl: "",
      panNumber: "",
      panDocUrl: "",
      drivingLicenseNumber: "",
      drivingLicenseDocUrl: "",
      bankAccountName: "",
      bankName: "",
      bankAccountNo: "",
      bankAccountNumber: "",
      bankIfsc: "",
      bankBranch: "",
      location: "Erode",
      state: "Tamil Nadu",
      defaultVehicleAllowance: 0,
      tenthDetails: "",
      twelfthDetails: "",
      graduationDetails: "",
      experienceJson: "",
    });
    setSelectedWorkerForAction(null);
    setModalKycTab("profile");
    setShowAddEditModal(true);
  };

  // Handle open Edit Modal
  const handleOpenEdit = (w: any) => {
    setSelectedWorkerForAction(w);
    setFormData({
      id: w.id,
      name: w.name || "",
      employeeCode: w.employeeCode || w.code || "",
      empCode: w.empCode || "",
      fatherName: w.fatherName || "",
      dob: w.dob || "",
      phone: w.phone || "",
      address: w.address || "",
      photoUrl: w.photoUrl || "",
      category: w.category || (activeSegment === "CONTRACTOR" ? "CONTRACTOR_TEAM" : "OFFICE_STAFF"),
      companyUnit: w.companyUnit || "STANDARD_ROOFS",
      designation: w.designation || w.role || "",
      monthlySalary: w.monthlySalary ? Number(w.monthlySalary) : 0,
      dailyWage: w.dailyWage ? Number(w.dailyWage) : w.dailyRate ? Number(w.dailyRate) : 850,
      baseWage: w.baseWage ? Number(w.baseWage) : 0,
      tradeSpecialty: w.tradeSpecialty || w.specialty || "",
      contractorLeadName: w.contractorLeadName || w.fatherName || "",
      defaultHeadcount: w.defaultHeadcount || 1,
      dateOfJoining: w.dateOfJoining ? w.dateOfJoining.split("T")[0] : "",
      aadhaarNumber: w.aadhaarNumber || "",
      aadhaarDocUrl: w.aadhaarDocUrl || "",
      panNumber: w.panNumber || "",
      panDocUrl: w.panDocUrl || "",
      drivingLicenseNumber: w.drivingLicenseNumber || "",
      drivingLicenseDocUrl: w.drivingLicenseDocUrl || "",
      bankAccountName: w.bankAccountName || w.name || "",
      bankName: w.bankName || "",
      bankAccountNo: w.bankAccountNo || w.bankAccountNumber || "",
      bankAccountNumber: w.bankAccountNumber || w.bankAccountNo || "",
      bankIfsc: w.bankIfsc || w.ifscCode || "",
      bankBranch: w.bankBranch || "",
      location: w.location || "Erode",
      state: w.state || "Tamil Nadu",
      defaultVehicleAllowance: w.defaultVehicleAllowance ? Number(w.defaultVehicleAllowance) : 0,
      tenthDetails: w.tenthDetails || "",
      twelfthDetails: w.twelfthDetails || "",
      graduationDetails: w.graduationDetails || "",
      experienceJson: w.experienceJson || "",
    });
    setModalKycTab("profile");
    setShowAddEditModal(true);
  };

  // Upload Document / Photo Handler
  const handleUploadFile = async (field: string, file: File) => {
    try {
      setUploadingField(field);
      const data = new FormData();
      data.append("file", file);
      if (formData.id) {
        data.append("employeeId", formData.id);
        data.append("documentType", field);
      }

      const res = await fetch("/api/upload/kyc", {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (json.success && json.url) {
        setFormData((prev) => ({
          ...prev,
          [field]: json.url,
        }));
      } else {
        alert(json.error || "File upload failed.");
      }
    } catch (err: any) {
      alert("Failed to upload: " + err.message);
    } finally {
      setUploadingField(null);
    }
  };

  // Save Worker
  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(formData.id);
      const isContractor = activeSegment === "CONTRACTOR" || formData.category === "CONTRACTOR_TEAM";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch("/api/labour", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          isContractor,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddEditModal(false);
        fetchWorkers();
      } else {
        alert(data.error || "Failed to save record.");
      }
    } catch (err: any) {
      alert("Error saving: " + err.message);
    }
  };

  // Soft Delete Worker to Recycle Bin
  const handleDeleteWorker = async () => {
    if (!selectedWorkerForAction) return;
    try {
      const isContractor = activeSegment === "CONTRACTOR" || selectedWorkerForAction.isContractor;
      const res = await fetch(
        `/api/labour?id=${selectedWorkerForAction.id}&isContractor=${isContractor ? "true" : "false"}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        setShowDeleteModal(false);
        setSelectedWorkerForAction(null);
        fetchWorkers();
      } else {
        alert(data.error || "Failed to delete record.");
      }
    } catch (err: any) {
      alert("Error deleting: " + err.message);
    }
  };

  // Export Table Data to Excel
  const handleExportExcel = () => {
    const exportRows = workers.map((w) => ({
      "Code / ID": w.employeeCode || w.code || "—",
      "Full Name": w.name,
      "Father / Lead": w.fatherName || w.contractorLeadName || "—",
      "Segment / Unit":
        w.companyUnit === "INVI_CREATION"
          ? "Invi Creation"
          : w.category === "OFFICE_STAFF"
          ? "Standard Roofs Office"
          : w.category === "TAMIL_LABOUR"
          ? "Tamil Site Labour"
          : w.category === "HINDI_LABOUR"
          ? "Hindi Crew"
          : "Contractor Team",
      "Designation / Role": w.designation || w.role || w.tradeSpecialty || w.specialty || "—",
      "Monthly Salary (₹)": isSuperAdmin && showSalaries && w.monthlySalary ? Number(w.monthlySalary) : "••••••",
      "Daily Wage / Rate (₹)": isSuperAdmin && showSalaries && (w.dailyWage || w.dailyRate) ? Number(w.dailyWage || w.dailyRate) : "••••••",
      "Phone": w.phone || "—",
      "Address / Native": w.address || "—",
      "Aadhaar Number": w.aadhaarNumber || "—",
      "PAN Number": w.panNumber || "—",
      "Driving License": w.drivingLicenseNumber || "—",
      "Bank Name": w.bankName || "—",
      "Account Number": w.bankAccountNo || w.bankAccountNumber || "—",
      "IFSC Code": w.bankIfsc || w.ifscCode || "—",
      "Branch": w.bankBranch || "—",
      "10th Standard": w.tenthDetails || "—",
      "12th Standard": w.twelfthDetails || "—",
      "Graduation": w.graduationDetails || "—",
      "Status": w.status,
    }));

    exportToExcel(exportRows, `SRBooks_Workforce_${activeSegment}_${statusFilter}`, "Workforce");
  };

  // Compute KYC Verification Badge
  const getKycBadge = (w: any) => {
    const hasAadhaar = Boolean(w.aadhaarNumber && w.aadhaarNumber.length >= 10);
    const hasBank = Boolean((w.bankAccountNo || w.bankAccountNumber) && (w.bankIfsc || w.ifscCode));
    const hasPan = Boolean(w.panNumber && w.panNumber.length >= 10);

    if (hasAadhaar && hasBank) {
      return { label: "Verified", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (hasAadhaar || hasBank || hasPan) {
      return { label: "Partial", color: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    return { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" };
  };

  return (
    <div className="max-w-[1700px] mx-auto px-3 sm:px-6 py-4 space-y-5 select-none font-sans pb-24 text-slate-800 dark:text-slate-100">
      {/* 1. TOP MODULE HEADER WITH ANALYTICS & QUICK ACTIONS */}
      <ModuleHeaderWithAnalytics
        title="Standard People Directory (HR & KYC Hub)"
        subtitle="Single Master Source of Truth for Standard Roofs Office, Invi Digital Hub, Tamil Labours, Hindi Crew & Contractors"
        storageKey="sr_labour_show_analytics"
        totalCount={segmentCounts.total}
        activeCount={segmentCounts.total}
        archivedCount={0}
        primaryAction={{
          label: `+ Add to ${
            activeSegment === "SR_OFFICE"
              ? "SR Office"
              : activeSegment === "INVI_OFFICE"
              ? "Invi Team"
              : activeSegment === "TAMIL"
              ? "Tamil Labour"
              : activeSegment === "HINDI"
              ? "Hindi Crew"
              : "Contractor"
          }`,
          onClick: handleOpenAdd,
        }}
        onImportExcel={() => setShowSmartImportModal(true)}
        onExportExcel={handleExportExcel}
        onPrintPDF={() => window.print()}
        extraControls={
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowSalaries((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition cursor-pointer"
                title="Toggle Salary Visibility (Super Admin Only)"
              >
                {showSalaries ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showSalaries ? "Hide Salaries" : "Show Salaries"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSmartImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Smart Import (.xlsx / .pdf)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer"
            >
              <Settings size={14} className="text-slate-600 dark:text-slate-400" />
              <span>Settings</span>
            </button>
          </div>
        }
        charts={[
          {
            title: "Workforce KYC Documentation Health",
            description: "Bank details & statutory Aadhaar cards captured across directory",
            type: "donut",
            data: [
              { name: "Fully Documented", value: 68, color: "#10b981" },
              { name: "Partial Records", value: 18, color: "#3b82f6" },
              { name: "Pending KYC", value: 9, color: "#f59e0b" },
            ],
          },
          {
            title: "Workforce Headcount Distribution",
            description: "Breakdown across 5 functional teams",
            type: "bar",
            data: [
              { name: "SR Office (10)", value: segmentCounts.srOffice, color: "#2563eb" },
              { name: "Invi Hub (3)", value: segmentCounts.inviOffice, color: "#8b5cf6" },
              { name: "Tamil Labours (71)", value: segmentCounts.tamil, color: "#10b981" },
              { name: "Hindi Crew (5)", value: segmentCounts.hindi, color: "#f59e0b" },
              { name: "Contractors (6)", value: segmentCounts.contractor, color: "#ec4899" },
            ],
          },
        ]}
      />

      {/* 2. THE 5 FLAGSHIP HRIS SEGMENT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Tab 1: Standard Roofs Office */}
        <button
          type="button"
          onClick={() => setActiveSegment("SR_OFFICE")}
          className={`rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
            activeSegment === "SR_OFFICE"
              ? "bg-white dark:bg-slate-900 border-blue-500/80 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10 scale-[1.01]"
              : "bg-white/95 dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-blue-300 hover:shadow-md"
          }`}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />
          <div className="p-4 sm:p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  activeSegment === "SR_OFFICE"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm"
                    : "bg-blue-50 text-blue-600 border border-blue-200/60"
                }`}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  {segmentCounts.srOffice}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold justify-end mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  HQ Team
                </span>
              </div>
            </div>
            <div className="mt-3.5">
              <h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">Standard Roofs Office</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">SR001 – SR010 • Core Operations</p>
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">KYC Health</span>
                <span className="font-bold text-blue-600">80% Complete</span>
              </div>
            </div>
          </div>
        </button>

        {/* Tab 2: Invi Creation Team */}
        <button
          type="button"
          onClick={() => setActiveSegment("INVI_OFFICE")}
          className={`rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
            activeSegment === "INVI_OFFICE"
              ? "bg-white dark:bg-slate-900 border-purple-500/80 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10 scale-[1.01]"
              : "bg-white/95 dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-purple-300 hover:shadow-md"
          }`}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600" />
          <div className="p-4 sm:p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  activeSegment === "INVI_OFFICE"
                    ? "bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-sm"
                    : "bg-purple-50 text-purple-600 border border-purple-200/60"
                }`}
              >
                <Users2 className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  {segmentCounts.inviOffice}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-purple-600 font-bold justify-end mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  Digital Hub
                </span>
              </div>
            </div>
            <div className="mt-3.5">
              <h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">Invi Creation Team</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Invi001 – Invi003 • Tech & Creative</p>
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">KYC Health</span>
                <span className="font-bold text-purple-600">100% Complete</span>
              </div>
            </div>
          </div>
        </button>

        {/* Tab 3: Tamil Site Labours */}
        <button
          type="button"
          onClick={() => setActiveSegment("TAMIL")}
          className={`rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
            activeSegment === "TAMIL"
              ? "bg-white dark:bg-slate-900 border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10 scale-[1.01]"
              : "bg-white/95 dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 hover:shadow-md"
          }`}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500" />
          <div className="p-4 sm:p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  activeSegment === "TAMIL"
                    ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                }`}
              >
                <HardHat className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  {segmentCounts.tamil}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold justify-end mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  On Site
                </span>
              </div>
            </div>
            <div className="mt-3.5">
              <h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">Tamil Site Labours</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">71 Masons, Fitters & Layers</p>
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">KYC Health</span>
                <span className="font-bold text-emerald-600">75% Complete</span>
              </div>
            </div>
          </div>
        </button>

        {/* Tab 4: Hindi Helpers & Crew */}
        <button
          type="button"
          onClick={() => setActiveSegment("HINDI")}
          className={`rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
            activeSegment === "HINDI"
              ? "bg-white dark:bg-slate-900 border-amber-500/80 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10 scale-[1.01]"
              : "bg-white/95 dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-amber-300 hover:shadow-md"
          }`}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
          <div className="p-4 sm:p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  activeSegment === "HINDI"
                    ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm"
                    : "bg-amber-50 text-amber-600 border border-amber-200/60"
                }`}
              >
                <Users2 className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  {segmentCounts.hindi}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-amber-600 font-bold justify-end mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Migrant Crew
                </span>
              </div>
            </div>
            <div className="mt-3.5">
              <h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">Hindi Helpers & Crew</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">5 Dedicated Site Helpers</p>
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">KYC Health</span>
                <span className="font-bold text-amber-600">80% Complete</span>
              </div>
            </div>
          </div>
        </button>

        {/* Tab 5: Contractor Teams */}
        <button
          type="button"
          onClick={() => setActiveSegment("CONTRACTOR")}
          className={`rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer col-span-2 sm:col-span-1 group ${
            activeSegment === "CONTRACTOR"
              ? "bg-white dark:bg-slate-900 border-cyan-500/80 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10 scale-[1.01]"
              : "bg-white/95 dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-cyan-300 hover:shadow-md"
          }`}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600" />
          <div className="p-4 sm:p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  activeSegment === "CONTRACTOR"
                    ? "bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-sm"
                    : "bg-cyan-50 text-cyan-600 border border-cyan-200/60"
                }`}
              >
                <Truck className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  {segmentCounts.contractor}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-cyan-600 font-bold justify-end mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  Agencies
                </span>
              </div>
            </div>
            <div className="mt-3.5">
              <h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">Contractor Teams</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">6 Specialized Agencies</p>
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">KYC Health</span>
                <span className="font-bold text-cyan-600">83% Complete</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* 3. TOOLBAR & INSTANT SEARCH */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, phone, Aadhaar, PAN, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher: Table vs Cards */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Modern SaaS Table View"
            >
              <List size={13} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Rich Interactive Cards View"
            >
              <LayoutGrid size={13} />
              <span>Cards</span>
            </button>
          </div>

          {/* Active / Archived Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === "ACTIVE"
                  ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                  : "text-slate-500"
              }`}
            >
              Active ({workers.length})
            </button>
            <button
              onClick={() => setStatusFilter("ARCHIVED")}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === "ARCHIVED"
                  ? "bg-white dark:bg-slate-900 text-rose-600 shadow-xs"
                  : "text-slate-500"
              }`}
            >
              Archived
            </button>
          </div>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowSalaries((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer shadow-xs ${
                showSalaries
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
              }`}
              title="Toggle Salary Visibility (Super Admin Only)"
            >
              {showSalaries ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{showSalaries ? "Hide Salaries" : "Show Salaries"}</span>
            </button>
          )}

          <Link
            href="/attendance"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 transition shadow-xs"
          >
            <Clock size={13} />
            <span>Attendance Grid &rarr;</span>
          </Link>
        </div>
      </div>

      {/* 4. WORKFORCE & KYC MASTER DIRECTORY (TABLE OR RICH CARDS) */}
      <div className="bg-white/95 dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]">
        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gradient-to-r from-indigo-50 via-sky-50 to-teal-50 text-slate-800 font-bold uppercase text-xs tracking-wider border-b border-indigo-200/80">
                <tr>
                  <th className="py-3.5 px-4 text-slate-700">Personnel Profile</th>
                  <th className="py-3.5 px-4 text-slate-700">
                    {activeSegment === "CONTRACTOR" ? "Trade Specialty" : "Designation / Role"}
                  </th>
                  <th className="py-3.5 px-4 text-right text-slate-700">
                    {activeSegment === "SR_OFFICE" || activeSegment === "INVI_OFFICE"
                      ? "Monthly Salary"
                      : activeSegment === "CONTRACTOR"
                      ? "Contract / Rate"
                      : "Daily Wage"}
                  </th>
                  <th className="py-3.5 px-4 text-slate-700">Contact & Location</th>
                  <th className="py-3.5 px-4 text-slate-700">Aadhaar & PAN / DL</th>
                  <th className="py-3.5 px-4 text-slate-700">Bank Remittance</th>
                  <th className="py-3.5 px-4 text-center text-slate-700">KYC Status</th>
                  <th className="py-3.5 px-4 text-right text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                      Loading workforce directory...
                    </td>
                  </tr>
                ) : workers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No workforce profiles found matching current filters.
                    </td>
                  </tr>
                ) : (
                  workers.map((w) => {
                    const kyc = getKycBadge(w);
                    const isContractor = activeSegment === "CONTRACTOR" || w.category === "CONTRACTOR_TEAM";

                    const initials = (w.name || "SR")
                      .split(" ")
                      .filter(Boolean)
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    const avatarGrad =
                      w.companyUnit === "INVI_CREATION"
                        ? "from-purple-600 to-fuchsia-600 text-white"
                        : w.category === "OFFICE_STAFF"
                        ? "from-blue-600 to-indigo-600 text-white"
                        : w.category === "TAMIL_LABOUR"
                        ? "from-emerald-600 to-teal-600 text-white"
                        : w.category === "HINDI_LABOUR"
                        ? "from-amber-500 to-orange-500 text-white"
                        : "from-cyan-600 to-blue-600 text-white";

                    return (
                      <tr
                        key={w.id}
                        className="hover:bg-blue-50/60 dark:hover:bg-slate-800/80 transition-all group"
                      >
                        {/* Column 1: Personnel Profile with Gradient Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedWorkerForKyc(w)}
                              className="shrink-0 cursor-pointer transition-transform group-hover:scale-105"
                              title="Open Worker KYC Dossier"
                            >
                              {w.photoUrl ? (
                                <img
                                  src={w.photoUrl}
                                  alt={w.name}
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                                />
                              ) : (
                                <InitialsAvatar name={w.name || "SR"} />
                              )}
                            </button>

                            <div>
                              <button
                                type="button"
                                onClick={() => setSelectedWorkerForKyc(w)}
                                className="font-bold text-slate-900 dark:text-slate-100 text-left hover:text-blue-600 transition flex items-center gap-1.5 cursor-pointer text-[14px]"
                              >
                                <span>{w.name}</span>
                                <FileCheck className="w-3.5 h-3.5 text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                              </button>
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
                                <span className="font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px]">
                                  {w.employeeCode || w.code || "—"}
                                </span>
                                {(w.fatherName || w.contractorLeadName) && (
                                  <span className="truncate max-w-[140px]">
                                    • {isContractor ? `Lead: ${w.contractorLeadName || w.fatherName}` : `S/O ${w.fatherName}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Designation / Specialty Badge */}
                        <td className="py-3.5 px-4">
                          {isContractor ? (
                            <div>
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200/80 inline-block">
                                {w.tradeSpecialty || w.specialty || "Roofing & Fabrication"}
                              </span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Default Headcount: {w.defaultHeadcount || 1} Labours
                              </span>
                            </div>
                          ) : activeSegment === "INVI_OFFICE" ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 inline-block">
                              {w.designation || w.role || "Digital Hub"}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-200 inline-block">
                              {w.designation || w.role || "Staff"}
                            </span>
                          )}
                        </td>

                        {/* Column 3: Wage / Salary (Masked unless SUPER_ADMIN + Show Salaries) */}
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                          {!isSuperAdmin || !showSalaries || w.salaryMasked ? (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs tracking-widest">
                              ••••••
                            </span>
                          ) : w.monthlySalary && Number(w.monthlySalary) > 0 ? (
                            <div className="inline-block">
                              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold px-2.5 py-0.5 rounded-lg text-[13px] block">
                                {formatINR(Number(w.monthlySalary))}
                              </span>
                              <span className="text-[10px] text-slate-500 block font-sans mt-0.5">/ month</span>
                            </div>
                          ) : w.dailyWage || w.dailyRate ? (
                            <div className="inline-block">
                              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold px-2.5 py-0.5 rounded-lg text-[13px] block">
                                ₹{Number(w.dailyWage || w.dailyRate).toLocaleString("en-IN")}
                              </span>
                              <span className="text-[10px] text-slate-500 block font-sans mt-0.5">/ day</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Column 4: Contact & Location */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{w.phone || "—"}</span>
                          </div>
                          {w.address && (
                            <span className="text-[11px] text-slate-400 block truncate max-w-[160px] mt-0.5" title={w.address}>
                              {w.address}
                            </span>
                          )}
                        </td>

                        {/* Column 5: Statutory Identity Micro-Badges */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {w.aadhaarNumber ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 inline-flex items-center gap-0.5">
                                ✓ UID ..{w.aadhaarNumber.slice(-4)}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-400 border border-slate-200/60">
                                No Aadhaar
                              </span>
                            )}
                            {w.panNumber ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/80 inline-flex items-center gap-0.5">
                                ✓ PAN
                              </span>
                            ) : null}
                            {w.drivingLicenseNumber ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 inline-flex items-center gap-0.5">
                                ✓ DL
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Column 6: Bank Remittance */}
                        <td className="py-3.5 px-4 text-xs">
                          {w.bankAccountNo || w.bankAccountNumber ? (
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                {w.bankName || "Bank"} ..{(w.bankAccountNo || w.bankAccountNumber).slice(-4)}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono block">
                                {w.bankIfsc || w.ifscCode || "—"}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 inline-block">
                              No Bank on File
                            </span>
                          )}
                        </td>

                        {/* Column 7: KYC Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${kyc.color}`}
                          >
                            {kyc.label === "Verified" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            <span>{kyc.label}</span>
                          </span>
                        </td>

                        {/* Column 8: Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedWorkerForKyc(w)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                              title="View Full KYC Profile Drawer & Print Dossier"
                            >
                              <FileCheck className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedWorkerForDossier(w)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                              title="View Lifetime Multi-Year Attendance Dossier"
                            >
                              <History className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(w)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                              title="Edit Workforce Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWorkerForAction(w);
                                setShowDeleteModal(true);
                              }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Soft-Delete to Recycle Bin"
                            >
                              <Trash2 className="w-4 h-4" />
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
        ) : (
          /* RICH SAAS CARDS VIEW */
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
                Loading workforce directory cards...
              </div>
            ) : workers.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                No workforce profiles found matching current filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
                {workers.map((w) => {
                  const kyc = getKycBadge(w);
                  const isContractor = activeSegment === "CONTRACTOR" || w.category === "CONTRACTOR_TEAM";

                  const initials = (w.name || "SR")
                    .split(" ")
                    .filter(Boolean)
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const avatarGrad =
                    w.companyUnit === "INVI_CREATION"
                      ? "from-purple-600 to-fuchsia-600 text-white"
                      : w.category === "OFFICE_STAFF"
                      ? "from-blue-600 to-indigo-600 text-white"
                      : w.category === "TAMIL_LABOUR"
                      ? "from-emerald-600 to-teal-600 text-white"
                      : w.category === "HINDI_LABOUR"
                      ? "from-amber-500 to-orange-500 text-white"
                      : "from-cyan-600 to-blue-600 text-white";

                  // KYC completion calculation
                  let kycPoints = 0;
                  if (w.aadhaarNumber) kycPoints += 25;
                  if (w.panNumber || w.drivingLicenseNumber) kycPoints += 25;
                  if (w.bankAccountNo || w.bankAccountNumber) kycPoints += 25;
                  if (w.phone && w.address) kycPoints += 25;
                  const kycPercent = Math.max(25, kycPoints);

                  return (
                    <div
                      key={w.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                    >
                      {/* Top accent light bar */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 opacity-80 group-hover:opacity-100 transition-opacity" />

                      <div>
                        {/* Header: Avatar, Name, Code & Actions */}
                        <div className="flex items-start justify-between gap-3 pt-1">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedWorkerForKyc(w)}
                              className="shrink-0 cursor-pointer transition-transform group-hover:scale-105"
                              title="Open Worker KYC Dossier"
                            >
                              {w.photoUrl ? (
                                <img
                                  src={w.photoUrl}
                                  alt={w.name}
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                                />
                              ) : (
                                <InitialsAvatar name={w.name || "SR"} />
                              )}
                            </button>

                            <div>
                              <button
                                type="button"
                                onClick={() => setSelectedWorkerForKyc(w)}
                                className="font-bold text-slate-900 dark:text-slate-100 text-left hover:text-blue-600 transition flex items-center gap-1.5 cursor-pointer text-[15px]"
                              >
                                <span>{w.name}</span>
                                <FileCheck className="w-3.5 h-3.5 text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                              </button>
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
                                <span className="font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px]">
                                  {w.employeeCode || w.code || "—"}
                                </span>
                                {(w.fatherName || w.contractorLeadName) && (
                                  <span className="truncate max-w-[130px]">
                                    • {isContractor ? `Lead: ${w.contractorLeadName || w.fatherName}` : `S/O ${w.fatherName}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedWorkerForKyc(w)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="KYC Dossier"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(w)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Edit Worker"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Middle Info: Role Badge & Salary Pill */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            {isContractor ? (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200/80 inline-block">
                                {w.tradeSpecialty || w.specialty || "Roofing & Fabrication"}
                              </span>
                            ) : activeSegment === "INVI_OFFICE" ? (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 inline-block">
                                {w.designation || w.role || "Digital Hub"}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-200 inline-block">
                                {w.designation || w.role || "Staff"}
                              </span>
                            )}
                          </div>

                          <div>
                            {w.monthlySalary && Number(w.monthlySalary) > 0 ? (
                              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold px-2.5 py-0.5 rounded-lg text-xs font-mono inline-block">
                                {formatINR(Number(w.monthlySalary))}/mo
                              </span>
                            ) : w.dailyWage || w.dailyRate ? (
                              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold px-2.5 py-0.5 rounded-lg text-xs font-mono inline-block">
                                ₹{Number(w.dailyWage || w.dailyRate).toLocaleString("en-IN")}/day
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </div>
                        </div>

                        {/* Contact & Banking preview */}
                        <div className="mt-2.5 space-y-1 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5 font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{w.phone || "No Phone recorded"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">
                              {w.bankAccountNo || w.bankAccountNumber
                                ? `${w.bankName || "Bank"} ••${(w.bankAccountNo || w.bankAccountNumber).slice(-4)}`
                                : "No Bank details"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom: KYC Health Progress Bar & Status Pill */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-400 font-semibold">KYC Verification</span>
                          <span
                            className={`font-bold text-[11px] ${
                              kycPercent === 100 ? "text-emerald-600" : "text-blue-600"
                            }`}
                          >
                            {kycPercent}% Complete
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              kycPercent === 100
                                ? "bg-emerald-500"
                                : kycPercent >= 75
                                ? "bg-blue-600"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${kycPercent}%` }}
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border shadow-2xs ${kyc.color}`}
                          >
                            {kyc.label === "Verified" ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                            )}
                            <span>{kyc.label}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => setSelectedWorkerForDossier(w)}
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>Muster Dossier &rarr;</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. WORKER KYC PROFILE DRAWER */}
      <WorkerKycProfileDrawer
        isOpen={Boolean(selectedWorkerForKyc)}
        onClose={() => setSelectedWorkerForKyc(null)}
        worker={selectedWorkerForKyc}
        salaryVisible={isSuperAdmin && showSalaries}
        onEdit={(w) => {
          setSelectedWorkerForKyc(null);
          handleOpenEdit(w);
        }}
        onRefresh={fetchWorkers}
        onOpenOfferLetter={(w) => setOfferExitModal({ mode: "OFFER_LETTER", worker: w })}
        onOpenExitFnf={(w) => setOfferExitModal({ mode: "EXIT_FNF", worker: w })}
      />

      {offerExitModal && (
        <OfferLetterAndExitModal
          mode={offerExitModal.mode}
          worker={offerExitModal.worker}
          salaryVisible={isSuperAdmin || showSalaries}
          onClose={() => setOfferExitModal(null)}
          onSuccess={() => fetchWorkers()}
        />
      )}

      {/* 6. LIFETIME ATTENDANCE DOSSIER MODAL */}
      <EmployeeMultiYearDossierModal
        isOpen={Boolean(selectedWorkerForDossier)}
        onClose={() => setSelectedWorkerForDossier(null)}
        employee={selectedWorkerForDossier}
        isContractorTeam={activeSegment === "CONTRACTOR"}
      />

      {/* 7. SMART IMPORT MODAL */}
      <LabourSmartImportModal
        isOpen={showSmartImportModal}
        onClose={() => setShowSmartImportModal(false)}
        defaultCategory={
          activeSegment === "TAMIL"
            ? "TAMIL_LABOUR"
            : activeSegment === "HINDI"
            ? "HINDI_LABOUR"
            : activeSegment === "CONTRACTOR"
            ? "CONTRACTOR_TEAM"
            : "OFFICE_STAFF"
        }
        defaultCompanyUnit={activeSegment === "INVI_OFFICE" ? "INVI_CREATION" : "STANDARD_ROOFS"}
        onImportComplete={fetchWorkers}
      />

      {/* 8. ATTENDANCE & WORKFORCE SETTINGS MODAL */}
      <AttendanceSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onRefreshData={fetchWorkers}
      />

      {/* 9. ADD / EDIT WORKER MODAL WITH FULL KYC & UPLOADS */}
      {showAddEditModal && (
        <ViewportPortal onBackdropClick={() => setShowAddEditModal(false)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    {formData.id ? `Edit Profile: ${formData.name}` : `New Workforce Registration`}
                    {formData.employeeCode && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {formData.employeeCode}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enterprise statutory KYC, banking credentials, identity documents and compensation
                  </p>
                </div>
              </div>

              {/* Standard Circular X Close Button */}
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-sm focus:outline-none cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Structured Multi-Step KYC Tabs */}
            <div className="flex items-center px-6 pt-3 pb-2 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 gap-2 overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setModalKycTab("profile")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                  modalKycTab === "profile"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                <span>👤 Profile & Role</span>
              </button>
              <button
                type="button"
                onClick={() => setModalKycTab("kyc")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                  modalKycTab === "kyc"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                <ShieldCheck size={14} />
                <span>KYC & Documents</span>
                {(formData.aadhaarDocUrl || formData.panDocUrl || formData.drivingLicenseDocUrl) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setModalKycTab("bank")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                  modalKycTab === "bank"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                <Building size={14} />
                <span>Bank Details</span>
                {formData.bankAccountNumber && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setModalKycTab("education")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                  modalKycTab === "education"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                <GraduationCap size={14} />
                <span>Education & Experience</span>
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveWorker} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* TAB 1: PROFILE & ROLE */}
              {modalKycTab === "profile" && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Photo & Basic Details */}
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    {/* Photo Upload Box */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center relative group">
                        {formData.photoUrl ? (
                          <img
                            src={formData.photoUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-2">
                            <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                            <span className="text-[10px] text-slate-400 font-semibold block">Photo</span>
                          </div>
                        )}
                        {uploadingField === "photoUrl" && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <label className="cursor-pointer text-[11px] font-bold text-blue-600 hover:text-blue-700">
                        Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadFile("photoUrl", file);
                          }}
                        />
                      </label>
                    </div>

                    {/* Name, Code, Father */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Senthil Kumar"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Employee / Contractor ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. SR011, TL-072, CON-007"
                          value={formData.employeeCode || formData.empCode}
                          onChange={(e) =>
                            setFormData({ ...formData, employeeCode: e.target.value, empCode: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Father / Team Lead Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Murugesan"
                          value={formData.fatherName || formData.contractorLeadName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fatherName: e.target.value,
                              contractorLeadName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={formData.dob}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Segment, Role & Compensation */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10.5px] tracking-wider">
                      Workforce Category & Remuneration
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none focus:border-blue-500"
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
                          onChange={(e) => setFormData({ ...formData, companyUnit: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none focus:border-blue-500"
                        >
                          <option value="STANDARD_ROOFS">Standard Roofs</option>
                          <option value="INVI_CREATION">Invi Creation</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Designation / Trade Specialty
                        </label>
                        <input
                          type="text"
                          placeholder={formData.companyUnit === "INVI_CREATION" ? "(Optional)" : "e.g. Fitter, Welder, HR"}
                          value={formData.designation || formData.tradeSpecialty}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              designation: e.target.value,
                              tradeSpecialty: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>

                      {formData.category === "OFFICE_STAFF" ? (
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Fixed Monthly Salary (₹)
                          </label>
                          <input
                            type="number"
                            value={formData.monthlySalary}
                            onChange={(e) =>
                              setFormData({ ...formData, monthlySalary: Number(e.target.value) || 0 })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none focus:border-blue-500"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Daily Wage / Rate (₹)
                          </label>
                          <input
                            type="number"
                            value={formData.dailyWage}
                            onChange={(e) =>
                              setFormData({ ...formData, dailyWage: Number(e.target.value) || 0 })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none focus:border-blue-500"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 9876543210"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date of Joining</label>
                        <input
                          type="date"
                          value={formData.dateOfJoining}
                          onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Location / Branch</label>
                        <input
                          type="text"
                          placeholder="e.g. Erode"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">State</label>
                        <input
                          type="text"
                          placeholder="e.g. Tamil Nadu"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Default Vehicle Allowance (₹)
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={formData.defaultVehicleAllowance}
                          onChange={(e) =>
                            setFormData({ ...formData, defaultVehicleAllowance: Number(e.target.value) || 0 })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Full Address */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Residential Address</label>
                    <textarea
                      rows={2}
                      placeholder="Street, Village / Town, District, State, PIN"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: KYC & STATUTORY DOCUMENTS */}
              {modalKycTab === "kyc" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                    <h4 className="font-bold text-blue-700 dark:text-blue-400 uppercase text-[10.5px] tracking-wider">
                      Statutory Identity & KYC Documents
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Aadhaar (12 Digits)</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            maxLength={14}
                            placeholder="1234 5678 9012"
                            value={formData.aadhaarNumber}
                            onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono outline-none focus:border-blue-500"
                          />
                          <label className="px-2.5 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 cursor-pointer flex items-center justify-center shrink-0" title="Upload Aadhaar">
                            <Upload className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadFile("aadhaarDocUrl", f);
                              }}
                            />
                          </label>
                        </div>
                        {formData.aadhaarDocUrl && (
                          <a href={formData.aadhaarDocUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 hover:underline mt-1 block">
                            ✓ Aadhaar Document Uploaded
                          </a>
                        )}
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">PAN Card</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            maxLength={10}
                            placeholder="ABCDE1234F"
                            value={formData.panNumber}
                            onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono uppercase outline-none focus:border-blue-500"
                          />
                          <label className="px-2.5 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 cursor-pointer flex items-center justify-center shrink-0" title="Upload PAN">
                            <Upload className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadFile("panDocUrl", f);
                              }}
                            />
                          </label>
                        </div>
                        {formData.panDocUrl && (
                          <a href={formData.panDocUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 hover:underline mt-1 block">
                            ✓ PAN Document Uploaded
                          </a>
                        )}
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Driving License</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="TN3320150001234"
                            value={formData.drivingLicenseNumber}
                            onChange={(e) => setFormData({ ...formData, drivingLicenseNumber: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono outline-none focus:border-blue-500"
                          />
                          <label className="px-2.5 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 cursor-pointer flex items-center justify-center shrink-0" title="Upload Driving License">
                            <Upload className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadFile("drivingLicenseDocUrl", f);
                              }}
                            />
                          </label>
                        </div>
                        {formData.drivingLicenseDocUrl && (
                          <a href={formData.drivingLicenseDocUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 hover:underline mt-1 block">
                            ✓ DL Document Uploaded
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BANK REMITTANCE */}
              {modalKycTab === "bank" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                    <h4 className="font-bold text-emerald-700 dark:text-emerald-400 uppercase text-[10.5px] tracking-wider">
                      Direct Bank Remittance Credentials
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                        <input
                          type="text"
                          placeholder="e.g. State Bank of India"
                          value={formData.bankName}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 39281048192"
                          value={formData.bankAccountNo || formData.bankAccountNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bankAccountNo: e.target.value,
                              bankAccountNumber: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">IFSC Code</label>
                        <input
                          type="text"
                          placeholder="e.g. SBIN0001234"
                          value={formData.bankIfsc}
                          onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono uppercase outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Branch Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Erode Main"
                          value={formData.bankBranch}
                          onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: EDUCATION & EXPERIENCE */}
              {modalKycTab === "education" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                    <h4 className="font-bold text-purple-700 dark:text-purple-400 uppercase text-[10.5px] tracking-wider">
                      Education & Prior Experience
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">10th Standard</label>
                        <input
                          type="text"
                          placeholder="School, Year, Percentage"
                          value={formData.tenthDetails}
                          onChange={(e) => setFormData({ ...formData, tenthDetails: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">12th Standard</label>
                        <input
                          type="text"
                          placeholder="School, Year, Percentage"
                          value={formData.twelfthDetails}
                          onChange={(e) => setFormData({ ...formData, twelfthDetails: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Degree / Diploma</label>
                        <input
                          type="text"
                          placeholder="College, Degree, Year"
                          value={formData.graduationDetails}
                          onChange={(e) => setFormData({ ...formData, graduationDetails: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {modalKycTab !== "profile" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalKycTab === "education") setModalKycTab("bank");
                        else if (modalKycTab === "bank") setModalKycTab("kyc");
                        else if (modalKycTab === "kyc") setModalKycTab("profile");
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-semibold transition"
                    >
                      ← Previous
                    </button>
                  )}
                  {modalKycTab !== "education" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalKycTab === "profile") setModalKycTab("kyc");
                        else if (modalKycTab === "kyc") setModalKycTab("bank");
                        else if (modalKycTab === "bank") setModalKycTab("education");
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                    >
                      Next Step →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEditModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-md shadow-blue-500/20"
                  >
                    Save Profile & KYC
                  </button>
                </div>
              </div>
            </form>
          </div>
        </ViewportPortal>
      )}

      {/* 10. ARCHIVE / SOFT-DELETE CONFIRM MODAL */}
      {showDeleteModal && selectedWorkerForAction && (
        <ArchiveConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedWorkerForAction(null);
          }}
          onConfirm={handleDeleteWorker}
          title={`Archive ${selectedWorkerForAction.name} (${selectedWorkerForAction.employeeCode || selectedWorkerForAction.code})`}
          message={`Are you sure you want to move this record to the Recycle Bin? All attendance logs and historical wage entries will remain preserved.`}
          isRestore={false}
        />
      )}
    </div>
  );
}
