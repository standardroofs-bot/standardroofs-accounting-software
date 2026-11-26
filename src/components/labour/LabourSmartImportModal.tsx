"use client";

import React, { useState } from "react";
import { ViewportPortal } from "@/components/ui/ViewportPortal";
import {
  X,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  Plus,
  Trash2,
  Building2,
  HardHat,
  Users2,
  Truck,
  Sparkles,
} from "lucide-react";
import * as XLSX from "xlsx";
import { downloadSampleExcel } from "@/lib/exportUtils";

interface LabourSmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: "OFFICE_STAFF" | "TAMIL_LABOUR" | "HINDI_LABOUR" | "CONTRACTOR_TEAM";
  defaultCompanyUnit?: "STANDARD_ROOFS" | "INVI_CREATION";
  onImportComplete?: () => void;
}

type SegmentKey = "SR_OFFICE" | "INVI_OFFICE" | "TAMIL" | "HINDI" | "CONTRACTOR";

interface ColumnDef {
  key: string;
  label: string;
  example: string;
  required?: boolean;
}

const SEGMENT_CONFIGS: Record<
  SegmentKey,
  {
    title: string;
    icon: any;
    category: "OFFICE_STAFF" | "TAMIL_LABOUR" | "HINDI_LABOUR" | "CONTRACTOR_TEAM";
    companyUnit: "STANDARD_ROOFS" | "INVI_CREATION";
    badgeClass: string;
    columns: ColumnDef[];
  }
> = {
  SR_OFFICE: {
    title: "Standard Roofs Office Team",
    icon: Building2,
    category: "OFFICE_STAFF",
    companyUnit: "STANDARD_ROOFS",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    columns: [
      { key: "employeeCode", label: "Employee Code", example: "SR011", required: true },
      { key: "name", label: "Full Name", example: "Karthik Raj", required: true },
      { key: "fatherName", label: "Father Name", example: "Rajendran", required: false },
      { key: "dob", label: "Date of Birth", example: "1994-06-15", required: false },
      { key: "phone", label: "Phone", example: "9876543210", required: false },
      { key: "designation", label: "Designation", example: "Junior Engineer", required: false },
      { key: "address", label: "Address", example: "Erode, Tamil Nadu", required: false },
      { key: "monthlySalary", label: "Monthly Salary (₹)", example: "24000", required: false },
      { key: "aadhaarNumber", label: "Aadhaar Number", example: "123456789012", required: false },
      { key: "panNumber", label: "PAN Number", example: "ABCDE1234F", required: false },
      { key: "bankName", label: "Bank Name", example: "State Bank of India", required: false },
      { key: "bankAccountNo", label: "Bank Account No", example: "39281048192", required: false },
      { key: "bankIfsc", label: "IFSC Code", example: "SBIN0001234", required: false },
      { key: "bankBranch", label: "Branch", example: "Erode Main", required: false },
      { key: "tenthDetails", label: "10th Details", example: "Govt School, 2010, 85%", required: false },
      { key: "twelfthDetails", label: "12th Details", example: "Model HSS, 2012, 82%", required: false },
      { key: "graduationDetails", label: "Graduation", example: "BE Civil, 2016, 78%", required: false },
    ],
  },
  INVI_OFFICE: {
    title: "Invi Creation Team",
    icon: Users2,
    category: "OFFICE_STAFF",
    companyUnit: "INVI_CREATION",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    columns: [
      { key: "employeeCode", label: "Employee Code", example: "Invi004", required: true },
      { key: "name", label: "Full Name", example: "Priya D", required: true },
      { key: "fatherName", label: "Father Name", example: "Dhanapal", required: false },
      { key: "dob", label: "Date of Birth", example: "1998-04-12", required: false },
      { key: "phone", label: "Phone", example: "9876501234", required: false },
      { key: "designation", label: "Designation", example: "", required: false },
      { key: "address", label: "Address", example: "Coimbatore, Tamil Nadu", required: false },
      { key: "monthlySalary", label: "Monthly Salary (₹)", example: "20000", required: false },
      { key: "aadhaarNumber", label: "Aadhaar Number", example: "456789123456", required: false },
      { key: "panNumber", label: "PAN Number", example: "XYZPK4321A", required: false },
      { key: "bankName", label: "Bank Name", example: "HDFC Bank", required: false },
      { key: "bankAccountNo", label: "Bank Account No", example: "5010049281920", required: false },
      { key: "bankIfsc", label: "IFSC Code", example: "HDFC0000123", required: false },
      { key: "bankBranch", label: "Branch", example: "Gandhipuram", required: false },
      { key: "graduationDetails", label: "Graduation", example: "B.Sc CS, 2019, 80%", required: false },
    ],
  },
  TAMIL: {
    title: "Tamil Site Labours",
    icon: HardHat,
    category: "TAMIL_LABOUR",
    companyUnit: "STANDARD_ROOFS",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    columns: [
      { key: "name", label: "Labour Name", example: "Murugan M", required: true },
      { key: "employeeCode", label: "Labour Code", example: "TL-072", required: false },
      { key: "phone", label: "Phone", example: "9443210987", required: false },
      { key: "dailyWage", label: "Daily Wage (₹)", example: "850", required: false },
      { key: "specialty", label: "Trade / Role", example: "Fitter", required: false },
      { key: "address", label: "Village / Location", example: "Bhavani, Erode", required: false },
      { key: "aadhaarNumber", label: "Aadhaar", example: "987612345678", required: false },
      { key: "drivingLicenseNumber", label: "Driving License", example: "TN3320150001234", required: false },
      { key: "bankName", label: "Bank Name", example: "Canara Bank", required: false },
      { key: "bankAccountNo", label: "Account No", example: "12345678901234", required: false },
      { key: "bankIfsc", label: "IFSC Code", example: "CNRB0001234", required: false },
    ],
  },
  HINDI: {
    title: "Hindi Helpers & Crew",
    icon: Users2,
    category: "HINDI_LABOUR",
    companyUnit: "STANDARD_ROOFS",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    columns: [
      { key: "name", label: "Helper Name", example: "Rakesh Kumar", required: true },
      { key: "employeeCode", label: "Crew Code", example: "HL-006", required: false },
      { key: "phone", label: "Phone", example: "9123456780", required: false },
      { key: "dailyWage", label: "Daily Wage (₹)", example: "750", required: false },
      { key: "specialty", label: "Role / Specialty", example: "Roofing Helper", required: false },
      { key: "address", label: "Home State / Native", example: "Patna, Bihar", required: false },
      { key: "aadhaarNumber", label: "Aadhaar Number", example: "234567890123", required: false },
      { key: "panNumber", label: "PAN Number", example: "BHFPR1234K", required: false },
      { key: "bankName", label: "Bank Name", example: "Bank of India", required: false },
      { key: "bankAccountNo", label: "Account No", example: "492019381029", required: false },
      { key: "bankIfsc", label: "IFSC Code", example: "BKID0001234", required: false },
    ],
  },
  CONTRACTOR: {
    title: "Contractor Teams",
    icon: Truck,
    category: "CONTRACTOR_TEAM",
    companyUnit: "STANDARD_ROOFS",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    columns: [
      { key: "name", label: "Contractor / Agency Name", example: "Royal Roofing Contractors", required: true },
      { key: "contractorLeadName", label: "Team Lead Name", example: "Venkatesh K", required: false },
      { key: "employeeCode", label: "Contractor Code", example: "CON-007", required: false },
      { key: "phone", label: "Contact Phone", example: "9842712345", required: false },
      { key: "tradeSpecialty", label: "Trade Specialty", example: "Sheet Metal & Truss Fabrication", required: false },
      { key: "defaultHeadcount", label: "Headcount", example: "12", required: false },
      { key: "dailyWage", label: "Daily Rate / Rate per SqFt (₹)", example: "1200", required: false },
      { key: "panNumber", label: "PAN / GST", example: "AABCR1234K", required: false },
      { key: "aadhaarNumber", label: "Lead Aadhaar", example: "789012345678", required: false },
      { key: "bankName", label: "Bank Name", example: "Axis Bank", required: false },
      { key: "bankAccountNo", label: "Account No", example: "92102001928374", required: false },
      { key: "bankIfsc", label: "IFSC Code", example: "UTIB0001234", required: false },
    ],
  },
};

export default function LabourSmartImportModal({
  isOpen,
  onClose,
  defaultCategory = "OFFICE_STAFF",
  defaultCompanyUnit = "STANDARD_ROOFS",
  onImportComplete,
}: LabourSmartImportModalProps) {
  // Determine initial segment
  const getInitialSegment = (): SegmentKey => {
    if (defaultCategory === "OFFICE_STAFF") {
      return defaultCompanyUnit === "INVI_CREATION" ? "INVI_OFFICE" : "SR_OFFICE";
    }
    if (defaultCategory === "TAMIL_LABOUR") return "TAMIL";
    if (defaultCategory === "HINDI_LABOUR") return "HINDI";
    if (defaultCategory === "CONTRACTOR_TEAM") return "CONTRACTOR";
    return "SR_OFFICE";
  };

  const [segment, setSegment] = useState<SegmentKey>(getInitialSegment);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCfg = SEGMENT_CONFIGS[segment];

  const handleDownloadTemplate = () => {
    const templateData = currentCfg.columns.map((c) => ({
      header: c.label,
      example: c.example,
    }));
    const filename = `StandardRoofs_${currentCfg.title.replace(/\s+/g, "_")}_Template`;
    downloadSampleExcel(templateData, filename);
  };

  const mapImportedRowToSchema = (rawRow: Record<string, any>) => {
    const mapped: Record<string, any> = {};
    const lowerKeys = Object.keys(rawRow).reduce((acc, k) => {
      acc[k.toLowerCase().replace(/[^a-z0-9]/g, "")] = rawRow[k];
      return acc;
    }, {} as Record<string, any>);

    for (const col of currentCfg.columns) {
      const cleanKey = col.key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanLabel = col.label.toLowerCase().replace(/[^a-z0-9]/g, "");

      const val = lowerKeys[cleanKey] ?? lowerKeys[cleanLabel];
      if (val !== undefined && val !== null) {
        mapped[col.key] = String(val).trim();
      } else {
        mapped[col.key] = "";
      }
    }

    // Fallbacks
    if (!mapped.name && (lowerKeys.name || lowerKeys.fullname || lowerKeys.employee)) {
      mapped.name = String(lowerKeys.name || lowerKeys.fullname || lowerKeys.employee).trim();
    }
    if (!mapped.employeeCode && (lowerKeys.code || lowerKeys.empcode || lowerKeys.id)) {
      mapped.employeeCode = String(lowerKeys.code || lowerKeys.empcode || lowerKeys.id).trim();
    }

    return mapped;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const fileName = uploadedFile.name.toLowerCase();

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const firstSheet = wb.SheetNames[0];
          const rawData: any[] = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: "" });

          if (!rawData || rawData.length === 0) {
            setErrorMsg("The selected spreadsheet contains no data rows.");
            return;
          }

          const structured = rawData.map((r: any) => mapImportedRowToSchema(r));
          setParsedRows(structured);
        } catch (err: any) {
          setErrorMsg("Error parsing Excel/CSV: " + err.message);
        }
      };
      reader.readAsBinaryString(uploadedFile);
    } else if (fileName.endsWith(".pdf") || fileName.endsWith(".txt")) {
      // Parse text file / basic text extraction
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          const detectedRows: Record<string, any>[] = [];

          for (const line of lines) {
            const parts = line.split(/[,\t|]/).map((p) => p.trim());
            if (parts.length >= 2) {
              const row: Record<string, any> = {};
              currentCfg.columns.forEach((col, idx) => {
                row[col.key] = parts[idx] || "";
              });
              if (row.name || parts[0]) {
                if (!row.name) row.name = parts[0];
                detectedRows.push(row);
              }
            }
          }

          if (detectedRows.length === 0) {
            setErrorMsg("Could not extract tabular workforce rows from this file. Try using Excel or CSV template.");
            return;
          }

          setParsedRows(detectedRows);
        } catch (err: any) {
          setErrorMsg("Error reading text data: " + err.message);
        }
      };
      reader.readAsText(uploadedFile);
    } else {
      setErrorMsg("Unsupported file format. Please upload .xlsx, .csv, or .pdf format.");
    }
  };

  const handleCellChange = (rowIndex: number, key: string, value: string) => {
    setParsedRows((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [key]: value };
      return updated;
    });
  };

  const handleAddRow = () => {
    const emptyRow: Record<string, any> = {};
    currentCfg.columns.forEach((col) => {
      emptyRow[col.key] = "";
    });
    setParsedRows((prev) => [...prev, emptyRow]);
  };

  const handleDeleteRow = (index: number) => {
    setParsedRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) {
      setErrorMsg("Please upload a file or add rows to import.");
      return;
    }

    // Validate required fields
    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      if (!row.name || !String(row.name).trim()) {
        setErrorMsg(`Row ${i + 1} is missing a Name.`);
        return;
      }
    }

    try {
      setImporting(true);
      setErrorMsg(null);
      setProgress({ current: 0, total: parsedRows.length });

      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        const payload: Record<string, any> = {
          ...row,
          category: currentCfg.category,
          companyUnit: currentCfg.companyUnit,
          dailyWage: parseFloat(row.dailyWage) || 0,
          monthlySalary: parseFloat(row.monthlySalary) || 0,
          defaultHeadcount: parseInt(row.defaultHeadcount, 10) || 1,
        };

        const res = await fetch("/api/labour", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          successCount++;
        } else {
          failedCount++;
        }
        setProgress({ current: i + 1, total: parsedRows.length });
      }

      setSuccessMsg(
        `Successfully imported ${successCount} member(s) into ${currentCfg.title}!${
          failedCount > 0 ? ` (${failedCount} failed)` : ""
        }`
      );
      setParsedRows([]);
      setFile(null);

      if (onImportComplete) {
        setTimeout(() => {
          onImportComplete();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg("Failed to complete import: " + err.message);
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  return (
    <ViewportPortal onBackdropClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">Smart Workforce KYC & Data Import</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" /> Auto-Syncs Attendance & Payroll
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Bulk upload or import staff, site labours, crew, and contractors via Excel, CSV or PDF
              </p>
            </div>
          </div>

          {/* Standard Circular X Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segment Selector Tabs */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Target Segment:</span>
          {(Object.keys(SEGMENT_CONFIGS) as SegmentKey[]).map((key) => {
            const cfg = SEGMENT_CONFIGS[key];
            const Icon = cfg.icon;
            const isSelected = segment === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSegment(key);
                  setParsedRows([]);
                  setFile(null);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-slate-400"}`} />
                {cfg.title}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Action Row: Sample Download & File Drop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download Sample Box */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-800">1. Download Segment Template</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Get a pre-formatted Excel sheet tailored specifically for <strong>{currentCfg.title}</strong> with all
                  KYC, Bank, and Identity columns.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full py-2 px-3 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download {currentCfg.title} Template (.xlsx)
              </button>
            </div>

            {/* Upload Area */}
            <div className="p-4 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 hover:bg-blue-50/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-800">2. Select / Drop File</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  Supports <strong>.xlsx, .xls, .csv, and .pdf</strong> text rosters.
                </p>
              </div>
              <label className="cursor-pointer w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                {file ? file.name : "Choose File to Parse"}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Progress Indicator */}
          {importing && progress && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Importing to Database & Syncing Cache...
                </span>
                <span>
                  {progress.current} of {progress.total} (
                  {Math.round((progress.current / progress.total) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Editable Preview Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Data Preview & Staging ({parsedRows.length} rows)
                </h4>
                {parsedRows.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    • Edit any field directly in this table before confirming
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Row Manually
              </button>
            </div>

            {parsedRows.length === 0 ? (
              <div className="p-8 border border-slate-200 rounded-xl text-center bg-slate-50/50">
                <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">No data loaded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Download the sample template, populate it, and upload it above, or click &ldquo;Add Row Manually&rdquo;.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2 text-center w-10 text-slate-400">#</th>
                        {currentCfg.columns.map((c) => (
                          <th key={c.key} className="py-2 px-3 whitespace-nowrap min-w-[120px]">
                            {c.label} {c.required && <span className="text-rose-500">*</span>}
                          </th>
                        ))}
                        <th className="py-2 px-2 text-center w-10">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-1.5 px-2 text-center font-mono text-[11px] text-slate-400">
                            {rIdx + 1}
                          </td>
                          {currentCfg.columns.map((col) => (
                            <td key={col.key} className="py-1 px-2">
                              <input
                                type="text"
                                value={row[col.key] ?? ""}
                                onChange={(e) => handleCellChange(rIdx, col.key, e.target.value)}
                                placeholder={col.example}
                                className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white text-xs text-slate-800 transition-colors outline-none"
                              />
                            </td>
                          ))}
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(rIdx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-bold border ${currentCfg.badgeClass}`}>
              Target: {currentCfg.title}
            </span>
            <span className="text-xs text-slate-400">
              {parsedRows.length} record(s) ready to commit
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing || parsedRows.length === 0}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing ({progress?.current || 0}/{progress?.total || 0})...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Import to Database
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ViewportPortal>
  );
}
