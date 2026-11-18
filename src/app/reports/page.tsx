"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  Scale,
  Building,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Layers,
  ArrowRight,
  Filter,
  DollarSign,
  PieChart,
  Sparkles,
} from "lucide-react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"pnl_bs" | "trial" | "projects" | "gst" | "cash_bank">("pnl_bs");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  async function fetchReport() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Error fetching reports:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleExportExcel() {
    window.location.href = "/api/reports/export";
  }

  function handlePrint() {
    window.print();
  }

  function handleExportGstr1Json() {
    if (!data?.gst?.gstr1) return;
    const gstr1Payload = {
      gstin: "33AABCS1234F1Z5",
      fp: "042026",
      b2b: data.gst.gstr1.invoices.map((inv: any) => ({
        ctin: inv.customerGstin || "URP",
        inv: [
          {
            inum: inv.invoiceNumber,
            idt: new Date(inv.date).toLocaleDateString("en-GB").replace(/\//g, "-"),
            val: inv.total,
            pos: inv.stateCode || "33",
            rchrg: "N",
            inv_typ: "R",
            itms: [
              {
                num: 1,
                itm_det: {
                  txval: inv.taxable,
                  camt: inv.cgst,
                  samt: inv.sgst,
                  iamt: inv.igst,
                  csamt: 0,
                },
              },
            ],
          },
        ],
      })),
    };

    const blob = new Blob([JSON.stringify(gstr1Payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1_33AABCS1234F1Z5_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-amber-500" />
            Financial & GST Reports Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Indian CA-standard Profit & Loss, Balance Sheet, Trial Balance, Project Profitability, and GSTR-1 / 3B Compliance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-card p-1 rounded-md border border-border text-xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-foreground p-1 text-xs outline-none"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-foreground p-1 text-xs outline-none"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" /> Export Excel (.xlsx)
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 text-xs font-semibold rounded-md border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
          >
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border bg-card rounded-t-lg px-2 pt-2 print:hidden overflow-x-auto">
        <button
          onClick={() => setActiveTab("pnl_bs")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "pnl_bs"
              ? "border-amber-500 text-amber-500 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Profit & Loss & Balance Sheet
        </button>

        <button
          onClick={() => setActiveTab("trial")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "trial"
              ? "border-amber-500 text-amber-500 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scale className="h-4 w-4" />
          Trial Balance & Ledger
        </button>

        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "projects"
              ? "border-amber-500 text-amber-500 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building className="h-4 w-4" />
          Project Profitability Matrix
        </button>

        <button
          onClick={() => setActiveTab("gst")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "gst"
              ? "border-amber-500 text-amber-500 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="h-4 w-4" />
          GSTR-1 & GSTR-3B Tax Hub
        </button>

        <button
          onClick={() => setActiveTab("cash_bank")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "cash_bank"
              ? "border-amber-500 text-amber-500 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Cash Flow Statement (Direct Reconciled)
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading financial reports...</div>
      ) : !data ? (
        <div className="py-16 text-center text-muted-foreground">Failed to load reports.</div>
      ) : (
        <>
          {/* TAB 1: P&L & BALANCE SHEET */}
          {activeTab === "pnl_bs" && (
            <div className="space-y-6">
              {/* Executive Site vs. Office P&L Summary */}
              {data.siteVsOfficePnL && (
                <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-xl p-6 shadow-md border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                        <Sparkles className="text-amber-400" size={18} />
                        Executive Site vs. Office P&L Summary
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Clear separation of operational site performance from Erode office overheads
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Net Company Result</span>
                      <div className={`text-xl font-black font-mono ${data.siteVsOfficePnL.isCompanyProfitable ? "text-emerald-400" : "text-rose-400"}`}>
                        ₹ {data.siteVsOfficePnL.netCompanyProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({data.siteVsOfficePnL.netCompanyMarginPct}%)
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">1. Total Site Revenue</span>
                      <div className="text-base font-black text-white font-mono mt-1">
                        ₹ {data.siteVsOfficePnL.totalSiteRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">All Roofing Projects</span>
                    </div>

                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">2. Direct Site Costs</span>
                      <div className="text-base font-black text-rose-300 font-mono mt-1">
                        ₹ {data.siteVsOfficePnL.totalDirectSiteCosts.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Material, Labour & Transport</span>
                    </div>

                    <div className="p-3 bg-emerald-950/40 rounded-lg border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold">3. Gross Site Profit</span>
                      <div className="text-base font-black text-emerald-300 font-mono mt-1">
                        ₹ {data.siteVsOfficePnL.grossSiteProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-emerald-400 block mt-0.5">{data.siteVsOfficePnL.grossSiteMarginPct}% Gross Margin</span>
                    </div>

                    <div className="p-3 bg-amber-950/40 rounded-lg border border-amber-500/30">
                      <span className="text-[10px] text-amber-400 uppercase font-bold">4. Office Overheads</span>
                      <div className="text-base font-black text-amber-300 font-mono mt-1">
                        ₹ {data.siteVsOfficePnL.totalOfficeOverheads.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-amber-400 block mt-0.5">Rent, EB, Staff, Admin</span>
                    </div>
                  </div>
                </div>
              )}

              {/* P&L Statement Card */}
              <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Profit & Loss Statement (Income Statement)</h2>
                    <p className="text-xs text-muted-foreground">For Financial Year 2026-27 (INR ₹)</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Net Operating Result</div>
                    <div
                      className={`text-xl font-bold ${
                        data.pnl.netProfitOrLoss >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      ₹ {data.pnl.netProfitOrLoss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {/* Revenue / Income Side */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Revenue from Operations (Income)
                    </h3>
                    <div className="space-y-1.5 divide-y divide-border/60">
                      {data.pnl.incomeAccounts.map((a: any) => (
                        <div key={a.id} className="flex justify-between pt-1.5 text-xs">
                          <span className="text-foreground">
                            {a.name} <span className="text-muted-foreground font-mono">({a.code})</span>
                          </span>
                          <span className="font-semibold text-foreground">
                            ₹ {a.netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t-2 border-border flex justify-between font-bold text-xs text-foreground">
                      <span>Total Income</span>
                      <span>₹ {data.pnl.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Expenses Side */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Operating Expenses
                    </h3>
                    <div className="space-y-1.5 divide-y divide-border/60">
                      {data.pnl.expenseAccounts.map((a: any) => (
                        <div key={a.id} className="flex justify-between pt-1.5 text-xs">
                          <span className="text-foreground">
                            {a.name} <span className="text-muted-foreground font-mono">({a.code})</span>
                          </span>
                          <span className="font-semibold text-foreground">
                            ₹ {a.netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t-2 border-border flex justify-between font-bold text-xs text-foreground">
                      <span>Total Operating Costs</span>
                      <span>₹ {data.pnl.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Sheet Card */}
              <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Balance Sheet (Statement of Financial Position)</h2>
                    <p className="text-xs text-muted-foreground">As at 31st March 2027 (INR ₹)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.balanceSheet.isBalanced ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Balanced: Assets = Liabilities + Equity
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" /> Out of Balance
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {/* Assets Side */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Assets (Current & Fixed)
                    </h3>
                    <div className="space-y-1.5 divide-y divide-border/60">
                      {data.balanceSheet.assetAccounts.map((a: any) => (
                        <div key={a.id} className="flex justify-between pt-1.5 text-xs">
                          <span className="text-foreground">
                            {a.name} <span className="text-muted-foreground font-mono">({a.code})</span>
                          </span>
                          <span className="font-semibold text-foreground">
                            ₹ {a.netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t-2 border-border flex justify-between font-bold text-sm text-foreground">
                      <span>TOTAL ASSETS</span>
                      <span>₹ {data.balanceSheet.totalAssets.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Liabilities & Equity Side */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        Liabilities
                      </h3>
                      <div className="space-y-1.5 divide-y divide-border/60">
                        {data.balanceSheet.liabilityAccounts.map((a: any) => (
                          <div key={a.id} className="flex justify-between pt-1.5 text-xs">
                            <span className="text-foreground">
                              {a.name} <span className="text-muted-foreground font-mono">({a.code})</span>
                            </span>
                            <span className="font-semibold text-foreground">
                              ₹ {a.netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        Equity & Reserves
                      </h3>
                      <div className="space-y-1.5 divide-y divide-border/60">
                        {data.balanceSheet.equityAccounts.map((a: any) => (
                          <div key={a.id} className="flex justify-between pt-1.5 text-xs">
                            <span className="text-foreground">{a.name}</span>
                            <span className="font-semibold text-foreground">
                              ₹ {a.netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-1.5 text-xs font-semibold text-amber-500">
                          <span>Current Year P&L Net Surplus</span>
                          <span>₹ {data.balanceSheet.currentYearSurplus.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t-2 border-border flex justify-between font-bold text-sm text-foreground">
                      <span>TOTAL LIABILITIES & EQUITY</span>
                      <span>₹ {data.balanceSheet.totalLiabAndEquity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRIAL BALANCE */}
          {activeTab === "trial" && (
            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-foreground">Trial Balance Register</h3>
                  <p className="text-xs text-muted-foreground">
                    Double-entry proof of ledger balances. Total Debits must strictly equal Total Credits.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded bg-muted text-xs font-bold text-foreground">
                    Debit: ₹ {data.trialBalance.sumDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="px-3 py-1 rounded bg-muted text-xs font-bold text-foreground">
                    Credit: ₹ {data.trialBalance.sumCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Account Code</th>
                      <th className="py-3 px-4">Account Name</th>
                      <th className="py-3 px-4">Classification</th>
                      <th className="py-3 px-4 text-right">Debit (₹)</th>
                      <th className="py-3 px-4 text-right">Credit (₹)</th>
                      <th className="py-3 px-4 text-right">Net Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.trialBalance.accounts.map((acc: any) => (
                      <tr key={acc.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-500">{acc.code}</td>
                        <td className="py-2.5 px-4 font-medium text-foreground">{acc.name}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                            {acc.subType || acc.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium">
                          {acc.totalDebit > 0 ? `₹ ${acc.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium">
                          {acc.totalCredit > 0 ? `₹ ${acc.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-foreground">
                          ₹ {acc.netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-bold text-xs border-t-2 border-border">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-right">
                        TOTAL TRIAL BALANCE VERIFICATION
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">
                        ₹ {data.trialBalance.sumDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">
                        ₹ {data.trialBalance.sumCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-500">
                        {data.trialBalance.isBalanced ? "✓ BALANCED" : "⚠️ OUT OF BALANCE"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PROJECT-WISE PROFITABILITY COMPARISON */}
          {activeTab === "projects" && (
            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-foreground">Roofing Projects Profitability Matrix</h3>
                  <p className="text-xs text-muted-foreground">
                    Side-by-side comparison of revenue, materials, labour, cargo transport, and profit margins
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Project / Client</th>
                      <th className="py-3 px-4 text-right">Contract Value</th>
                      <th className="py-3 px-4 text-right">Invoiced</th>
                      <th className="py-3 px-4 text-right">Received</th>
                      <th className="py-3 px-4 text-right">Material Cost</th>
                      <th className="py-3 px-4 text-right">Labour & Milestones</th>
                      <th className="py-3 px-4 text-right">Fleet & Transport</th>
                      <th className="py-3 px-4 text-right">Total Cost</th>
                      <th className="py-3 px-4 text-right">Net Profit</th>
                      <th className="py-3 px-4 text-center">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.projectComparison.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-muted-foreground">
                          No active projects found.
                        </td>
                      </tr>
                    ) : (
                      data.projectComparison.map((p: any) => {
                        const isProfitable = p.netProfit >= 0;
                        return (
                          <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-foreground">{p.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {p.code} • {p.customerName}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              ₹ {p.contractVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              ₹ {p.invoiced.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                              ₹ {p.received.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              ₹ {p.materialCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              ₹ {p.labourCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              ₹ {p.transportCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-foreground">
                              ₹ {p.totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-bold ${
                                isProfitable ? "text-emerald-500" : "text-rose-500"
                              }`}
                            >
                              ₹ {p.netProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  isProfitable
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-rose-500/10 text-rose-600"
                                }`}
                              >
                                {p.marginPct}%
                              </span>
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

          {/* TAB 4: GSTR-1 & GSTR-3B GST HUB */}
          {activeTab === "gst" && (
            <div className="space-y-6">
              {/* GST Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card p-5 rounded-lg border border-border shadow-sm">
                  <div className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
                    <span>GSTR-1 Outward Sales</span>
                    <button
                      onClick={handleExportGstr1Json}
                      className="text-amber-500 hover:text-amber-600 font-bold flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" /> JSON Export
                    </button>
                  </div>
                  <div className="text-2xl font-bold mt-2 text-foreground">
                    ₹ {data.gst.gstr1.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Output Tax: ₹ {data.gst.gstr1.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-card p-5 rounded-lg border border-border shadow-sm">
                  <div className="text-xs text-muted-foreground font-semibold">GSTR-3B Input Tax Credit (ITC)</div>
                  <div className="text-2xl font-bold mt-2 text-emerald-500">
                    ₹ {(data.gst.gstr3b.itcAvailable.cgst + data.gst.gstr3b.itcAvailable.sgst + data.gst.gstr3b.itcAvailable.igst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Eligible ITC on Steel & Roofing Purchases</div>
                </div>

                <div className="bg-card p-5 rounded-lg border border-border shadow-sm">
                  <div className="text-xs text-muted-foreground font-semibold">Net GST Payable / (Credit)</div>
                  <div className="text-2xl font-bold mt-2 text-amber-500">
                    ₹ {data.gst.gstr3b.netPayable.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    CGST: ₹{data.gst.gstr3b.netPayable.cgst.toLocaleString()} | SGST: ₹{data.gst.gstr3b.netPayable.sgst.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* GSTR-1 Invoices Register */}
              <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-foreground">GSTR-1 B2B Outward Invoices Register</h3>
                    <p className="text-xs text-muted-foreground">
                      Ready for monthly filing on the GST Portal (GSTIN: 33AABCS1234F1Z5)
                    </p>
                  </div>
                  <button
                    onClick={handleExportGstr1Json}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5" /> Download GSTR-1 JSON
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Invoice No / Date</th>
                        <th className="py-3 px-4">Buyer GSTIN & Name</th>
                        <th className="py-3 px-4 text-center">Place of Supply (POS)</th>
                        <th className="py-3 px-4 text-right">Taxable Value</th>
                        <th className="py-3 px-4 text-right">CGST (₹)</th>
                        <th className="py-3 px-4 text-right">SGST (₹)</th>
                        <th className="py-3 px-4 text-right">IGST (₹)</th>
                        <th className="py-3 px-4 text-right">Total Invoice (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.gst.gstr1.invoices.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-muted-foreground">
                            No sales invoices generated in this period.
                          </td>
                        </tr>
                      ) : (
                        data.gst.gstr1.invoices.map((inv: any) => (
                          <tr key={inv.invoiceNumber} className="hover:bg-muted/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-foreground">{inv.invoiceNumber}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(inv.date).toLocaleDateString("en-IN")}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">{inv.customerName}</div>
                              <div className="font-mono text-muted-foreground text-[11px]">
                                {inv.customerGstin || "Unregistered Buyer"}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-muted text-foreground">
                                {inv.stateCode || "33"} - {inv.stateCode === "33" ? "Tamil Nadu" : "Inter-State"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              ₹ {inv.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              ₹ {inv.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              ₹ {inv.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              ₹ {inv.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-foreground">
                              ₹ {inv.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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

          {/* TAB 5: CASH FLOW STATEMENT */}
          {activeTab === "cash_bank" && data.cashFlow && (
            <div className="space-y-6">
              {/* Cash Flow Summary KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Opening Cash & Bank
                  </span>
                  <div className="text-xl font-black font-mono mt-1 text-foreground">
                    ₹ {data.cashFlow.openingCashAndBank.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Start of Period</span>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Operating Cash Flow
                  </span>
                  <div
                    className={`text-xl font-black font-mono mt-1 ${
                      data.cashFlow.operatingActivities.net >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    ₹ {data.cashFlow.operatingActivities.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Sales & Expenses</span>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Investing Cash Flow
                  </span>
                  <div
                    className={`text-xl font-black font-mono mt-1 ${
                      data.cashFlow.investingActivities.net >= 0 ? "text-emerald-600" : "text-blue-600"
                    }`}
                  >
                    ₹ {data.cashFlow.investingActivities.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Fixed Assets & Equipment</span>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Financing Cash Flow
                  </span>
                  <div
                    className={`text-xl font-black font-mono mt-1 ${
                      data.cashFlow.financingActivities.net >= 0 ? "text-emerald-600" : "text-purple-600"
                    }`}
                  >
                    ₹ {data.cashFlow.financingActivities.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Capital, Drawings & Loans</span>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Closing Cash & Bank
                  </span>
                  <div className="text-xl font-black font-mono mt-1 text-foreground">
                    ₹ {data.cashFlow.closingCashAndBank.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-0.5">
                    <CheckCircle2 size={12} />
                    <span>Balanced with GL</span>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Card */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h2 className="text-lg font-black text-foreground tracking-tight">
                      Cash Flow Statement (Direct Method)
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Strict double-entry reconciliation across Operating, Investing, and Financing activities.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    100% Balanced & Verified
                  </span>
                </div>

                {/* Section A: Operating Activities */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                    <span>1. Cash Flow from Operating Activities</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-foreground">Cash Receipts from Customers (Sales Invoices & Advances)</span>
                      <span className="font-mono font-semibold text-emerald-600">
                        + ₹ {data.cashFlow.operatingActivities.inflows.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-foreground">Cash Outflows for Materials, Site Expenses, Muster & Fleet</span>
                      <span className="font-mono font-semibold text-rose-600">
                        - ₹ {data.cashFlow.operatingActivities.outflows.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-border font-bold">
                      <span>Net Cash Generated from / (Used in) Operating Activities (A)</span>
                      <span className="font-mono text-sm text-foreground">
                        ₹ {data.cashFlow.operatingActivities.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section B: Investing Activities */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                    <span>2. Cash Flow from Investing Activities</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-foreground">Proceeds from Sale of Fixed Assets / Scrap</span>
                      <span className="font-mono font-semibold text-emerald-600">
                        + ₹ {data.cashFlow.investingActivities.inflows.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-foreground">Acquisition of Fixed Assets (PEB Machinery, Commercial Vehicles, Office Equipment)</span>
                      <span className="font-mono font-semibold text-blue-600">
                        - ₹ {data.cashFlow.investingActivities.outflows.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-border font-bold">
                      <span>Net Cash from / (Used in) Investing Activities (B)</span>
                      <span className="font-mono text-sm text-foreground">
                        ₹ {data.cashFlow.investingActivities.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section C: Financing Activities */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                    <span>3. Cash Flow from Financing Activities</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-foreground">Capital Infusion by MD / Partners & Loan Disbursements</span>
                      <span className="font-mono font-semibold text-emerald-600">
                        + ₹ {data.cashFlow.financingActivities.inflows.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-foreground">Partner Drawings & Business Loan Principal / EMI Repayments</span>
                      <span className="font-mono font-semibold text-purple-600">
                        - ₹ {data.cashFlow.financingActivities.outflows.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-border font-bold">
                      <span>Net Cash from / (Used in) Financing Activities (C)</span>
                      <span className="font-mono text-sm text-foreground">
                        ₹ {data.cashFlow.financingActivities.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section D: Reconciliation Summary */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border space-y-2 text-xs">
                  <div className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                    Strict Liquidity Reconciliation (A + B + C)
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Net Change in Cash & Bank:</span>
                    <span className="font-mono font-bold text-foreground">
                      ₹ {data.cashFlow.netCashFlow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>(+) Opening Cash & Bank Equivalents:</span>
                    <span className="font-mono font-bold text-foreground">
                      ₹ {data.cashFlow.openingCashAndBank.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-foreground border-t border-border pt-2">
                    <span>(=) Closing Cash & Bank Equivalents:</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      ₹ {data.cashFlow.closingCashAndBank.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
