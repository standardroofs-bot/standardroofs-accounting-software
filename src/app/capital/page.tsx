"use client";

import React, { useState, useEffect } from "react";
import {
  Landmark,
  Plus,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Truck,
  Wrench,
  Percent,
  FileText,
  PieChart,
  Trash2,
} from "lucide-react";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import ArchiveConfirmModal from "@/components/common/ArchiveConfirmModal";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

export default function CapitalPage() {
  const [activeTab, setActiveTab] = useState<"capital" | "loans" | "assets">("capital");
  const [capitalTransactions, setCapitalTransactions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [emiPayments, setEmiPayments] = useState<any[]>([]);
  const [fixedAssets, setFixedAssets] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalCapitalInfused: 0,
    totalDrawings: 0,
    netEquityInjected: 0,
    totalLoanOutstanding: 0,
    totalFixedAssetsValue: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showEmiModal, setShowEmiModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);

  // Forms
  const [capitalForm, setCapitalForm] = useState({
    partnerName: "Managing Director",
    transactionType: "CAPITAL_INFUSION", // CAPITAL_INFUSION, PARTNER_DRAWING
    amount: 1000000,
    paymentMode: "BANK",
    bankAccountId: "",
    notes: "Equity investment into Standard Roofs business operations",
    date: new Date().toISOString().split("T")[0],
  });

  const [loanForm, setLoanForm] = useState({
    loanCode: "LN-VEH-01",
    lenderName: "HDFC Bank Ltd",
    loanType: "VEHICLE_LOAN",
    accountNumber: "502099887766",
    principalAmount: 750000,
    interestRate: 9.5,
    tenureMonths: 36,
    monthlyEmiAmount: 24000,
    emiDueDay: 5,
    disbursementDate: new Date().toISOString().split("T")[0],
    bankAccountId: "",
    notes: "Bolero Pickup vehicle asset hypothecation loan",
    recordDisbursementVoucher: true,
  });

  const [emiForm, setEmiForm] = useState({
    loanId: "",
    emiMonth: "April 2026",
    paymentDate: new Date().toISOString().split("T")[0],
    principalComponent: 18000,
    interestComponent: 6000,
    bankAccountId: "",
    notes: "Monthly vehicle loan EMI debit",
  });

  const [assetForm, setAssetForm] = useState({
    assetCode: "FA-VEH-01",
    name: "Mahindra Bolero Maxi Truck Plus (TN-33-AX-8912)",
    category: "VEHICLE",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseCost: 820000,
    depreciationRateAnnual: 15.0,
    paymentMode: "BANK",
    bankAccountId: "",
    notes: "Commercial site cargo transport pickup",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch("/api/capital");
      const json = await res.json();
      if (json.success) {
        setCapitalTransactions(json.capitalTransactions || []);
        setLoans(json.loans || []);
        setEmiPayments(json.emiPayments || []);
        setFixedAssets(json.fixedAssets || []);
        setBankAccounts(json.bankAccounts || []);
        setSummary(json.summary || {});
        if (json.bankAccounts?.length > 0) {
          setCapitalForm((prev) => ({ ...prev, bankAccountId: json.bankAccounts[0].id }));
          setLoanForm((prev) => ({ ...prev, bankAccountId: json.bankAccounts[0].id }));
          setEmiForm((prev) => ({ ...prev, bankAccountId: json.bankAccounts[0].id }));
          setAssetForm((prev) => ({ ...prev, bankAccountId: json.bankAccounts[0].id }));
        }
      }
    } catch (e) {
      console.error("Error loading capital data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCapitalSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/capital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CAPITAL_TRANSACTION", ...capitalForm }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCapitalModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleLoanSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/capital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_LOAN", ...loanForm }),
      });
      const data = await res.json();
      if (data.success) {
        setShowLoanModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleEmiSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/capital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PAY_EMI", ...emiForm }),
      });
      const data = await res.json();
      if (data.success) {
        setShowEmiModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleAssetSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/capital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_FIXED_ASSET", ...assetForm }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAssetModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // Search & Archive Modal
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveModal, setArchiveModal] = useState<{
    isOpen: boolean;
    recordId: string;
    recordLabel: string;
    loading: boolean;
  }>({
    isOpen: false,
    recordId: "",
    recordLabel: "",
    loading: false,
  });

  const handleExportExcel = () => {
    let exportData: any[] = [];
    if (activeTab === "capital") {
      exportData = capitalTransactions.map((t) => ({
        Partner: t.partnerName,
        Type: t.transactionType,
        "Amount (₹)": t.amount,
        Date: t.date,
        Mode: t.paymentMode,
        Notes: t.notes || "-",
      }));
    } else if (activeTab === "loans") {
      exportData = loans.map((l) => ({
        "Loan Code": l.loanCode,
        Lender: l.lenderName,
        Type: l.loanType,
        "Principal (₹)": l.principalAmount,
        "Outstanding (₹)": l.outstandingBalance,
        "Rate (%)": l.interestRate,
        Status: l.status,
      }));
    } else {
      exportData = fixedAssets.map((a) => ({
        "Asset Code": a.assetCode,
        Name: a.name,
        Category: a.category,
        "Purchase Cost (₹)": a.purchaseCost,
        "Current Book Value (₹)": a.currentBookValue,
        Location: a.location || "-",
        Status: a.status,
      }));
    }
    exportToExcel(exportData, `capital_${activeTab}`);
  };

  const handleExportPDF = () => {
    if (activeTab === "capital") {
      const rows = capitalTransactions.map((t) => [
        t.partnerName,
        t.transactionType.replace("_", " "),
        `₹ ${Number(t.amount).toLocaleString("en-IN")}`,
        new Date(t.date).toLocaleDateString("en-IN"),
        t.paymentMode,
      ]);
      exportToPDF("Partner Capital & Equity", ["Partner", "Type", "Amount", "Date", "Mode"], rows, "capital_equity");
    } else if (activeTab === "loans") {
      const rows = loans.map((l) => [
        l.loanCode,
        l.lenderName,
        l.loanType,
        `₹ ${Number(l.principalAmount).toLocaleString("en-IN")}`,
        `₹ ${Number(l.outstandingBalance).toLocaleString("en-IN")}`,
        l.status,
      ]);
      exportToPDF("Loans & Borrowings Schedule", ["Code", "Lender", "Type", "Principal", "Outstanding", "Status"], rows, "loans_schedule");
    } else {
      const rows = fixedAssets.map((a) => [
        a.assetCode,
        a.name,
        a.category,
        `₹ ${Number(a.currentBookValue).toLocaleString("en-IN")}`,
        a.status,
      ]);
      exportToPDF("Fixed Assets Register", ["Asset Code", "Name", "Category", "Book Value", "Status"], rows, "fixed_assets");
    }
  };

  const handleArchive = async () => {
    try {
      setArchiveModal((prev) => ({ ...prev, loading: true }));
      if (activeTab === "capital") {
        setCapitalTransactions((prev) => prev.filter((item) => item.id !== archiveModal.recordId));
      } else if (activeTab === "loans") {
        setLoans((prev) => prev.filter((item) => item.id !== archiveModal.recordId));
      } else {
        setFixedAssets((prev) => prev.filter((item) => item.id !== archiveModal.recordId));
      }
      setArchiveModal({ isOpen: false, recordId: "", recordLabel: "", loading: false });
    } catch (err) {
      console.error(err);
      setArchiveModal((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeaderWithAnalytics
        title="Capital Investments, Loans & Fixed Assets"
        subtitle="Real money-flow accounting: Owner equity infusions, partner drawings, vehicle/business loans & fixed assets"
        badge="Capital & Equity"
        icon={Landmark}
        analyticsPreset="banking"
        analyticsCards={[
          {
            label: "Net Owner Equity",
            value: `₹ ${Number(summary.netEquityInjected || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
            change: `Infused: ₹${Number(summary.totalCapitalInfused || 0).toLocaleString()}`,
            isPositive: true,
          },
          {
            label: "Loans Outstanding",
            value: `₹ ${Number(summary.totalLoanOutstanding || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
            change: `${loans.filter((l) => l.status === "ACTIVE").length} active loans`,
            isPositive: false,
          },
          {
            label: "Fixed Assets (Book Value)",
            value: `₹ ${Number(summary.totalFixedAssetsValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
            change: `${fixedAssets.length} Plant Machinery & Fleet`,
            isPositive: true,
          },
          {
            label: "EMIs Recorded",
            value: `${emiPayments.length} Payments`,
            change: "Principal & Interest splits",
            isPositive: true,
          },
        ]}
        searchPlaceholder="Search partners, lenders, vehicle loans or assets..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        views={[
          { id: "capital", label: "Partner Capital", count: capitalTransactions.length },
          { id: "loans", label: "Loans & Borrowings", count: loans.length },
          { id: "assets", label: "Fixed Assets", count: fixedAssets.length },
        ]}
        selectedView={activeTab}
        onViewChange={(v) => setActiveTab(v as any)}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        sampleData={[
          {
            "Partner Name": "Managing Director",
            "Transaction Type": "CAPITAL_INFUSION",
            "Amount (₹)": "500000",
            Date: "2026-11-20",
            "Payment Mode": "BANK",
            Notes: "Additional operating equity injection",
          },
        ]}
        sampleColumns={[
          "Partner Name",
          "Transaction Type",
          "Amount (₹)",
          "Date",
          "Payment Mode",
          "Notes",
        ]}
        customActions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setCapitalForm((prev) => ({ ...prev, transactionType: "CAPITAL_INFUSION" }));
                setShowCapitalModal(true);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="h-3.5 w-3.5" /> + Infuse Capital
            </button>
            <button
              onClick={() => {
                setCapitalForm((prev) => ({ ...prev, transactionType: "PARTNER_DRAWING" }));
                setShowCapitalModal(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Partner Drawing
            </button>
            <button
              onClick={() => setShowLoanModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
            >
              <CreditCard className="h-3.5 w-3.5 text-blue-500" /> Register Loan
            </button>
            <button
              onClick={() => setShowAssetModal(true)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-xs transition"
            >
              <Wrench className="h-3.5 w-3.5" /> + Add Fixed Asset
            </button>
          </div>
        }
      />

      {/* Tabs Switcher */}
      <div className="flex border-b border-border bg-card rounded-t-lg px-2 pt-2">
        <button
          onClick={() => setActiveTab("capital")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "capital"
              ? "border-amber-500 text-amber-500 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Partner Capital & Drawings ({capitalTransactions.length})
        </button>
        <button
          onClick={() => setActiveTab("loans")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "loans"
              ? "border-amber-500 text-amber-500 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Business Loans & EMIs ({loans.length})
        </button>
        <button
          onClick={() => setActiveTab("assets")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "assets"
              ? "border-amber-500 text-amber-500 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wrench className="h-4 w-4" />
          Fixed Assets & Machinery ({fixedAssets.length})
        </button>
      </div>

      {/* TAB 1: PARTNER CAPITAL & DRAWINGS */}
      {activeTab === "capital" && (
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-foreground">Partner Capital Contributions & Drawings</h3>
              <p className="text-xs text-muted-foreground">
                All capital injections increase bank liquidity and equity directly without inflating P&L revenue
              </p>
            </div>
            <button
              onClick={() => {
                setCapitalForm((prev) => ({ ...prev, transactionType: "CAPITAL_INFUSION" }));
                setShowCapitalModal(true);
              }}
              className="text-xs font-semibold text-amber-500 hover:text-amber-600"
            >
              + Record Contribution
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Voucher No / Date</th>
                  <th className="py-3 px-4">Partner Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Payment Channel</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-center">Double-Entry Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {capitalTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No partner capital transactions recorded yet. Click{" "}
                      <button
                        onClick={() => {
                          setCapitalForm((prev) => ({ ...prev, transactionType: "CAPITAL_INFUSION" }));
                          setShowCapitalModal(true);
                        }}
                        className="text-amber-500 underline font-medium"
                      >
                        + Infuse Capital
                      </button>{" "}
                      to record an owner equity investment.
                    </td>
                  </tr>
                ) : (
                  capitalTransactions.map((t) => {
                    const isInfusion = t.transactionType === "CAPITAL_INFUSION";
                    return (
                      <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{t.voucherNumber}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(t.date).toLocaleDateString("en-IN")}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">{t.partnerName}</td>
                        <td className="py-3 px-4">
                          {isInfusion ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              CAPITAL INFUSION
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              PARTNER DRAWING
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {t.paymentMode === "BANK" && t.bankAccount
                            ? `${t.bankAccount.bankName} (${t.bankAccount.accountNumber})`
                            : "Cash in Hand"}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold text-sm ${
                            isInfusion ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
                          }`}
                        >
                          {isInfusion ? "+" : "-"} ₹ {Number(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{t.notes || "N/A"}</td>
                        <td className="py-3 px-4 text-center">
                          {t.journalEntry ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">
                              <CheckCircle2 className="h-3 w-3" /> {t.journalEntry.entryNumber}
                            </span>
                          ) : (
                            "-"
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

      {/* TAB 2: BUSINESS LOANS & EMIS */}
      {activeTab === "loans" && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-foreground">Registered Loans & Facilities</h3>
                <p className="text-xs text-muted-foreground">
                  Vehicle financing, equipment loans & working capital CC/OD limits
                </p>
              </div>
              <button
                onClick={() => setShowLoanModal(true)}
                className="text-xs font-semibold text-amber-500 hover:text-amber-600"
              >
                + Register New Loan
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Loan Code</th>
                    <th className="py-3 px-4">Lender & Facility</th>
                    <th className="py-3 px-4 text-right">Principal Sanctioned</th>
                    <th className="py-3 px-4 text-right">Current Outstanding</th>
                    <th className="py-3 px-4 text-center">Interest %</th>
                    <th className="py-3 px-4 text-right">Monthly EMI</th>
                    <th className="py-3 px-4 text-center">Due Day</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loans.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">
                        No business or vehicle loans registered.
                      </td>
                    </tr>
                  ) : (
                    loans.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-500">{l.loanCode}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{l.lenderName}</div>
                          <div className="text-[11px] text-muted-foreground">{l.loanType}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          ₹ {Number(l.principalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-500">
                          ₹ {Number(l.outstandingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">{l.interestRate}% p.a.</td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          ₹ {Number(l.monthlyEmiAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">{l.emiDueDay}th of month</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              const p = Math.round(Number(l.monthlyEmiAmount) * 0.75);
                              const i = Math.round(Number(l.monthlyEmiAmount) * 0.25);
                              setEmiForm({
                                loanId: l.id,
                                emiMonth: "Current Month",
                                paymentDate: new Date().toISOString().split("T")[0],
                                principalComponent: p,
                                interestComponent: i,
                                bankAccountId: bankAccounts[0]?.id || "",
                                notes: `EMI for ${l.loanCode}`,
                              });
                              setShowEmiModal(true);
                            }}
                            className="px-2.5 py-1 text-[11px] rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                          >
                            + Pay EMI
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* EMI Payments Register */}
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">EMI Repayment Audit Trail (3-Line Double-Entry)</h3>
              <p className="text-xs text-muted-foreground">
                Each EMI splits into Principal (reduces loan liability) and Interest (records financing expense)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Receipt / Date</th>
                    <th className="py-3 px-4">Loan Code & Lender</th>
                    <th className="py-3 px-4">EMI Period</th>
                    <th className="py-3 px-4 text-right">Principal Paid</th>
                    <th className="py-3 px-4 text-right">Interest Paid</th>
                    <th className="py-3 px-4 text-right">Total Debit</th>
                    <th className="py-3 px-4 text-center">Journal Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {emiPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No EMI payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    emiPayments.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{e.receiptNumber}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(e.paymentDate).toLocaleDateString("en-IN")}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{e.loan?.loanCode}</div>
                          <div className="text-muted-foreground">{e.loan?.lenderName}</div>
                        </td>
                        <td className="py-3 px-4 font-medium">{e.emiMonth}</td>
                        <td className="py-3 px-4 text-right font-medium text-blue-600 dark:text-blue-400">
                          ₹ {Number(e.principalComponent).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-rose-500">
                          ₹ {Number(e.interestComponent).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          ₹ {Number(e.totalEmiAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {e.journalEntry ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> {e.journalEntry.entryNumber}
                            </span>
                          ) : (
                            "-"
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

      {/* TAB 3: FIXED ASSETS & MACHINERY */}
      {activeTab === "assets" && (
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-foreground">Fixed Assets & Machinery Register</h3>
              <p className="text-xs text-muted-foreground">
                Commercial site fleet, heavy PEB machinery, roll forming equipment & annual WDV depreciation
              </p>
            </div>
            <button
              onClick={() => setShowAssetModal(true)}
              className="text-xs font-semibold text-amber-500 hover:text-amber-600"
            >
              + Register Fixed Asset
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Asset Code</th>
                  <th className="py-3 px-4">Asset Name</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4 text-center">Acquisition Date</th>
                  <th className="py-3 px-4 text-right">Original Cost</th>
                  <th className="py-3 px-4 text-center">Depr Rate</th>
                  <th className="py-3 px-4 text-right">Current Book Value</th>
                  <th className="py-3 px-4 text-center">Journal Entry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fixedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No fixed assets recorded yet. Click{" "}
                      <button onClick={() => setShowAssetModal(true)} className="text-amber-500 underline font-medium">
                        + Add Fixed Asset
                      </button>{" "}
                      to register company vehicles or PEB machinery.
                    </td>
                  </tr>
                ) : (
                  fixedAssets.map((fa) => (
                    <tr key={fa.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-500">{fa.assetCode}</td>
                      <td className="py-3 px-4 font-bold text-foreground">{fa.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                          {fa.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground">
                        {new Date(fa.purchaseDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        ₹ {Number(fa.purchaseCost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold">{fa.depreciationRateAnnual}% WDV</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ₹ {Number(fa.currentBookValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {fa.journalEntry ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">
                            <CheckCircle2 className="h-3 w-3" /> {fa.journalEntry.entryNumber}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Capital Infusion / Drawing */}
      {showCapitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Landmark className="h-5 w-5 text-amber-500" />
              {capitalForm.transactionType === "CAPITAL_INFUSION" ? "Owner Capital Infusion" : "Partner Drawing"}
            </h3>

            <form onSubmit={handleCapitalSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Transaction Type</label>
                <select
                  value={capitalForm.transactionType}
                  onChange={(e) => setCapitalForm({ ...capitalForm, transactionType: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-semibold"
                >
                  <option value="CAPITAL_INFUSION">Capital Infusion (Dr Bank, Cr Capital 3010)</option>
                  <option value="PARTNER_DRAWING">Partner Drawing (Dr Drawings 3030, Cr Bank)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Managing Director / Partner Name *</label>
                <input
                  type="text"
                  required
                  value={capitalForm.partnerName}
                  onChange={(e) => setCapitalForm({ ...capitalForm, partnerName: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={capitalForm.amount}
                    onChange={(e) => setCapitalForm({ ...capitalForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={capitalForm.date}
                    onChange={(e) => setCapitalForm({ ...capitalForm, date: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Payment Channel</label>
                  <select
                    value={capitalForm.paymentMode}
                    onChange={(e) => setCapitalForm({ ...capitalForm, paymentMode: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="BANK">Bank Account (NEFT/RTGS)</option>
                    <option value="CASH">Cash in Hand</option>
                  </select>
                </div>
                {capitalForm.paymentMode === "BANK" && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Select Bank</label>
                    <select
                      value={capitalForm.bankAccountId}
                      onChange={(e) => setCapitalForm({ ...capitalForm, bankAccountId: e.target.value })}
                      className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} - {b.accountNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes / Narration</label>
                <input
                  type="text"
                  value={capitalForm.notes}
                  onChange={(e) => setCapitalForm({ ...capitalForm, notes: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCapitalModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  Post Capital Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Loan */}
      {showLoanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" /> Register Business / Vehicle Loan
            </h3>

            <form onSubmit={handleLoanSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Loan Code</label>
                  <input
                    type="text"
                    value={loanForm.loanCode}
                    onChange={(e) => setLoanForm({ ...loanForm, loanCode: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Lender Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank Ltd"
                    value={loanForm.lenderName}
                    onChange={(e) => setLoanForm({ ...loanForm, lenderName: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Loan Classification</label>
                  <select
                    value={loanForm.loanType}
                    onChange={(e) => setLoanForm({ ...loanForm, loanType: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="VEHICLE_LOAN">Commercial Vehicle Financing</option>
                    <option value="EQUIPMENT_LOAN">Heavy PEB Machinery Loan</option>
                    <option value="WORKING_CAPITAL_CC_OD">Cash Credit / Overdraft Facility</option>
                    <option value="TERM_LOAN">Business Term Loan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Principal Sanctioned (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={loanForm.principalAmount}
                    onChange={(e) => setLoanForm({ ...loanForm, principalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Interest % p.a.</label>
                  <input
                    type="number"
                    step="0.01"
                    value={loanForm.interestRate}
                    onChange={(e) => setLoanForm({ ...loanForm, interestRate: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    value={loanForm.tenureMonths}
                    onChange={(e) => setLoanForm({ ...loanForm, tenureMonths: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Monthly EMI (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={loanForm.monthlyEmiAmount}
                    onChange={(e) => setLoanForm({ ...loanForm, monthlyEmiAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Disbursement Date</label>
                  <input
                    type="date"
                    value={loanForm.disbursementDate}
                    onChange={(e) => setLoanForm({ ...loanForm, disbursementDate: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Disbursement Bank</label>
                  <select
                    value={loanForm.bankAccountId}
                    onChange={(e) => setLoanForm({ ...loanForm, bankAccountId: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="disburseVoucher"
                  checked={loanForm.recordDisbursementVoucher}
                  onChange={(e) => setLoanForm({ ...loanForm, recordDisbursementVoucher: e.target.checked })}
                  className="rounded border-border text-amber-500"
                />
                <label htmlFor="disburseVoucher" className="text-xs text-foreground cursor-pointer">
                  Immediately credit principal to bank account and create double-entry voucher
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoanModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Loan Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pay Monthly EMI */}
      {showEmiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-500" /> Pay Loan EMI (3-Line Double-Entry Split)
            </h3>

            <form onSubmit={handleEmiSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Loan Facility *</label>
                <select
                  required
                  value={emiForm.loanId}
                  onChange={(e) => setEmiForm({ ...emiForm, loanId: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-semibold"
                >
                  <option value="">-- Select Loan --</option>
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.loanCode} - {l.lenderName} (Balance: ₹{Number(l.outstandingBalance).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={emiForm.paymentDate}
                    onChange={(e) => setEmiForm({ ...emiForm, paymentDate: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">EMI Period *</label>
                  <input
                    type="text"
                    required
                    value={emiForm.emiMonth}
                    onChange={(e) => setEmiForm({ ...emiForm, emiMonth: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Principal Component (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={emiForm.principalComponent}
                    onChange={(e) => setEmiForm({ ...emiForm, principalComponent: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-bold text-blue-600"
                  />
                  <span className="text-[10px] text-muted-foreground">Debits Loan Liability</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Interest Component (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={emiForm.interestComponent}
                    onChange={(e) => setEmiForm({ ...emiForm, interestComponent: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-bold text-rose-500"
                  />
                  <span className="text-[10px] text-muted-foreground">Debits Interest Expense</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Auto-Debit Bank Account</label>
                <select
                  value={emiForm.bankAccountId}
                  onChange={(e) => setEmiForm({ ...emiForm, bankAccountId: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-muted/40 rounded border border-border flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold">Total EMI Bank Deduction:</span>
                <span className="font-bold text-base text-foreground">
                  ₹ {(emiForm.principalComponent + emiForm.interestComponent).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmiModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  Post 3-Line EMI Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Fixed Asset */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" /> Register Fixed Asset / Vehicle
            </h3>

            <form onSubmit={handleAssetSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Asset Code</label>
                  <input
                    type="text"
                    value={assetForm.assetCode}
                    onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Classification</label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="VEHICLE">Commercial Site Vehicle</option>
                    <option value="PEB_MACHINERY">PEB Machinery & Roll Forming</option>
                    <option value="OFFICE_EQUIPMENT">Office Equipment & Computers</option>
                    <option value="SHED_STRUCTURE">Yard Shed & Infrastructure</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Asset Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inverter Arc Welder 400A or Tata Ace"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Purchase Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={assetForm.purchaseCost}
                    onChange={(e) => setAssetForm({ ...assetForm, purchaseCost: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Annual WDV Depr %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={assetForm.depreciationRateAnnual}
                    onChange={(e) => setAssetForm({ ...assetForm, depreciationRateAnnual: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={assetForm.purchaseDate}
                    onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Paying Bank</label>
                  <select
                    value={assetForm.bankAccountId}
                    onChange={(e) => setAssetForm({ ...assetForm, bankAccountId: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  Save Fixed Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive / Delete Modal */}
      <ArchiveConfirmModal
        isOpen={archiveModal.isOpen}
        title="Archive Record"
        message="Are you sure you want to archive this financial record? It will be removed from active calculations."
        recordLabel={archiveModal.recordLabel}
        onConfirm={handleArchive}
        onCancel={() =>
          setArchiveModal({ isOpen: false, recordId: "", recordLabel: "", loading: false })
        }
        loading={archiveModal.loading}
      />
    </div>
  );
}
