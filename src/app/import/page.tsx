"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Users,
  Building,
  Package,
  Wrench,
  RotateCcw,
  Layers,
  Coins,
  TrendingUp,
  TrendingDown,
  Eye,
  Check,
  Calendar,
  Sparkles,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

interface ColumnMapping {
  date: string;
  site: string;
  customer: string;
  team: string;
  particulars: string;
  category: string;
  moneyIn: string;
  moneyOut: string;
  paymentMode: string;
  voucherNo: string;
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<"accounts" | "masters" | "batches">("accounts");

  // Accounts Importer State
  const [file, setFile] = useState<File | null>(null);
  const [inspectData, setInspectData] = useState<any>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [columnMap, setColumnMap] = useState<ColumnMapping>({
    date: "",
    site: "",
    customer: "",
    team: "",
    particulars: "",
    category: "",
    moneyIn: "",
    moneyOut: "",
    paymentMode: "",
    voucherNo: "",
  });
  const [previewData, setPreviewData] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");

  // Batches State
  const [batches, setBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  // Masters Importer State (Legacy/Utility)
  const [masterType, setMasterType] = useState<"customers" | "suppliers" | "materials" | "machines">("customers");
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [masterPreview, setMasterPreview] = useState<any[]>([]);
  const [masterSuccess, setMasterSuccess] = useState<number | null>(null);

  // Load batches
  const fetchBatches = async () => {
    try {
      setBatchesLoading(true);
      const res = await fetch("/api/import/batches");
      const data = await res.json();
      if (data.success) {
        setBatches(data.batches);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBatchesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "batches") {
      fetchBatches();
    }
  }, [activeTab]);

  // Handle file inspection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setLoading(true);
    setPreviewData(null);
    setImportResult(null);

    try {
      const fd = new FormData();
      fd.append("file", selected);
      fd.append("action", "inspect");

      const res = await fetch("/api/import/accounts", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (data.success) {
        setInspectData(data);
        setSelectedSheet(data.currentSheet);
        setColumnMap(data.suggestedMapping);
        setStep("map");
      } else {
        alert("Could not inspect Excel workbook: " + data.error);
      }
    } catch (err: any) {
      alert("Error inspecting file: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-inspect on sheet switch
  const handleSheetSwitch = async (sheet: string) => {
    if (!file) return;
    setSelectedSheet(sheet);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("action", "inspect");
      fd.append("sheetName", sheet);

      const res = await fetch("/api/import/accounts", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setInspectData(data);
        setColumnMap(data.suggestedMapping);
      }
    } catch (err: any) {
      alert("Error changing sheet: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate preview
  const handleGeneratePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("action", "preview");
      fd.append("sheetName", selectedSheet);
      fd.append("columnMap", JSON.stringify(columnMap));

      const res = await fetch("/api/import/accounts", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
        setStep("preview");
      } else {
        alert("Preview error: " + data.error);
      }
    } catch (err: any) {
      alert("Error generating preview: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Commit Import Batch
  const handleCommitImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("action", "commit");
      fd.append("sheetName", selectedSheet);
      fd.append("columnMap", JSON.stringify(columnMap));

      const res = await fetch("/api/import/accounts", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(data);
        setStep("done");
      } else {
        alert("Commit failed: " + data.error);
      }
    } catch (err: any) {
      alert("Error committing import: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Rollback Batch
  const handleRollbackBatch = async (batchId: string, batchNumber: string) => {
    if (!confirm(`Are you sure you want to ROLLBACK batch ${batchNumber}? This will reverse all posted transactions and double-entry journals in this batch.`)) {
      return;
    }

    try {
      setRollingBackId(batchId);
      const res = await fetch("/api/import/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchBatches();
      } else {
        alert("Rollback failed: " + data.error);
      }
    } catch (err: any) {
      alert("Error rolling back: " + err.message);
    } finally {
      setRollingBackId(null);
    }
  };

  // Masters Handlers
  const handleMasterFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMasterFile(f);
    setMasterSuccess(null);
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("file", f);
      fd.append("type", masterType);
      fd.append("action", "preview");
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) setMasterPreview(data.previewRows || []);
    } finally {
      setLoading(false);
    }
  };

  const handleMasterCommit = async () => {
    if (!masterFile) return;
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("file", masterFile);
      fd.append("type", masterType);
      fd.append("action", "save");
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setMasterSuccess(data.importedCount);
        setMasterPreview([]);
        setMasterFile(null);
      } else {
        alert("Error: " + data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" size={28} />
            Smart Excel Migration & Accounts Importer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Zero-friction accounts migration: upload historical site sheets, auto-map columns, preview live cashflow, and post to double-entry ledger with 1-click rollback.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/import/template?type=accounts_master"
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-lg transition shadow-sm"
          >
            <Download size={15} />
            Download Master Accounts Template (.xlsx)
          </a>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "accounts"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles size={16} />
          Smart Accounts Excel Importer
        </button>
        <button
          onClick={() => setActiveTab("batches")}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "batches"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <RotateCcw size={16} />
          Import Batches & 1-Click Rollback
        </button>
        <button
          onClick={() => setActiveTab("masters")}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "masters"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Database size={16} />
          Master Data Importers (Customers, Suppliers, Materials, Tools)
        </button>
      </div>

      {/* TAB 1: SMART ACCOUNTS EXCEL IMPORTER */}
      {activeTab === "accounts" && (
        <div className="space-y-6">
          {/* Workflow Stepper */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
            <div className={`p-2.5 rounded-lg border ${step === "upload" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
              1. Upload Accounts Excel
            </div>
            <div className={`p-2.5 rounded-lg border ${step === "map" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
              2. Inspect & Column Mapping
            </div>
            <div className={`p-2.5 rounded-lg border ${step === "preview" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
              3. Live Cashflow & Validation Preview
            </div>
            <div className={`p-2.5 rounded-lg border ${step === "done" ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
              4. Ledger Posted & Committed
            </div>
          </div>

          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center bg-slate-50/50 hover:bg-slate-50 transition">
              <Upload className="mx-auto text-blue-600 mb-3" size={40} />
              <h3 className="text-base font-bold text-slate-900">Upload Any Accounts Excel or CSV File</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Supports single-sheet or multi-sheet workbooks (.xlsx, .xls, .csv). Upload your existing historical site logs, income registers, or contractor payout files.
              </p>

              <div className="mt-5">
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow">
                  <Upload size={16} />
                  Choose Accounts File
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {loading && <p className="text-xs text-blue-600 font-semibold mt-3 animate-pulse">Inspecting sheets and detecting column structures...</p>}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === "map" && inspectData && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Interactive Column Mapper</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    File: <span className="font-semibold text-slate-800">{inspectData.fileName}</span> ({inspectData.totalRows} rows found)
                  </p>
                </div>

                {/* Sheet Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700">Sheet:</span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetSwitch(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:ring-blue-600 bg-white"
                  >
                    {inspectData.sheetNames.map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="ALL">All Sheets in Workbook</option>
                  </select>
                </div>
              </div>

              {/* Mapping Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {[
                  { key: "date", label: "Date (DD/MM/YYYY)", required: true },
                  { key: "site", label: "Site / Project Name", required: true },
                  { key: "customer", label: "Customer / Client Name", required: false },
                  { key: "team", label: "Team (SRM01-SRM06 / Team Thenarrusu)", required: false },
                  { key: "particulars", label: "Particulars / Description", required: true },
                  { key: "category", label: "Category (Material / Labour / Office)", required: false },
                  { key: "moneyIn", label: "Money In (₹ Received from Client)", required: false },
                  { key: "moneyOut", label: "Money Out (₹ Paid for Expenses/Labour)", required: false },
                  { key: "paymentMode", label: "Payment Mode (Cash / Bank / UPI)", required: false },
                  { key: "voucherNo", label: "Voucher / Bill / Ref No", required: false },
                ].map((col) => (
                  <div key={col.key} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span>{col.label} {col.required && <span className="text-rose-600">*</span>}</span>
                      {columnMap[col.key as keyof ColumnMapping] && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <Check size={12} /> Auto-Mapped
                        </span>
                      )}
                    </label>
                    <select
                      value={columnMap[col.key as keyof ColumnMapping] || ""}
                      onChange={(e) => setColumnMap({ ...columnMap, [col.key]: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs bg-white focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="">-- Choose Excel Column --</option>
                      {inspectData.headers.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Sample Rows Preview */}
              {inspectData.sampleRows && inspectData.sampleRows.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">Sample Row Data from Excel:</h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          {inspectData.headers.map((h: string) => (
                            <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inspectData.sampleRows.map((r: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            {inspectData.headers.map((h: string) => (
                              <td key={h} className="px-3 py-1.5 whitespace-nowrap text-slate-600">{String(r[h] ?? "")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={() => setStep("upload")}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Back to Upload
                </button>
                <button
                  onClick={handleGeneratePreview}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow disabled:opacity-50"
                >
                  {loading ? "Generating Live Preview..." : "Generate Live Preview & Validation"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Live Preview & Validation */}
          {step === "preview" && previewData && (
            <div className="space-y-6">
              {/* Summary KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Total Transactions</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{previewData.summary.totalRows}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Across {previewData.summary.sitesCount} Sites</div>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase">Total Money In</div>
                  <div className="text-xl font-black text-emerald-800 mt-1">{formatINR(previewData.summary.totalInflow)}</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Customer Collections</div>
                </div>
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="text-[11px] font-bold text-rose-700 uppercase">Total Money Out</div>
                  <div className="text-xl font-black text-rose-800 mt-1">{formatINR(previewData.summary.totalOutflow)}</div>
                  <div className="text-[10px] text-rose-600 mt-0.5">Site + Office Payouts</div>
                </div>
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-[11px] font-bold text-blue-700 uppercase">Direct Site Costs</div>
                  <div className="text-xl font-black text-blue-800 mt-1">{formatINR(previewData.summary.siteExpenseTotal)}</div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Material + Labour + Transport</div>
                </div>
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="text-[11px] font-bold text-amber-700 uppercase">Office Overheads</div>
                  <div className="text-xl font-black text-amber-800 mt-1">{formatINR(previewData.summary.officeExpenseTotal)}</div>
                  <div className="text-[10px] text-amber-600 mt-0.5">Rent, EB, Staff, Admin</div>
                </div>
              </div>

              {/* Ready to Post Callout */}
              <div className="p-4 bg-blue-600 text-white rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-emerald-300 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">
                      Found {previewData.summary.sitesCount} Project Sites &bull; Ready to Post to Double-Entry Ledger
                    </div>
                    <div className="text-xs text-blue-100 mt-0.5">
                      New project sites, customers, and contractors will be auto-created cleanly with zero duplicates. Batch ID will be generated for 1-click rollback.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setStep("map")}
                    className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-xs font-bold rounded-lg transition"
                  >
                    Adjust Mapping
                  </button>
                  <button
                    onClick={handleCommitImport}
                    disabled={loading}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-lg transition shadow disabled:opacity-50"
                  >
                    {loading ? "Posting to Double-Entry Ledger..." : "Commit & Post to Double-Entry Ledger"}
                  </button>
                </div>
              </div>

              {/* Rows Preview Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Transactions Preview (First {previewData.previewRows.length} of {previewData.summary.totalRows} rows)</span>
                  <span className="text-[11px] text-slate-500 font-normal">All amounts validated in INR ₹</span>
                </div>
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Site / Project</th>
                        <th className="px-3 py-2">Team</th>
                        <th className="px-3 py-2">Particulars</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-right">Money In (₹)</th>
                        <th className="px-3 py-2 text-right">Money Out (₹)</th>
                        <th className="px-3 py-2">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.previewRows.map((r: any) => (
                        <tr key={r.rowIndex} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-400 font-mono">{r.rowIndex}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{r.date}</td>
                          <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">{r.siteName}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {r.teamName}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-700 max-w-xs truncate">{r.particulars}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.txnType === "CUSTOMER_PAYMENT"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : r.txnType === "OFFICE_OVERHEAD"
                                  ? "bg-amber-100 text-amber-800"
                                  : r.txnType === "LABOUR_CONTRACTOR"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {r.txnType.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">
                            {Number(r.moneyIn) > 0 ? formatINR(r.moneyIn) : "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-rose-600">
                            {Number(r.moneyOut) > 0 ? formatINR(r.moneyOut) : "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-500 font-mono">{r.paymentMode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && importResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center space-y-4">
              <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
              <h2 className="text-xl font-black text-emerald-900">Import Batch Successfully Posted to Ledger!</h2>
              <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                Batch <span className="font-mono font-bold">{importResult.batchNumber}</span> successfully committed. All {importResult.committedCount} transactions have been balanced and posted to the General Ledger with project costing and cash book entries.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setStep("upload");
                    setFile(null);
                    setInspectData(null);
                    setPreviewData(null);
                    setImportResult(null);
                  }}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-lg transition"
                >
                  Import Another File
                </button>
                <button
                  onClick={() => setActiveTab("batches")}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition shadow"
                >
                  View Batches & Rollback
                </button>
                <a
                  href="/projects"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow"
                >
                  View Projects P&L
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IMPORT BATCHES & 1-CLICK ROLLBACK */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Historical Import Batches & 1-Click Rollback</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every Excel import is tracked by Batch ID. If an erroneous workbook is uploaded, reverse that entire batch with a single click.
              </p>
            </div>
            <button
              onClick={fetchBatches}
              disabled={batchesLoading}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-lg transition"
            >
              {batchesLoading ? "Refreshing..." : "Refresh Batches"}
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Batch Number</th>
                    <th className="px-4 py-3">File Name</th>
                    <th className="px-4 py-3 text-center">Rows</th>
                    <th className="px-4 py-3 text-center">Sites</th>
                    <th className="px-4 py-3 text-right">Total Inflow (₹)</th>
                    <th className="px-4 py-3 text-right">Total Outflow (₹)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Imported Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No import batches found yet. Upload an Accounts Excel file to get started.
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">{b.batchNumber}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{b.fileName}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{b.totalRows}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{b.sitesCount}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          {formatINR(b.totalInflow)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                          {formatINR(b.totalOutflow)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.status === "COMMITTED"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-slate-200 text-slate-600 border border-slate-300"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(b.createdAt).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {b.status === "COMMITTED" ? (
                            <button
                              onClick={() => handleRollbackBatch(b.id, b.batchNumber)}
                              disabled={rollingBackId === b.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-md transition shadow-sm disabled:opacity-50"
                            >
                              <RotateCcw size={13} />
                              {rollingBackId === b.id ? "Rolling back..." : "Rollback Batch"}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Reversed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MASTER DATA IMPORTERS */}
      {activeTab === "masters" && (
        <div className="space-y-6">
          <div className="flex gap-2">
            {[
              { id: "customers", label: "Customers & Debtors", icon: Users },
              { id: "suppliers", label: "Suppliers & Vendors", icon: Building },
              { id: "materials", label: "Raw Materials & Stock", icon: Package },
              { id: "machines", label: "Machines & Tools (SRM)", icon: Wrench },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setMasterType(t.id as any);
                    setMasterPreview([]);
                    setMasterFile(null);
                    setMasterSuccess(null);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold border transition ${
                    masterType === t.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 capitalize">Upload {masterType} Master Excel</h4>
                <p className="text-xs text-slate-500 mt-0.5">Direct bulk upload for master records.</p>
              </div>
              <a
                href={`/api/import/template?type=${masterType}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition"
              >
                <Download size={14} />
                Download {masterType} Template
              </a>
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleMasterFileSelect}
                className="text-xs text-slate-600"
              />
            </div>

            {masterSuccess !== null && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800">
                Successfully imported {masterSuccess} {masterType} records into database!
              </div>
            )}

            {masterPreview.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700">Preview ({masterPreview.length} records ready):</div>
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                      <tr>
                        {Object.keys(masterPreview[0] || {}).map((k) => (
                          <th key={k} className="px-3 py-2 capitalize">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {masterPreview.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          {Object.values(row).map((v: any, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 text-slate-600">{String(v ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={handleMasterCommit}
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow"
                >
                  Commit {masterPreview.length} {masterType}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
