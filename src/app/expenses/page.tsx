"use client";

import { useEffect, useState } from "react";
import {
  ReceiptIndianRupee,
  Plus,
  Paperclip,
  Calendar,
  Building,
  CreditCard,
  AlertCircle,
  FileCheck,
  Wallet,
  Building2,
  Briefcase,
  Users,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

interface ExpenseItem {
  id: string;
  voucherNumber: string;
  date: string;
  amount: string;
  purpose: string;
  paymentMode: string;
  category: string | null;
  isOfficeExpense: boolean;
  teamName: string | null;
  receiptUrl: string | null;
  account: { code: string; name: string };
  bankAccount: { bankName: string; accountName: string } | null;
  project: { code: string; name: string } | null;
  status: string;
}

const AVAILABLE_TEAMS = [
  "SRM01",
  "SRM02",
  "SRM03",
  "SRM04",
  "SRM05",
  "SRM06",
  "Team Thenarrusu",
  "Team Saran",
  "Office",
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"ALL" | "SITE" | "OFFICE">("ALL");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isOfficeExpense, setIsOfficeExpense] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [category, setCategory] = useState("SITE_MISC");
  const [teamName, setTeamName] = useState("SRM01");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [bankAccountId, setBankAccountId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expRes, accRes, bankRes, prjRes] = await Promise.all([
        fetch("/api/expenses"),
        fetch("/api/chart-of-accounts"),
        fetch("/api/bank-accounts"),
        fetch("/api/projects"),
      ]);
      const expData = await expRes.json();
      const accData = await accRes.json();
      const bankData = await bankRes.json();
      const prjData = await prjRes.json();

      if (expData.success) setExpenses(expData.expenses);
      if (accData.success) {
        const expOnly = accData.accounts.filter((a: any) => a.type === "EXPENSE");
        setAccounts(expOnly);
        if (expOnly.length > 0 && !accountId) setAccountId(expOnly[0].id);
      }
      if (bankData.success) {
        setBankAccounts(bankData.bankAccounts);
        if (bankData.bankAccounts.length > 0 && !bankAccountId) {
          setBankAccountId(bankData.bankAccounts[0].id);
        }
      }
      if (prjData.success) {
        setProjects(prjData.projects);
        if (prjData.projects.length > 0 && !projectId) {
          setProjectId(prjData.projects[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("accountId", accountId);
      formData.append("amount", amount);
      formData.append("purpose", purpose);
      formData.append("paymentMode", paymentMode);
      formData.append("isOfficeExpense", String(isOfficeExpense));
      formData.append("category", isOfficeExpense ? "OFFICE_OVERHEAD" : category);
      formData.append("teamName", isOfficeExpense ? "Office" : teamName);

      if (paymentMode === "BANK" && bankAccountId) formData.append("bankAccountId", bankAccountId);
      if (!isOfficeExpense && projectId) formData.append("projectId", projectId);
      if (receiptFile) formData.append("receipt", receiptFile);

      const res = await fetch("/api/expenses", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setAmount("");
        setPurpose("");
        setReceiptFile(null);
        fetchData();
      } else {
        setErrorMsg(data.error || "Failed to record expense");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    if (filterTab === "SITE") return !e.isOfficeExpense;
    if (filterTab === "OFFICE") return e.isOfficeExpense;
    return true;
  });

  const totalFilteredAmount = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const siteExpensesTotal = expenses.filter((e) => !e.isOfficeExpense).reduce((s, e) => s + Number(e.amount), 0);
  const officeOverheadsTotal = expenses.filter((e) => e.isOfficeExpense).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ReceiptIndianRupee className="text-blue-600" size={26} />
            Site Expenses & General Office Overheads
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Clear separation: tag direct expenses to specific project sites and teams, or log general Erode office overheads without penalizing site profitability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition"
          >
            <Plus size={16} /> Record Expense Voucher
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Total Expenses Recorded</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {formatINR(siteExpensesTotal + officeOverheadsTotal)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{expenses.length} Vouchers</span>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase flex items-center gap-1">
            <Briefcase size={12} /> Direct Site Project Expenses
          </span>
          <div className="text-xl font-black text-blue-900 font-mono mt-1">
            {formatINR(siteExpensesTotal)}
          </div>
          <span className="text-[10px] text-blue-600 mt-0.5 block">Allocated to Project Costing</span>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1">
            <Building2 size={12} /> General Office Overheads
          </span>
          <div className="text-xl font-black text-amber-900 font-mono mt-1">
            {formatINR(officeOverheadsTotal)}
          </div>
          <span className="text-[10px] text-amber-600 mt-0.5 block">Rent, EB, Staff, Stationery (Company P&L)</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setFilterTab("ALL")}
          className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 ${
            filterTab === "ALL" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          All Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setFilterTab("SITE")}
          className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 ${
            filterTab === "SITE" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Direct Site Expenses ({expenses.filter((e) => !e.isOfficeExpense).length})
        </button>
        <button
          onClick={() => setFilterTab("OFFICE")}
          className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 ${
            filterTab === "OFFICE" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          General Office Overheads ({expenses.filter((e) => e.isOfficeExpense).length})
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Voucher #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3">Project / Site</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Expense Head (GL)</th>
                <th className="px-4 py-3">Purpose / Particulars</th>
                <th className="px-4 py-3">Payment Mode</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">Loading expenses...</td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No expense vouchers found in this category.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{exp.voucherNumber}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(exp.date).toISOString().split("T")[0]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          exp.isOfficeExpense
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {exp.isOfficeExpense ? "Office Overhead" : "Site Direct"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {exp.isOfficeExpense ? (
                        <span className="text-slate-400 italic">Erode Head Office</span>
                      ) : (
                        exp.project?.name || "General Site"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {exp.teamName || (exp.isOfficeExpense ? "Office" : "SRM01")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-slate-400 mr-1">{exp.account.code}</span>
                      {exp.account.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{exp.purpose}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-bold">{exp.paymentMode}</span>
                      {exp.bankAccount && <span className="text-[10px] text-slate-400 block">{exp.bankAccount.bankName}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                      {formatINR(exp.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Record Expense Voucher */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ReceiptIndianRupee className="text-blue-600" /> Record Expense Voucher
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Posts balanced double-entry voucher automatically to Expense GL and Cash/Bank.
            </p>

            {errorMsg && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-3.5 mt-4 text-xs">
              {/* Type Switcher */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-700">Expense Classification:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOfficeExpense(false)}
                    className={`p-2.5 rounded-lg border text-left font-bold transition flex items-center gap-2 ${
                      !isOfficeExpense
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Briefcase size={15} />
                    <div>
                      <div>Direct Site Expense</div>
                      <div className="text-[10px] font-normal opacity-85">Tied to Project Site & Team</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOfficeExpense(true)}
                    className={`p-2.5 rounded-lg border text-left font-bold transition flex items-center gap-2 ${
                      isOfficeExpense
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Building2 size={15} />
                    <div>
                      <div>General Office Overhead</div>
                      <div className="text-[10px] font-normal opacity-85">Rent, EB, Staff, Tea, Admin</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Conditional Site & Team Selectors */}
              {!isOfficeExpense ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700">Project Site *</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white"
                      required
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Working Team *</label>
                    <select
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {AVAILABLE_TEAMS.filter((t) => t !== "Office").map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                  <strong>Office Overhead Note:</strong> This expense is logged under Erode Head Office/Admin and will <strong>NOT</strong> reduce any individual site's profitability.
                </div>
              )}

              {/* Account & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Expense Account (GL Head) *</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 8500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Purpose / Particulars *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 inch Cutting wheels, Eicher crane unloading, office tea..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              {/* Payment Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="CASH">Cash in Hand (GL 1010)</option>
                    <option value="BANK">Bank Account / UPI (GL 1020)</option>
                  </select>
                </div>
                {paymentMode === "BANK" && (
                  <div>
                    <label className="font-bold text-slate-700">Select Bank Account</label>
                    <select
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} - {b.accountName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow"
                >
                  {submitting ? "Posting..." : "Record & Post Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
