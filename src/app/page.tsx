import { prisma } from "@/lib/prisma";
import { formatINR, toDecimal } from "@/lib/decimal";
import {
  Wallet,
  Landmark,
  TrendingUp,
  TrendingDown,
  Wrench,
  Receipt,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Building,
  PlusCircle,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Camera,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { AccountType } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const fy = await prisma.financialYear.findFirst({
    where: { isCurrent: true },
    include: {
      voucherSequences: true,
    },
  });

  const cashAccount = await prisma.account.findUnique({
    where: { code: "1010" },
  });

  const bankAccounts = await prisma.bankAccount.findMany({
    include: { account: true },
  });

  const incomeAccounts = await prisma.account.findMany({
    where: { type: AccountType.INCOME },
  });

  const expenseAccounts = await prisma.account.findMany({
    where: { type: AccountType.EXPENSE },
  });

  const machines = await prisma.machineAsset.findMany({
    orderBy: { sNo: "asc" },
    include: {
      allocations: {
        where: { status: "ACTIVE" },
        take: 1,
      },
    },
    take: 8,
  });

  const recentVouchers = await prisma.journalEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      createdBy: { select: { name: true } },
    },
  });

  const pendingUncatCount = await prisma.bankTransaction.count({
    where: { status: "UNCATEGORIZED" },
  });

  const lowStockCount = await prisma.materialItem.count({
    where: { currentStock: { lte: 5 } },
  });

  const systemSettings = await prisma.systemSettings.findFirst();
  const nextSerialDisplay = `SR-${String((systemSettings?.lastQuoteSerialNumber || 0) + 1).padStart(5, "0")}`;

  const activeProjects = await prisma.project.findMany({
    take: 4,
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  });

  // Calculate Metrics
  const cashBal = toDecimal(cashAccount?.currentBalance || "0");
  const bankTotal = bankAccounts.reduce(
    (sum, b) => sum.plus(toDecimal(b.currentBalance)),
    toDecimal(0)
  );
  const totalLiquidity = cashBal.plus(bankTotal);

  const totalIncome = incomeAccounts.reduce(
    (sum, a) => sum.plus(toDecimal(a.currentBalance)),
    toDecimal(0)
  );

  const totalExpense = expenseAccounts.reduce(
    (sum, a) => sum.plus(toDecimal(a.currentBalance)),
    toDecimal(0)
  );

  const directSiteCosts = expenseAccounts
    .filter((a) => a.code.startsWith("5"))
    .reduce((sum, a) => sum.plus(toDecimal(a.currentBalance)), toDecimal(0));

  const officeOverheads = expenseAccounts
    .filter((a) => a.code.startsWith("6"))
    .reduce((sum, a) => sum.plus(toDecimal(a.currentBalance)), toDecimal(0));

  const grossSiteProfit = totalIncome.minus(directSiteCosts);
  const netSurplus = grossSiteProfit.minus(officeOverheads);

  const invoiceSeq = fy?.voucherSequences.find((s) => s.voucherType === "INVOICE");
  const nextInvoiceDisplay = invoiceSeq
    ? `${invoiceSeq.prefix}${String(invoiceSeq.nextNumber).padStart(invoiceSeq.paddingLength, "0")}`
    : "SR/26-27/0033";

  const isCleanSlate = totalLiquidity.isZero() && totalIncome.isZero() && totalExpense.isZero();

  return (
    <div className="space-y-6">
      {/* Mobile Site Supervisor Quick Action Bar (Visible primarily on small screens) */}
      <div className="md:hidden bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span>FIELD QUICK ACTIONS</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600 text-white font-mono">SITE MODE</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/expenses"
            className="flex flex-col items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-center gap-1.5 transition"
          >
            <Camera className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] font-semibold leading-tight">+ Upload Bill Photo</span>
          </Link>
          <Link
            href="/machines"
            className="flex flex-col items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-center gap-1.5 transition"
          >
            <Wrench className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-semibold leading-tight">My SRM Tools</span>
          </Link>
          <Link
            href="/fleet"
            className="flex flex-col items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-center gap-1.5 transition"
          >
            <Truck className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] font-semibold leading-tight">Vehicle & Diesel</span>
          </Link>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              FY {fy?.name || "2026-27"} Active
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Double-Entry Compliant
            </span>
            {isCleanSlate && (
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Pristine ₹0.00 Books
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black mt-2 tracking-tight">
            Standard Roofs Books & ERP
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            In-house financial management, PEB roofing project accounting, daily cash reconciliation
            and machine tracking for Erode headquarters.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 text-right">
          <span className="text-[10px] text-slate-300 uppercase tracking-wider block">
            Next Invoice Sequence
          </span>
          <span className="text-lg font-mono font-black text-blue-300">
            {nextInvoiceDisplay}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            (Sequence #{invoiceSeq?.nextNumber || 33} continuing cleanly)
          </span>
        </div>
      </div>

      {/* Executive Daily Action & Quick Access Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Executive Daily Actions (Prabhakaran T • MD Command)
            </h3>
            <p className="text-[11px] text-slate-500">
              Direct shortcuts to create Zoho quotations, tax invoice sequence #33, and categorize ICICI bank transactions.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/estimates"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
          >
            <PlusCircle size={15} />
            <span>+ Create Quote {nextSerialDisplay}</span>
          </Link>

          <Link
            href="/invoices/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl text-xs font-bold shadow transition active:scale-95"
          >
            <Receipt size={15} />
            <span>+ Tax Invoice #{invoiceSeq?.nextNumber || 33}</span>
          </Link>

          <Link
            href="/banking"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow transition active:scale-95"
          >
            <Landmark size={15} />
            <span>+ Categorize ICICI ({pendingUncatCount})</span>
          </Link>

          <Link
            href="/expenses"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition active:scale-95"
          >
            <ArrowUpRight size={15} />
            <span>+ Record Expense</span>
          </Link>

          <Link
            href="/inventory"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition active:scale-95"
          >
            <Layers size={15} />
            <span>+ Issue Material</span>
          </Link>
        </div>
      </div>

      {/* Operational Action Alerts (93 ICICI Transactions & Low Stock) */}
      {pendingUncatCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
              {pendingUncatCount}
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100">
                {pendingUncatCount} Pending ICICI Bank Statement Transactions
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                Account 155205003161 has {pendingUncatCount} statement entries ready for 1-click categorization into Customer Advance, Vendor Bills, and Site Costs.
              </div>
            </div>
          </div>
          <Link
            href="/banking"
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow transition shrink-0 whitespace-nowrap"
          >
            Categorize Feed Now &rarr;
          </Link>
        </div>
      )}

      {/* Plain-English High-Contrast Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Link
          href="/advances"
          className="bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-400 p-4 rounded-xl shadow-xs transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:scale-105 transition-transform">
              <ArrowDownLeft className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Incoming</span>
          </div>
          <div className="mt-3">
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">Money Received (In)</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Customer advances or invoice payments</p>
          </div>
        </Link>

        <Link
          href="/expenses"
          className="bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-400 p-4 rounded-xl shadow-xs transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 bg-rose-100 text-rose-700 rounded-lg group-hover:scale-105 transition-transform">
              <ArrowUpRight className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold text-rose-700 uppercase">Outgoing</span>
          </div>
          <div className="mt-3">
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-rose-700">Money Paid / Expense</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Site materials, tea, crane, food & fuel</p>
          </div>
        </Link>

        <Link
          href="/invoices/new"
          className="bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 p-4 rounded-xl shadow-xs transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold text-blue-700 uppercase">#{invoiceSeq?.nextNumber || 33}</span>
          </div>
          <div className="mt-3">
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700">Create Tax Invoice</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">GST Code 33 compliant tax invoice</p>
          </div>
        </Link>

        <Link
          href="/fleet"
          className="bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-400 p-4 rounded-xl shadow-xs transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-lg group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold text-amber-700 uppercase">Logistics</span>
          </div>
          <div className="mt-3">
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700">Vehicle & Diesel Entry</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Log Bolero / Eicher site trip & fuel</p>
          </div>
        </Link>

        <Link
          href="/machines"
          className="bg-white hover:bg-purple-50/50 border border-slate-200 hover:border-purple-400 p-4 rounded-xl shadow-xs transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 bg-purple-100 text-purple-700 rounded-lg group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold text-purple-700 uppercase">Tools</span>
          </div>
          <div className="mt-3">
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700">Issue Machine to Team</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Track SRM01-06 welder & drill custody</p>
          </div>
        </Link>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">ICICI Bank & Liquidity</span>
            <Landmark size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 font-mono">
            {formatINR(totalLiquidity)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
            <span>ICICI (xxxx3161): {formatINR(bankTotal)}</span>
            <span>Petty Cash: {formatINR(cashBal)}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Project Revenue</span>
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatINR(totalIncome)}
          </p>
          <span className="text-[11px] text-slate-500 mt-2 block pt-2 border-t border-slate-100 dark:border-slate-800">
            PEB Roofing & Fabrication Contracts
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Site Expenses</span>
            <TrendingDown size={18} className="text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {formatINR(totalExpense)}
          </p>
          <span className="text-[11px] text-slate-500 mt-2 block pt-2 border-t border-slate-100 dark:border-slate-800">
            Steel, Labour, Cranes & Consumables
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Net Operating Surplus</span>
            <Receipt size={18} className="text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-2">
            {formatINR(netSurplus)}
          </p>
          <span className="text-[11px] text-slate-500 mt-2 block pt-2 border-t border-slate-100 dark:border-slate-800">
            Gross Margin before Tax
          </span>
        </div>
      </div>

      {/* Executive Site vs. Office Overheads P&L Bar */}
      <div className="p-4 bg-linear-to-r from-slate-900 to-blue-950 text-white rounded-2xl border border-slate-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-400" size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Executive Site Performance vs. Office Overheads
            </h3>
          </div>
          <Link
            href="/reports"
            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
          >
            View Full CA Financial Reports &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Total Project Revenue</span>
            <div className="font-mono font-bold text-sm text-white mt-0.5">{formatINR(totalIncome)}</div>
            <span className="text-[10px] text-slate-400 block">Client Contracts & Billed</span>
          </div>

          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Direct Site Costs</span>
            <div className="font-mono font-bold text-sm text-rose-300 mt-0.5">{formatINR(directSiteCosts)}</div>
            <span className="text-[10px] text-slate-400 block">Materials, Labour & Cranes</span>
          </div>

          <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/30">
            <span className="text-[10px] text-emerald-400 uppercase font-bold">Gross Site Profit</span>
            <div className="font-mono font-bold text-sm text-emerald-300 mt-0.5">{formatINR(grossSiteProfit)}</div>
            <span className="text-[10px] text-emerald-400 block">Direct Site Surplus</span>
          </div>

          <div className="p-2.5 bg-amber-950/40 rounded-xl border border-amber-500/30">
            <span className="text-[10px] text-amber-400 uppercase font-bold">Office Overheads</span>
            <div className="font-mono font-bold text-sm text-amber-300 mt-0.5">{formatINR(officeOverheads)}</div>
            <span className="text-[10px] text-amber-400 block">Erode Yard Rent, EB & Admin</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Quick Actions & Machine Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Vouchers & Quick Navigation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileSpreadsheet className="text-blue-600" size={18} />
                Recent General Ledger Vouchers
              </h2>
              <Link
                href="/vouchers"
                className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {recentVouchers.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-400">
                    No vouchers recorded yet. Starting at clean ₹ 0.00 books.
                  </p>
                  <Link
                    href="/invoices/new"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Issue First Invoice (#33)
                  </Link>
                </div>
              ) : (
                recentVouchers.map((v) => (
                  <div
                    key={v.id}
                    className="py-3 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-2 rounded-lg transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {v.entryNumber}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {v.voucherType}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                        {v.narration}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
                        {formatINR(v.totalDebit)}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        {v.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: SRM01-SRM06 Machine Allocations Overview */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Wrench className="text-amber-600" size={18} />
                Machine & Tool Fleet (SRM)
              </h2>
              <Link href="/machines" className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 text-amber-600 transition">
                View All 35 Tools &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {machines.map((m) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt={m.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                        <Wrench className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {m.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {m.assetCode} • {m.category}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                      Working: {m.srFinalCount}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Total: {m.totalCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
