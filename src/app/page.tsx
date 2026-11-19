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
  FileText,
  CreditCard,
  Plus,
  Clock,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { AccountType } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();

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

  // Receivables & Invoices
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "VOID" } },
    select: { balanceDue: true, dueDate: true, status: true, totalAmount: true },
  });
  let totalReceivables = toDecimal(0);
  let currentReceivables = toDecimal(0);
  let overdueReceivables = toDecimal(0);

  invoices.forEach((inv) => {
    const bal = toDecimal(inv.balanceDue);
    if (bal.greaterThan(0)) {
      totalReceivables = totalReceivables.plus(bal);
      if (inv.dueDate && new Date(inv.dueDate) < now) {
        overdueReceivables = overdueReceivables.plus(bal);
      } else {
        currentReceivables = currentReceivables.plus(bal);
      }
    }
  });

  // Payables & Vendor Bills
  const bills = await prisma.purchaseBill.findMany({
    select: { balanceDue: true, dueDate: true, status: true, totalAmount: true },
  });
  let totalPayables = toDecimal(0);
  let currentPayables = toDecimal(0);
  let overduePayables = toDecimal(0);

  bills.forEach((b) => {
    const bal = toDecimal(b.balanceDue);
    if (bal.greaterThan(0)) {
      totalPayables = totalPayables.plus(bal);
      if (b.dueDate && new Date(b.dueDate) < now) {
        overduePayables = overduePayables.plus(bal);
      } else {
        currentPayables = currentPayables.plus(bal);
      }
    }
  });

  // Machines & Active Fleet
  const machines = await prisma.machineAsset.findMany({
    orderBy: { sNo: "asc" },
    include: {
      allocations: {
        where: { status: "ACTIVE" },
        take: 1,
      },
    },
    take: 6,
  });

  // Recent Vouchers
  const recentVouchers = await prisma.journalEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      createdBy: { select: { name: true } },
    },
  });

  // Bank Statement Queue
  const pendingUncatCount = await prisma.bankTransaction.count({
    where: { status: "UNCATEGORIZED" },
  });

  // Active Projects
  const activeProjects = await prisma.project.findMany({
    take: 4,
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  });

  const systemSettings = await prisma.systemSettings.findFirst();
  const nextSerialDisplay = `SR-${String((systemSettings?.lastQuoteSerialNumber || 0) + 1).padStart(5, "0")}`;
  const nextInvoiceNo = (systemSettings?.lastInvoiceNumber || 32) + 1;

  // Liquidity Metrics
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

  // Top Expenses Breakdown
  const topExpenseAccounts = expenseAccounts
    .map((a) => ({
      name: a.name,
      code: a.code,
      amount: toDecimal(a.currentBalance),
    }))
    .sort((a, b) => b.amount.minus(a.amount).toNumber())
    .slice(0, 5);

  // Fiscal months data for Cash Flow
  const months = [
    "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Executive Command & Zoho 1-Click Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
            SR
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Standard Roofs Books • Executive Command
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                FY {fy?.name || "2026-27"} Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Managing Director: Prabhakaran T • Erode Headquarters • GSTIN: 33AEWFS5187G1ZD
            </p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/estimates"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Plus size={14} />
            <span>+ Create Quote {nextSerialDisplay}</span>
          </Link>

          <Link
            href="/invoices/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Receipt size={14} />
            <span>+ Tax Invoice #{nextInvoiceNo}</span>
          </Link>

          <Link
            href="/bills"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
          >
            <FileText size={14} />
            <span>+ Record Bill</span>
          </Link>

          <Link
            href="/banking"
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Landmark size={14} />
            <span>+ Categorize ICICI ({pendingUncatCount})</span>
          </Link>
        </div>
      </div>

      {/* Zoho Books Side-by-Side Summary Cards: Total Receivables vs Total Payables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Total Receivables Card (Zoho Books Style) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Receivables
              </span>
              <Link
                href="/invoices/new"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                + New Invoice #{nextInvoiceNo}
              </Link>
            </div>

            <div className="mt-3">
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                {formatINR(totalReceivables)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Total Unpaid Customer Invoices
              </p>
            </div>

            {/* Current vs Overdue Split Bar */}
            <div className="mt-5 space-y-2">
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{
                    width: totalReceivables.isZero()
                      ? "50%"
                      : `${currentReceivables.dividedBy(totalReceivables).times(100).toNumber()}%`,
                  }}
                  title="Current Receivables"
                />
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{
                    width: totalReceivables.isZero()
                      ? "50%"
                      : `${overdueReceivables.dividedBy(totalReceivables).times(100).toNumber()}%`,
                  }}
                  title="Overdue Receivables"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400 font-sans">Current:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{formatINR(currentReceivables)}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400 font-sans">Overdue:</span>
                  <strong className="text-amber-600 dark:text-amber-400">{formatINR(overdueReceivables)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Customer Accounts Receivable (Ledger 1030)</span>
            <Link href="/invoices" className="text-blue-600 font-bold hover:underline">
              View Invoices &rarr;
            </Link>
          </div>
        </div>

        {/* Total Payables Card (Zoho Books Style) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Payables
              </span>
              <Link
                href="/bills"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                + New Bill
              </Link>
            </div>

            <div className="mt-3">
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                {formatINR(totalPayables)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Total Unpaid Vendor Bills
              </p>
            </div>

            {/* Current vs Overdue Split Bar */}
            <div className="mt-5 space-y-2">
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{
                    width: totalPayables.isZero()
                      ? "50%"
                      : `${currentPayables.dividedBy(totalPayables).times(100).toNumber()}%`,
                  }}
                  title="Current Payables"
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{
                    width: totalPayables.isZero()
                      ? "50%"
                      : `${overduePayables.dividedBy(totalPayables).times(100).toNumber()}%`,
                  }}
                  title="Overdue Payables"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400 font-sans">Current:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{formatINR(currentPayables)}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400 font-sans">Overdue:</span>
                  <strong className="text-rose-600 dark:text-rose-400">{formatINR(overduePayables)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Creditor Accounts Payable (Ledger 2010)</span>
            <Link href="/payments-made" className="text-blue-600 font-bold hover:underline">
              View Payments Made &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Cash Flow Statement Card (Apr 2026 – Mar 2027) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Landmark className="text-blue-600" size={18} /> Cash Flow (Fiscal Year Apr 2026 – Mar 2027)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monthly tracking of incoming collections vs outgoing disbursements and net liquidity position
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Cash & Bank as on 01/04/2026</span>
              <strong className="text-sm text-slate-900 dark:text-slate-100">₹ 24,03,272.00</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Live Closing Balance</span>
              <strong className="text-sm text-emerald-600 dark:text-emerald-400">{formatINR(totalLiquidity)}</strong>
            </div>
          </div>
        </div>

        {/* Visual Monthly Flow Chart Strip */}
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase">
            {months.map((m) => (
              <div key={m}>{m}</div>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-2 h-24 items-end bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            {months.map((m, idx) => (
              <div key={m} className="flex flex-col items-center justify-end h-full group relative">
                {/* Visual pillar */}
                <div
                  className={`w-full rounded-t transition-all ${
                    idx === 0
                      ? "bg-blue-600 h-16 shadow-sm shadow-blue-500/20"
                      : "bg-slate-200 dark:bg-slate-700 h-6 hover:bg-blue-400"
                  }`}
                />
                <span className="text-[9px] font-mono mt-1 text-slate-500">
                  {idx === 0 ? "₹24.03L" : "₹0.00"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Opening ICICI Liquidity
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Incoming Collections
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Outgoing Disbursements
              </span>
            </div>
            <Link href="/banking" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
              Reconcile Bank Statement &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Income & Expense + Top Expenses Breakdown + Site Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Income vs Expense & Top Expenses */}
        <div className="lg:col-span-7 space-y-6">
          {/* Income vs Expenses Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-600" /> Income vs. Direct Site Expenses
              </h3>
              <Link href="/reports" className="text-xs text-blue-600 font-bold hover:underline">
                P&L Statement &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">Total Income</span>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1">
                  {formatINR(totalIncome)}
                </div>
                <span className="text-[10px] text-emerald-600/80 block mt-0.5">Project Contracts</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900">
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase block">Total Expenses</span>
                <div className="text-lg font-black text-rose-700 dark:text-rose-300 font-mono mt-1">
                  {formatINR(totalExpense)}
                </div>
                <span className="text-[10px] text-rose-600/80 block mt-0.5">Steel & Site Work</span>
              </div>

              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900">
                <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase block">Net Margin</span>
                <div className="text-lg font-black text-teal-700 dark:text-teal-300 font-mono mt-1">
                  {formatINR(netSurplus)}
                </div>
                <span className="text-[10px] text-teal-600/80 block mt-0.5">Operating Profit</span>
              </div>
            </div>

            {/* Top Expenses Breakdown */}
            <div className="pt-2 space-y-2.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Top Operating Expenses Breakdown
              </span>
              <div className="space-y-2">
                {topExpenseAccounts.map((a, idx) => (
                  <div key={a.code} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{a.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">({a.code})</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(a.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent General Ledger Vouchers */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-blue-600" /> Recent Double-Entry Vouchers
              </h3>
              <Link href="/vouchers" className="text-xs text-blue-600 font-bold hover:underline">
                View All Vouchers &rarr;
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentVouchers.map((v) => (
                <div key={v.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600">{v.entryNumber}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 font-semibold">
                        {v.voucherType}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{v.narration}</p>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">{formatINR(v.totalDebit)}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">{v.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Active Roofing Sites & SRM Team Custody */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Roofing Projects */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Briefcase size={16} className="text-blue-600" /> Active Roofing Projects
              </h3>
              <Link href="/projects" className="text-xs text-blue-600 font-bold hover:underline">
                All Sites &rarr;
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeProjects.map((p) => (
                <div key={p.id} className="py-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-slate-100">{p.code} — {p.name}</strong>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>{p.siteLocation}, {p.city}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatINR(p.contractValue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SRM Machine & Tool Custody Strip */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Wrench size={16} className="text-amber-600" /> SRM Tools in Site Custody
              </h3>
              <Link href="/machines" className="text-xs text-blue-600 font-bold hover:underline">
                View 35 Assets &rarr;
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {machines.map((m) => (
                <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt={m.name} className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Wrench size={12} className="text-slate-400" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{m.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{m.assetCode}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Working: {m.srFinalCount}
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
