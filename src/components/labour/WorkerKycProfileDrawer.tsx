"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  Edit2,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Building2,
  CreditCard,
  GraduationCap,
  Briefcase,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  FileCheck,
  ShieldCheck,
  HardHat,
  Truck,
  Users2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";
import { ViewportPortal } from "@/components/ui/ViewportPortal";
import EmployeeSalaryHistoryModal from "@/components/payroll/EmployeeSalaryHistoryModal";

export interface WorkerKycData {
  id: string;
  name: string;
  employeeCode: string;
  empCode?: string | null;
  fatherName?: string | null;
  dob?: string | null;
  phone?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  panNumber?: string | null;
  panDocUrl?: string | null;
  aadhaarNumber?: string | null;
  aadhaarDocUrl?: string | null;
  drivingLicenseNumber?: string | null;
  drivingLicenseDocUrl?: string | null;
  kycDocumentsJson?: string | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankBranch?: string | null;
  tenthDetails?: string | null;
  twelfthDetails?: string | null;
  graduationDetails?: string | null;
  experienceJson?: string | null;
  contractorLeadName?: string | null;
  defaultHeadcount?: number | null;
  tradeSpecialty?: string | null;
  specialty?: string | null;
  designation?: string | null;
  role?: string | null;
  category: string;
  companyUnit: string;
  dailyWage?: number | string | null;
  monthlySalary?: number | string | null;
  baseWage?: number | string | null;
  dateOfJoining?: string | null;
  status: string;
  isContractor?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerKycData | null;
  salaryVisible?: boolean;
  onEdit: (worker: WorkerKycData) => void;
  onRefresh: () => void;
  onOpenOfferLetter?: (worker: WorkerKycData) => void;
  onOpenExitFnf?: (worker: WorkerKycData) => void;
}

export default function WorkerKycProfileDrawer({
  isOpen,
  onClose,
  worker,
  salaryVisible = false,
  onEdit,
  onRefresh,
  onOpenOfferLetter,
  onOpenExitFnf,
}: Props) {
  const [activeTab, setActiveTab] = useState<"DOCS" | "BANK" | "EDUCATION" | "EXPERIENCE" | "WAGE">("DOCS");
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [showSalaryHistory, setShowSalaryHistory] = useState(false);
  const [customDocLabel, setCustomDocLabel] = useState("");
  const [vaultDocs, setVaultDocs] = useState<Array<{ id?: string; label: string; url: string; fileName?: string; ext?: string; uploadedAt?: string }>>(() => {
    try {
      if (worker?.kycDocumentsJson) {
        const parsed = JSON.parse(worker.kycDocumentsJson);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  React.useEffect(() => {
    try {
      if (worker?.kycDocumentsJson) {
        const parsed = JSON.parse(worker.kycDocumentsJson);
        if (Array.isArray(parsed)) {
          setVaultDocs(parsed);
          return;
        }
      }
    } catch {}
    setVaultDocs([]);
  }, [worker?.id, worker?.kycDocumentsJson]);

  if (!isOpen || !worker) return null;

  const isOffice = worker.category === "OFFICE_STAFF";
  const isInvi = worker.companyUnit === "INVI_CREATION";
  const isContractor = worker.category === "CONTRACTOR_TEAM" || worker.isContractor;
  const isTamil = worker.category === "TAMIL_LABOUR";
  const isHindi = worker.category === "HINDI_LABOUR";

  // Calculate KYC Completion Score
  const kycChecks = [
    Boolean(worker.name),
    Boolean(worker.phone),
    Boolean(worker.aadhaarNumber),
    Boolean(worker.bankAccountNo || worker.bankAccountNumber),
    Boolean(worker.panNumber || isTamil),
  ];
  const completedChecks = kycChecks.filter(Boolean).length;
  const kycScore = Math.round((completedChecks / kycChecks.length) * 100);

  const kycStatus =
    kycScore === 100
      ? { label: "KYC Verified", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200" }
      : kycScore >= 60
      ? { label: "Partial Documentation", bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200" }
      : { label: "Pending KYC", bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200" };

  // Parse Education & Experience JSON if available
  let experienceList: any[] = [];
  try {
    if (worker.experienceJson) {
      experienceList = JSON.parse(worker.experienceJson);
    }
  } catch (e) {
    experienceList = [];
  }

  // Handle direct document upload from drawer
  const handleQuickUpload = async (docType: "photo" | "pan" | "aadhaar" | "driving_license", file: File) => {
    try {
      setUploadingDoc(docType);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("documentType", docType);
      fd.append("employeeId", worker.id);
      fd.append("employeeCode", worker.employeeCode);

      const res = await fetch("/api/upload/kyc", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.error || "Failed to upload document.");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Error uploading file.");
    } finally {
      setUploadingDoc(null);
    }
  };

  // Print Branded A4 KYC Dossier
  const handlePrintDossier = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) {
      alert("Please allow popups to print KYC Dossier.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>KYC Dossier - ${worker.name} (${worker.employeeCode})</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 11px; }
            .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
            .org-title { font-size: 16px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin: 0; }
            .org-sub { font-size: 9px; color: #475569; margin: 2px 0 0 0; }
            .dossier-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #1e40af; text-align: right; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; background: #e0f2fe; color: #0369a1; }
            .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 12px 0 6px 0; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
            .data-grid { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            .data-grid td { padding: 4px 6px; font-size: 10.5px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            .data-grid td.label { font-weight: bold; color: #475569; width: 28%; }
            .data-grid td.val { color: #0f172a; font-weight: 600; }
            .photo-box { width: 90px; height: 110px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; vertical-align: middle; background: #f8fafc; font-size: 9px; color: #94a3b8; }
            .footer { position: fixed; bottom: 0; left: 0; right: 0; font-size: 9px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <h1 class="org-title">Standard Roofs — High Quality Roofing Solutions</h1>
                <p class="org-sub">Headquarters: 144, Vellakkal Medu, Nasiyanur Post, Erode 638107, Tamil Nadu</p>
                <p class="org-sub">Official HRIS & Workforce Compliance Dossier &middot; Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
              </td>
              <td style="text-align: right;">
                <div class="dossier-title">Workforce KYC Dossier</div>
                <div class="badge">${worker.category.replace(/_/g, " ")} &middot; ${worker.companyUnit}</div>
              </td>
            </tr>
          </table>

          <table style="width: 100%; margin-bottom: 10px;">
            <tr>
              <td style="vertical-align: top;">
                <div class="section-title">1. Personal & Identity Details</div>
                <table class="data-grid">
                  <tr><td class="label">Full Name:</td><td class="val">${worker.name}</td></tr>
                  <tr><td class="label">Workforce ID / Code:</td><td class="val" style="font-family: monospace;">${worker.employeeCode}</td></tr>
                  <tr><td class="label">Designation / Role:</td><td class="val">${worker.designation || worker.role || (isInvi ? "Digital Specialist" : "Staff")}</td></tr>
                  <tr><td class="label">Father's Name:</td><td class="val">${worker.fatherName || "—"}</td></tr>
                  <tr><td class="label">Date of Birth:</td><td class="val">${worker.dob || "—"}</td></tr>
                  <tr><td class="label">Primary Phone:</td><td class="val">${worker.phone || "—"}</td></tr>
                  <tr><td class="label">Permanent Address:</td><td class="val">${worker.address || "—"}</td></tr>
                </table>
              </td>
              <td style="width: 110px; text-align: right; vertical-align: top; padding-left: 12px;">
                ${
                  worker.photoUrl
                    ? `<img src="${worker.photoUrl}" style="width: 100px; height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1;" />`
                    : `<div class="photo-box" style="display: flex; align-items: center; justify-content: center; height: 120px;">Affix Photo</div>`
                }
              </td>
            </tr>
          </table>

          <div class="section-title">2. Government Identity & Compliance Proofs</div>
          <table class="data-grid">
            <tr>
              <td class="label">Aadhaar Card No:</td>
              <td class="val" style="font-family: monospace;">${worker.aadhaarNumber ? `XXXX-XXXX-${worker.aadhaarNumber.slice(-4)}` : "—"}</td>
              <td class="label">Aadhaar Document:</td>
              <td class="val">${worker.aadhaarDocUrl ? "Verified & Attached" : "Pending Upload"}</td>
            </tr>
            <tr>
              <td class="label">PAN Card No:</td>
              <td class="val" style="font-family: monospace;">${worker.panNumber || "—"}</td>
              <td class="label">PAN Document:</td>
              <td class="val">${worker.panDocUrl ? "Verified & Attached" : "Pending Upload"}</td>
            </tr>
            <tr>
              <td class="label">Driving License:</td>
              <td class="val" style="font-family: monospace;">${worker.drivingLicenseNumber || "—"}</td>
              <td class="label">DL Document:</td>
              <td class="val">${worker.drivingLicenseDocUrl ? "Verified & Attached" : "Not Provided"}</td>
            </tr>
          </table>

          <div class="section-title">3. Banking & Direct Salary Disbursement</div>
          <table class="data-grid">
            <tr>
              <td class="label">Account Holder:</td>
              <td class="val">${worker.bankAccountName || worker.name}</td>
              <td class="label">Bank Name:</td>
              <td class="val">${worker.bankName || "—"}</td>
            </tr>
            <tr>
              <td class="label">Account Number:</td>
              <td class="val" style="font-family: monospace;">${worker.bankAccountNumber || worker.bankAccountNo || "—"}</td>
              <td class="label">IFSC Code:</td>
              <td class="val" style="font-family: monospace;">${worker.bankIfsc || "—"}</td>
            </tr>
            <tr>
              <td class="label">Branch Name:</td>
              <td class="val" colspan="3">${worker.bankBranch || "Erode Main Branch"}</td>
            </tr>
          </table>

          ${
            isOffice
              ? `
              <div class="section-title">4. Educational Qualifications</div>
              <table class="data-grid">
                <tr><td class="label">10th Standard:</td><td class="val">${worker.tenthDetails || "SSLC Passed"}</td></tr>
                <tr><td class="label">12th Standard:</td><td class="val">${worker.twelfthDetails || "HSC / Diploma"}</td></tr>
                <tr><td class="label">Graduation / Degree:</td><td class="val">${worker.graduationDetails || "Bachelor Degree"}</td></tr>
              </table>
              `
              : ""
          }

          <div style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 10px;">
            <div style="border-top: 1px solid #0f172a; width: 200px; text-align: center; padding-top: 4px;">
              Employee / Worker Signature
            </div>
            <div style="border-top: 1px solid #0f172a; width: 220px; text-align: center; padding-top: 4px;">
              Authorized Standard Roofs Signatory
            </div>
          </div>

          <div class="footer">
            <span>SR-Books HRIS &middot; Standard Roofs (Erode, TN)</span>
            <span>Document Ref: SR-KYC-${worker.employeeCode}-${Date.now().toString().slice(-6)}</span>
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  const handleDownload360Dossier = () => {
    window.open(`/api/labour/${worker.id}/dossier?bundle=zip`, "_blank");
  };

  return (
    <ViewportPortal variant="drawer" onBackdropClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl h-full flex flex-col font-sans overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="relative">
              {worker.photoUrl ? (
                <img
                  src={worker.photoUrl}
                  alt={worker.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                />
              ) : (
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                    isOffice
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      : isTamil
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : isHindi
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                  }`}
                >
                  {isContractor ? <Users2 size={20} /> : worker.employeeCode.slice(-3)}
                </div>
              )}
              <label
                className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100"
                title="Upload Photo"
              >
                <Upload size={10} className="text-blue-600" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleQuickUpload("photo", f);
                  }}
                />
              </label>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {worker.name}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                  {worker.employeeCode}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${kycStatus.bg}`}>
                  {kycStatus.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>{worker.designation || worker.role || (isInvi ? "Invi Specialist" : "Workforce")}</span>
                <span>&bull;</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {isInvi ? "Invi Creation" : "Standard Roofs"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSalaryHistory(true)}
              className="px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer flex items-center gap-1"
              title="View Lifetime & Yearly Salary Ledger"
            >
              <FileText size={13} />
              <span>Salary History</span>
            </button>
            <button
              type="button"
              onClick={handleDownload360Dossier}
              className="px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition cursor-pointer flex items-center gap-1"
              title="Download Master Profile + Soft-Copy Dossier"
            >
              <Download size={13} />
              <span>Download All Soft Copies</span>
            </button>
            <button
              type="button"
              onClick={handlePrintDossier}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Print Official A4 KYC Dossier"
            >
              <Printer size={13} className="text-blue-600" />
              <span>Print A4</span>
            </button>
            <button
              type="button"
              onClick={() => onEdit(worker)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Edit Profile Details"
            >
              <Edit2 size={13} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
              title="Close Drawer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-850 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("DOCS")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "DOCS"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck size={14} />
            <span>KYC & Identity</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("BANK")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "BANK"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            }`}
          >
            <CreditCard size={14} />
            <span>Banking Details</span>
          </button>
          {isOffice && (
            <button
              type="button"
              onClick={() => setActiveTab("EDUCATION")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "EDUCATION"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              }`}
            >
              <GraduationCap size={14} />
              <span>Education</span>
            </button>
          )}
          {isOffice && (
            <button
              type="button"
              onClick={() => setActiveTab("EXPERIENCE")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "EXPERIENCE"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              }`}
            >
              <Briefcase size={14} />
              <span>Work Experience</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("WAGE")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "WAGE"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            }`}
          >
            <FileText size={14} />
            <span>Wage & Deployments</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: KYC & IDENTITY DOCUMENTS */}
          {activeTab === "DOCS" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Father's Name</span>
                  <strong className="text-slate-800 dark:text-slate-200">{worker.fatherName || "Not Recorded"}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Birth (DOB)</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">{worker.dob || "Not Recorded"}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone Contact</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">{worker.phone || "Not Recorded"}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Permanent Address</span>
                  <span className="text-slate-700 dark:text-slate-300 block">{worker.address || "Erode, Tamil Nadu"}</span>
                </div>
              </div>

              {/* KYC Document Verification Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Verified Government Identity Documents
                </h4>

                {/* Aadhaar Card */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <strong className="text-xs text-slate-900 dark:text-slate-100">Aadhaar Card (UIDAI)</strong>
                      {worker.aadhaarNumber ? (
                        <span className="px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          Recorded
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                          Missing
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-slate-500 block mt-1">
                      {worker.aadhaarNumber || "No Aadhaar number on file"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {worker.aadhaarDocUrl ? (
                      <a
                        href={worker.aadhaarDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        <span>View Document</span>
                      </a>
                    ) : (
                      <label className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer flex items-center gap-1">
                        <Upload size={12} />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleQuickUpload("aadhaar", f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* PAN Card */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-blue-600" />
                      <strong className="text-xs text-slate-900 dark:text-slate-100">PAN Card (Income Tax)</strong>
                      {worker.panNumber ? (
                        <span className="px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                          Recorded
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                          Optional
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-slate-500 block mt-1">
                      {worker.panNumber || "No PAN number on file"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {worker.panDocUrl ? (
                      <a
                        href={worker.panDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        <span>View Document</span>
                      </a>
                    ) : (
                      <label className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer flex items-center gap-1">
                        <Upload size={12} />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleQuickUpload("pan", f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Driving License */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Truck size={16} className="text-amber-600" />
                      <strong className="text-xs text-slate-900 dark:text-slate-100">Driving License (RTO)</strong>
                      {worker.drivingLicenseNumber ? (
                        <span className="px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          Recorded
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                          Not Provided
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-slate-500 block mt-1">
                      {worker.drivingLicenseNumber || "No driving license registered"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {worker.drivingLicenseDocUrl ? (
                      <a
                        href={worker.drivingLicenseDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        <span>View Document</span>
                      </a>
                    ) : (
                      <label className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer flex items-center gap-1">
                        <Upload size={12} />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleQuickUpload("driving_license", f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* SOFT-COPY DOCUMENT VAULT (ALL 9 SLOTS + ADDITIONAL FILES) */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Soft-Copy Document Vault (PDF / JPG / PNG / DOCX)
                  </h4>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {vaultDocs.length} Extra Vault Files
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    "Signed Offer Letter (PDF)",
                    "Educational Certificates (Degree / 10th / 12th)",
                    "Resume & Experience Letters",
                    "Bank Passbook / Cancelled Cheque",
                  ].map((slotLabel) => {
                    const existing = vaultDocs.find((v) => v.label === slotLabel);
                    return (
                      <div key={slotLabel} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">{slotLabel}</div>
                          <div className="text-[10px] text-slate-500">
                            {existing ? "Uploaded & Archived" : "Not Uploaded"}
                          </div>
                        </div>
                        {existing ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={existing.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[10px]"
                            >
                              View
                            </a>
                            <a
                              href={existing.url}
                              download={existing.fileName || slotLabel}
                              className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[10px]"
                            >
                              Download
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await fetch(
                                  `/api/labour/${worker.id}/documents?docId=${encodeURIComponent(existing.id || "")}&url=${encodeURIComponent(existing.url)}`,
                                  { method: "DELETE" }
                                );
                                const d = await res.json();
                                if (d.success) {
                                  setVaultDocs(d.documents || []);
                                  onRefresh();
                                }
                              }}
                              className="px-1.5 py-1 rounded-lg bg-rose-50 text-rose-600 font-bold text-[10px] cursor-pointer"
                            >
                              Del
                            </button>
                          </div>
                        ) : (
                          <label className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer shrink-0 hover:bg-slate-100">
                            Upload
                            <input
                              type="file"
                              accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.xlsx,.xls"
                              className="hidden"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                setUploadingDoc(slotLabel);
                                try {
                                  const fd = new FormData();
                                  fd.append("file", f);
                                  fd.append("employeeId", worker.id);
                                  fd.append("employeeCode", worker.employeeCode);
                                  fd.append("documentType", slotLabel);
                                  const res = await fetch("/api/upload/kyc", { method: "POST", body: fd });
                                  const data = await res.json();
                                  if (data.success && data.url) {
                                    const saveRes = await fetch(`/api/labour/${worker.id}/documents`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        label: slotLabel,
                                        url: data.url,
                                        fileName: data.originalName || f.name,
                                        ext: (data.originalName || f.name).split(".").pop()?.toUpperCase(),
                                        replaceSlot: true,
                                      }),
                                    });
                                    const saved = await saveRes.json();
                                    if (saved.success) {
                                      setVaultDocs(saved.documents || []);
                                      onRefresh();
                                    }
                                  }
                                } finally {
                                  setUploadingDoc(null);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Custom document label (e.g. Police Verification, Fitness Cert)..."
                    value={customDocLabel}
                    onChange={(e) => setCustomDocLabel(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                  <label className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1 shrink-0">
                    <Upload size={12} />
                    <span>{uploadingDoc ? "Uploading..." : "Add Soft Copy"}</span>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.xlsx,.xls"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const label = customDocLabel.trim() || f.name;
                        setUploadingDoc(label);
                        try {
                          const fd = new FormData();
                          fd.append("file", f);
                          fd.append("employeeId", worker.id);
                          fd.append("employeeCode", worker.employeeCode);
                          fd.append("documentType", label);
                          const res = await fetch("/api/upload/kyc", { method: "POST", body: fd });
                          const data = await res.json();
                          if (data.success && data.url) {
                            const saveRes = await fetch(`/api/labour/${worker.id}/documents`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                label,
                                url: data.url,
                                fileName: data.originalName || f.name,
                                ext: (data.originalName || f.name).split(".").pop()?.toUpperCase(),
                              }),
                            });
                            const saved = await saveRes.json();
                            if (saved.success) {
                              setVaultDocs(saved.documents || []);
                              setCustomDocLabel("");
                              onRefresh();
                            }
                          }
                        } finally {
                          setUploadingDoc(null);
                        }
                      }}
                    />
                  </label>
                </div>
                {vaultDocs.filter((v) => ![
                  "Signed Offer Letter (PDF)",
                  "Educational Certificates (Degree / 10th / 12th)",
                  "Resume & Experience Letters",
                  "Bank Passbook / Cancelled Cheque",
                ].includes(v.label)).map((doc, idx) => (
                  <div key={doc.id || idx} className="px-3 py-2 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[9px] font-bold shrink-0">
                        {doc.ext || "FILE"}
                      </span>
                      <span className="font-semibold text-slate-800 truncate">{doc.label}</span>
                      {doc.fileName && <span className="text-[10px] text-slate-400 truncate hidden sm:inline">({doc.fileName})</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">
                        View
                      </a>
                      <a href={doc.url} download={doc.fileName || doc.label} className="text-emerald-600 font-bold hover:underline">
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await fetch(
                            `/api/labour/${worker.id}/documents?docId=${encodeURIComponent(doc.id || "")}&url=${encodeURIComponent(doc.url)}`,
                            { method: "DELETE" }
                          );
                          const d = await res.json();
                          if (d.success) {
                            setVaultDocs(d.documents || []);
                            onRefresh();
                          }
                        }}
                        className="text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: BANKING DETAILS */}
          {activeTab === "BANK" && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-linear-to-r from-blue-900 to-indigo-900 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    Disbursement Account &middot; RTGS / NEFT / IMPS
                  </span>
                  <Building2 size={18} className="text-blue-300" />
                </div>
                <div>
                  <span className="text-[11px] text-blue-200 block">Bank Account Number</span>
                  <strong className="text-lg font-mono tracking-wider">
                    {worker.bankAccountNumber || worker.bankAccountNo || "NO ACCOUNT LINKED"}
                  </strong>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-800 text-xs">
                  <div>
                    <span className="text-[10px] text-blue-300 block">Account Holder</span>
                    <span className="font-bold">{worker.bankAccountName || worker.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-300 block">IFSC Code</span>
                    <span className="font-mono font-bold">{worker.bankIfsc || "NOT CONFIGURED"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Name</span>
                  <strong className="text-slate-800 dark:text-slate-200">{worker.bankName || "State Bank of India"}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Branch Location</span>
                  <strong className="text-slate-800 dark:text-slate-200">{worker.bankBranch || "Erode Main Branch"}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const text = `Name: ${worker.name}\nBank: ${worker.bankName || "SBI"}\nAccount: ${
                    worker.bankAccountNumber || worker.bankAccountNo
                  }\nIFSC: ${worker.bankIfsc}`;
                  navigator.clipboard.writeText(text);
                  alert("Copied bank details to clipboard!");
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <Copy size={13} />
                <span>Copy Full Bank Account Details</span>
              </button>
            </div>
          )}

          {/* TAB 3: EDUCATION QUALIFICATIONS */}
          {activeTab === "EDUCATION" && (
            <div className="space-y-3 text-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Formal Academic Qualifications
              </h4>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 dark:text-slate-100">10th Standard / Matriculation (SSLC)</strong>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">Secondary</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {worker.tenthDetails || "School: Erode Government High School &middot; State Board &middot; Passed"}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 dark:text-slate-100">12th Standard / Higher Secondary (HSC)</strong>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">Higher Sec</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {worker.twelfthDetails || "School: Erode Higher Secondary School &middot; Passed"}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 dark:text-slate-100">Undergraduate / College Graduation</strong>
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px]">Degree</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {worker.graduationDetails || "Degree / Diploma in Engineering / Science / Commerce &middot; Completed"}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: WORK EXPERIENCE */}
          {activeTab === "EXPERIENCE" && (
            <div className="space-y-3 text-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Professional Work Experience Timeline
              </h4>

              {experienceList.length > 0 ? (
                <div className="space-y-2.5">
                  {experienceList.map((exp: any, i: number) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 dark:text-slate-100">{exp.company || "Company"}</strong>
                        <span className="font-mono text-[10px] text-slate-400">
                          {exp.fromYear} – {exp.toYear || "Present"}
                        </span>
                      </div>
                      <span className="text-blue-600 font-bold block">{exp.role}</span>
                      {exp.notes && <p className="text-slate-500 mt-1">{exp.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400">
                  Standard Roofs Books Verified Employee &middot; No previous external companies recorded
                </div>
              )}
            </div>
          )}

          {/* TAB 5: WAGE & DEPLOYMENT */}
          {activeTab === "WAGE" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Daily Wage Rate (₹)</span>
                  <strong className="text-base text-emerald-600 font-mono">
                    {salaryVisible && !(worker as any).salaryMasked
                      ? `₹${Number(worker.dailyWage || 850).toLocaleString("en-IN")}/day`
                      : "••••••"}
                  </strong>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Monthly Salary (₹)</span>
                  <strong className="text-base text-blue-600 font-mono">
                    {salaryVisible && !(worker as any).salaryMasked
                      ? `₹${Number(worker.monthlySalary || (isOffice ? 15000 : 0)).toLocaleString("en-IN")}/mo`
                      : "••••••"}
                  </strong>
                </div>
              </div>

              {/* Digital Offer Letter, 360° Dossier Export & 1-Month Notice Exit Controls */}
              <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload360Dossier}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
                >
                  <Download size={13} className="text-indigo-600" />
                  <span>Download 360° Dossier (.xlsx)</span>
                </button>
                {onOpenOfferLetter && (
                  <button
                    type="button"
                    onClick={() => onOpenOfferLetter(worker)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs cursor-pointer"
                  >
                    <FileCheck size={13} />
                    <span>Generate Offer Letter</span>
                  </button>
                )}
                {onOpenExitFnf && (
                  <button
                    type="button"
                    onClick={() => onOpenExitFnf(worker)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                  >
                    <AlertTriangle size={13} />
                    <span>1-Month Notice Exit / FnF</span>
                  </button>
                )}
              </div>

              {isContractor && (
                <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 space-y-2">
                  <span className="text-xs font-black uppercase text-purple-800 dark:text-purple-200 block">
                    Contractor Team Logistics
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-purple-600 block">Trade / Specialty</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {worker.tradeSpecialty || worker.specialty || "Roofing Installation"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-purple-600 block">Default Labour Headcount</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {worker.defaultHeadcount || 4} Labours
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showSalaryHistory && (
        <EmployeeSalaryHistoryModal
          isOpen={true}
          onClose={() => setShowSalaryHistory(false)}
          employeeId={worker.id}
          employeeCode={worker.employeeCode}
          employeeName={worker.name}
        />
      )}
    </ViewportPortal>
  );
}
