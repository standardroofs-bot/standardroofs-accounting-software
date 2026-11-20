"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Hash,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Lock,
  Unlock,
  Download,
  Upload,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";

export default function SettingsPage() {
  const [form, setForm] = useState({
    companyName: "Standard Roofs",
    orgId: "60069196862",
    portalName: "standardroofs1",
    contactPerson: "Prabhakaran T",
    tagline: "Roofing & PEB Structure Specialists",
    gstin: "33AEWFS5187G1ZD",
    pan: "AEWFS5187G",
    address: "144/A, Vellakkal Medu, Villarasampatti, Nasiyanur (Post), Erode, Tamil Nadu, India – 638107",
    phone: "+91 8608475767",
    email: "info@standardroofs.in",
    website: "https://www.standardroofs.in/",
    bankName: "ICICI Bank",
    bankAccountName: "Standard Roofs (ICICI, xxxx3161)",
    bankBranch: "Kagam, Erode",
    bankAccountNo: "155205003161",
    bankIfsc: "ICIC0001552",
    invoiceFormat: "PREFIX", // PREFIX or PLAIN
    invoiceNextNo: 33,
  });

  const [financialYears, setFinancialYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
    fetchFinancialYears();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setForm({
          ...data.settings,
          invoiceNextNo: data.invoiceSequence?.nextNumber || data.settings.invoiceNextNo || 33,
        });
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFinancialYears() {
    try {
      const res = await fetch("/api/settings/fy-lock");
      const data = await res.json();
      if (data.success) {
        setFinancialYears(data.financialYears || []);
      }
    } catch (e) {
      console.error("Error loading FYs:", e);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMsg("");
      setErrorMsg("");

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Company Profile & GST Configuration saved successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg("Failed to save: " + data.error);
      }
    } catch (err: any) {
      setErrorMsg("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleLock(fyId: string, currentLocked: boolean) {
    try {
      setActionLoading(true);
      setSuccessMsg("");
      setErrorMsg("");
      const res = await fetch("/api/settings/fy-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_LOCK", id: fyId, isLocked: !currentLocked }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        fetchFinancialYears();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(data.error);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCloseYear(fyId: string, fyName: string) {
    if (!confirm(`Are you sure you want to CLOSE Financial Year ${fyName}? This will lock the year, calculate net surplus into Retained Earnings, and activate FY 2027-28.`)) {
      return;
    }

    try {
      setActionLoading(true);
      setSuccessMsg("");
      setErrorMsg("");
      const res = await fetch("/api/settings/fy-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOSE_YEAR", id: fyId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        fetchFinancialYears();
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        setErrorMsg(data.error);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  function handleDownloadBackup() {
    window.location.href = "/api/settings/backup";
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setActionLoading(true);
      setSuccessMsg("");
      setErrorMsg("");

      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch("/api/settings/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || "Backup restored successfully!");
        fetchSettings();
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        setErrorMsg("Restore failed: " + data.error);
      }
    } catch (err: any) {
      setErrorMsg("Error parsing backup JSON file: " + err.message);
    } finally {
      setActionLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      <ModuleHeaderWithAnalytics
        title="Company Profile, Locking & Settings"
        subtitle="Configure Standard Roofs Erode identity, GSTIN, invoice sequence (#33), period locks, and JSON database backup"
        badge="Super Admin"
        icon={Settings}
        analyticsPreset="banking"
        analyticsCards={[
          {
            label: "Company GSTIN",
            value: form.gstin || "33AEWFS5187G1ZD",
            change: "Tamil Nadu (33) Registered",
            isPositive: true,
          },
          {
            label: "Invoice Sequence",
            value: `#${form.invoiceNextNo || 33}`,
            change: "Clean billing sequence",
            isPositive: true,
          },
          {
            label: "Active FY",
            value: "FY 2026-27",
            change: "Unlocked for postings",
            isPositive: true,
          },
          {
            label: "Default Bank",
            value: "ICICI Bank",
            change: "Account ...3161 active",
            isPositive: true,
          },
        ]}
      />

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300 flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Section 1: Period & Financial Year Locking */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" /> Financial Years & Period Locking
          </h2>
          <span className="text-xs text-muted-foreground font-mono">Strict Double-Entry Enforcement</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Locking a financial year blocks any new transactions, voucher edits, or reversals from being posted.
          The Year Closing Wizard rolls net profits into Retained Earnings (3020) and advances to the next financial year.
        </p>

        <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {financialYears.map((fy) => (
            <div key={fy.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">FY {fy.name}</span>
                  {fy.isCurrent && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                      CURRENT ACTIVE
                    </span>
                  )}
                  {fy.isClosed && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                      CLOSED
                    </span>
                  )}
                  {fy.isLocked ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> LOCKED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> UNLOCKED (OPEN)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(fy.startDate).toLocaleDateString("en-IN")} to {new Date(fy.endDate).toLocaleDateString("en-IN")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleLock(fy.id, fy.isLocked)}
                  disabled={actionLoading}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                    fy.isLocked
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                  }`}
                >
                  {fy.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {fy.isLocked ? "Unlock Period" : "Lock Period"}
                </button>

                {fy.isCurrent && !fy.isClosed && (
                  <button
                    type="button"
                    onClick={() => handleCloseYear(fy.id, fy.name)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Close Year & Roll to 2027-28
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: One-Click JSON Backup & Restore */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Download className="h-4 w-4 text-emerald-500" /> One-Click Backup & Restore
        </h2>
        <p className="text-xs text-muted-foreground">
          Export full accounting ledger, customers, projects, price catalog, fleet, and settings into a clean JSON archive for offline safety.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            Download Full JSON Backup (.json)
          </button>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleRestoreFile}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-2 transition"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              {actionLoading ? "Processing..." : "Restore From Backup JSON"}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 3: Invoicing Numbering & Sequence */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Hash className="h-4 w-4 text-blue-500" /> Invoice Numbering & Sequence
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Display Format Style</label>
              <select
                value={form.invoiceFormat}
                onChange={(e) => setForm({ ...form, invoiceFormat: e.target.value })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-semibold"
              >
                <option value="PREFIX">Prefix Format (e.g., SR/26-27/0033)</option>
                <option value="PLAIN">Plain Number (e.g., 33)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Next Invoice Number *
              </label>
              <input
                type="number"
                required
                value={form.invoiceNextNo}
                onChange={(e) => setForm({ ...form, invoiceNextNo: parseInt(e.target.value) || 33 })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-bold text-amber-500"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Set to 33 to continue sequentially from previous paper invoices.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Standard Roofs Identity & GST */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building className="h-4 w-4 text-amber-500" /> Business Identity & GST Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Legal Entity / Trade Name *</label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Tagline / Business Line</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                GSTIN (Tamil Nadu State Code 33) *
              </label>
              <input
                type="text"
                required
                maxLength={15}
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">PAN Number *</label>
              <input
                type="text"
                required
                maxLength={10}
                value={form.pan}
                onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Full Registered Office Address *</label>
              <input
                type="text"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Official Mobile / Phone *</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Accounts Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Bank Details for Invoices */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-500" /> Default Bank Details for Invoices
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Bank Name *</label>
              <input
                type="text"
                required
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Branch Name</label>
              <input
                type="text"
                value={form.bankBranch}
                onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Current Account Number *</label>
              <input
                type="text"
                required
                value={form.bankAccountNo}
                onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">IFSC Code *</label>
              <input
                type="text"
                required
                value={form.bankIfsc}
                onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-xs font-bold rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Company & GST Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
