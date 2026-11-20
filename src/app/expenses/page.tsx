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
  Trash2,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import ArchiveConfirmModal from "@/components/common/ArchiveConfirmModal";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

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

  // Search & Archive Modal
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveModal, setArchiveModal] = useState<{
    isOpen: boolean;
    expenseId: string;
    voucherNumber: string;
    loading: boolean;
  }>({
    isOpen: false,
    expenseId: "",
    voucherNumber: "",
    loading: false,
  });

  const handleExportExcel = () => {
    const exportData = filteredExpenses.map((e) => ({
      "Voucher #": e.voucherNumber,
      Date: e.date,
      Classification: e.isOfficeExpense ? "Office Overhead" : "Site Direct",
      Project: e.project?.name || "General Site",
      Team: e.teamName || "-",
      "Expense Head": `${e.account.code} - ${e.account.name}`,
      Particulars: e.purpose,
      "Payment Mode": e.paymentMode,
      "Amount (₹)": e.amount,
    }));
    exportToExcel(exportData, "site_office_expenses");
  };

  const handleExportPDF = () => {
    const printRows = filteredExpenses.map((e) => [
      e.voucherNumber,
      new Date(e.date).toLocaleDateString("en-IN"),
      e.isOfficeExpense ? "Office" : "Site",
      e.project?.name || "General",
      e.purpose,
      formatINR(e.amount),
    ]);
    exportToPDF("Expenses & Overheads Register", ["Voucher #", "Date", "Class", "Project", "Particulars", "Amount (₹)"], printRows, "expenses_register");
  };

  const handleArchive = async () => {
    try {
      setArchiveModal((prev) => ({ ...prev, loading: true }));
      setExpenses((prev) => prev.filter((item) => item.id !== archiveModal.expenseId));
      setArchiveModal({ isOpen: false, expenseId: "", voucherNumber: "", loading: false });
    } catch (err) {
      console.error(err);
      setArchiveModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    if (filterTab === "SITE" && e.isOfficeExpense) return false;
    if (filterTab === "OFFICE" && !e.isOfficeExpense) return false;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      e.voucherNumber.toLowerCase().includes(q) ||
      e.purpose.toLowerCase().includes(q) ||
      (e.project?.name && e.project.name.toLowerCase().includes(q)) ||
      (e.teamName && e.teamName.toLowerCase().includes(q)) ||
      e.account.name.toLowerCase().includes(q);
    return matchesSearch;
  });

  const siteExpensesTotal = expenses.filter((e) => !e.isOfficeExpense).reduce((s, e) => s + Number(e.amount), 0);
  const officeOverheadsTotal = expenses.filter((e) => e.isOfficeExpense).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <ModuleHeaderWithAnalytics
        title="Site Expenses & Office Overheads"
        subtitle="Clear separation: tag direct expenses to specific project sites and teams, or log general Erode office overheads"
        badge="Operating Expenses"
        icon={ReceiptIndianRupee}
        analyticsPreset="operations"
        analyticsCards={[
          {
            label: "Total Expenses (FY)",
            value: formatINR(siteExpensesTotal + officeOverheadsTotal),
            change: `${expenses.length} Vouchers posted`,
            isPositive: false,
          },
          {
            label: "Direct Site Expenses",
            value: formatINR(siteExpensesTotal),
            change: "Allocated to projects",
            isPositive: false,
          },
          {
            label: "General Office Overheads",
            value: formatINR(officeOverheadsTotal),
            change: "Rent, EB, staff & admin",
            isPositive: false,
          },
          {
            label: "Site Allocation %",
            value: `${((siteExpensesTotal / (siteExpensesTotal + officeOverheadsTotal || 1)) * 100).toFixed(1)}%`,
            change: "Direct job costing ratio",
            isPositive: true,
          },
        ]}
        searchPlaceholder="Search voucher #, purpose, project site, team or ledger..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        views={[
          { id: "ALL", label: "All Expenses", count: expenses.length },
          { id: "SITE", label: "Direct Site Expenses", count: expenses.filter((e) => !e.isOfficeExpense).length },
          { id: "OFFICE", label: "Office Overheads", count: expenses.filter((e) => e.isOfficeExpense).length },
        ]}
        selectedView={filterTab}
        onViewChange={(v) => setFilterTab(v as any)}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        sampleData={[
          {
            "Voucher #": "EXP-26-001",
            Date: "2026-11-20",
            Classification: "Site Direct",
            "Project Code": "SR-PRJ-2026-001",
            Team: "SRM01",
            "Expense Account Code": "5050",
            "Purpose / Particulars": "Generator diesel refill on site",
            "Payment Mode": "CASH",
            "Amount (₹)": "3500",
          },
        ]}
        sampleColumns={[
          "Voucher #",
          "Date",
          "Classification",
          "Project Code",
          "Team",
          "Expense Account Code",
          "Purpose / Particulars",
          "Payment Mode",
          "Amount (₹)",
        ]}
        primaryAction={{
          label: "Record Expense Voucher",
          onClick: () => setShowAddModal(true),
          icon: Plus,
        }}
      />

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
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">Loading expenses...</td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
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
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 tabular-nums">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          setArchiveModal({
                            isOpen: true,
                            expenseId: exp.id,
                            voucherNumber: exp.voucherNumber,
                            loading: false,
                          })
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        title="Archive Expense"
                      >
                        <Trash2 size={13} />
                      </button>
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

      {/* Archive / Delete Modal */}
      <ArchiveConfirmModal
        isOpen={archiveModal.isOpen}
        title="Archive Expense Voucher"
        message="Are you sure you want to archive this expense voucher? It will be soft-deleted from active registers."
        recordLabel={archiveModal.voucherNumber}
        onConfirm={handleArchive}
        onCancel={() =>
          setArchiveModal({ isOpen: false, expenseId: "", voucherNumber: "", loading: false })
        }
        loading={archiveModal.loading}
      />
    </div>
  );
}
