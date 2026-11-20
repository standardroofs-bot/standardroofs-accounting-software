"use client";

import { useEffect, useState } from "react";
import { Plus, BookOpen, Search, ArrowUpRight, ArrowDownLeft, ShieldAlert, Trash2 } from "lucide-react";
import { formatINR } from "@/lib/decimal";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import ArchiveConfirmModal from "@/components/common/ArchiveConfirmModal";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

interface Account {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  subType: string;
  description: string | null;
  isSystem: boolean;
  currentBalance: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<Account["type"]>("EXPENSE");
  const [subType, setSubType] = useState("DIRECT_EXPENSE");
  const [description, setDescription] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/chart-of-accounts");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts);
        setSummaries(data.summaries);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/chart-of-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          type,
          subType,
          description,
          openingBalance,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setCode("");
        setName("");
        setDescription("");
        setOpeningBalance("0");
        fetchAccounts();
      } else {
        setErrorMsg(data.error || "Failed to create account");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const [archiveModal, setArchiveModal] = useState<{
    isOpen: boolean;
    accountId: string;
    accountName: string;
    loading: boolean;
  }>({
    isOpen: false,
    accountId: "",
    accountName: "",
    loading: false,
  });

  const handleExportExcel = () => {
    const data = filteredAccounts.map((a) => ({
      Code: a.code,
      Name: a.name,
      Type: a.type,
      "Sub-Type": a.subType,
      Description: a.description || "-",
      "Current Balance (₹)": a.currentBalance,
    }));
    exportToExcel(data, "chart_of_accounts");
  };

  const handleExportPDF = () => {
    const printRows = filteredAccounts.map((a) => [
      a.code,
      a.name,
      a.type,
      a.subType,
      formatINR(a.currentBalance),
    ]);
    exportToPDF(
      "Chart of Accounts (General Ledger)",
      ["Code", "Account Name", "Type", "Sub-Type", "Balance (₹)"],
      printRows,
      "chart_of_accounts"
    );
  };

  const handleArchive = async () => {
    try {
      setArchiveModal((prev) => ({ ...prev, loading: true }));
      setAccounts((prev) => prev.filter((acc) => acc.id !== archiveModal.accountId));
      setArchiveModal({ isOpen: false, accountId: "", accountName: "", loading: false });
    } catch (err) {
      console.error(err);
      setArchiveModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesType = filterType === "ALL" || acc.type === filterType;
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.code.includes(searchQuery);
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <ModuleHeaderWithAnalytics
        title="Chart of Accounts"
        subtitle="Strict Double-Entry General Ledger Accounts for Standard Roofs (FY 2026-27)"
        badge="General Ledger"
        icon={BookOpen}
        analyticsPreset="banking"
        analyticsCards={[
          {
            label: "Total Assets (1000s)",
            value: formatINR(summaries.ASSET || "0"),
            change: "Cash, Bank & Receivables",
            isPositive: true,
          },
          {
            label: "Total Liabilities (2000s)",
            value: formatINR(summaries.LIABILITY || "0"),
            change: "Payables & Borrowings",
            isPositive: false,
          },
          {
            label: "Total Equity (3000s)",
            value: formatINR(summaries.EQUITY || "0"),
            change: "Partner Capital",
            isPositive: true,
          },
          {
            label: "Operating Income (4000s)",
            value: formatINR(summaries.INCOME || "0"),
            change: "Sales & Contracts",
            isPositive: true,
          },
        ]}
        searchPlaceholder="Search code or account name..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        views={[
          { id: "ALL", label: "All Accounts", count: accounts.length },
          { id: "ASSET", label: "Assets", count: accounts.filter((a) => a.type === "ASSET").length },
          { id: "LIABILITY", label: "Liabilities", count: accounts.filter((a) => a.type === "LIABILITY").length },
          { id: "EQUITY", label: "Equity", count: accounts.filter((a) => a.type === "EQUITY").length },
          { id: "INCOME", label: "Income", count: accounts.filter((a) => a.type === "INCOME").length },
          { id: "EXPENSE", label: "Expenses", count: accounts.filter((a) => a.type === "EXPENSE").length },
        ]}
        selectedView={filterType}
        onViewChange={setFilterType}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        sampleData={[
          {
            Code: "5050",
            "Account Name": "Site Electricity & Generator Fuel",
            Type: "EXPENSE",
            "Sub-Type": "DIRECT_EXPENSE",
            Description: "Diesel for cranes, generators and site power",
            "Opening Balance": "0",
          },
        ]}
        sampleColumns={[
          "Code",
          "Account Name",
          "Type",
          "Sub-Type",
          "Description",
          "Opening Balance",
        ]}
        primaryAction={{
          label: "New Account",
          onClick: () => setShowAddModal(true),
          icon: Plus,
        }}
      />

      {/* Grouped Tree Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Account Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Sub-Type</th>
                <th className="py-3 px-4 text-right">Current Ledger Balance</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading General Ledger accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No accounts found matching filter.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {acc.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {acc.name}
                      </div>
                      {acc.description && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {acc.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          acc.type === "ASSET"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : acc.type === "LIABILITY"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                            : acc.type === "EQUITY"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                            : acc.type === "INCOME"
                            ? "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                        }`}
                      >
                        {acc.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {acc.subType}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatINR(acc.currentBalance)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {!acc.isSystem ? (
                        <button
                          onClick={() =>
                            setArchiveModal({
                              isOpen: true,
                              accountId: acc.id,
                              accountName: `${acc.code} - ${acc.name}`,
                              loading: false,
                            })
                          }
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                          title="Archive Account"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">System</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Create General Ledger Account
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Add a new account to the Standard Roofs Chart of Accounts
            </p>

            {errorMsg && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Account Code (e.g. 5095)
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. 5095"
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Generator Diesel & Site Power"
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Account Classification
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="EQUITY">EQUITY</option>
                    <option value="INCOME">INCOME</option>
                    <option value="EXPENSE">EXPENSE</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Sub-Type
                  </label>
                  <select
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                  >
                    <option value="DIRECT_EXPENSE">DIRECT_EXPENSE</option>
                    <option value="INDIRECT_EXPENSE">INDIRECT_EXPENSE</option>
                    <option value="CURRENT_ASSET">CURRENT_ASSET</option>
                    <option value="FIXED_ASSET">FIXED_ASSET</option>
                    <option value="CURRENT_LIABILITY">CURRENT_LIABILITY</option>
                    <option value="DUTIES_AND_TAXES">DUTIES_AND_TAXES</option>
                    <option value="DIRECT_INCOME">DIRECT_INCOME</option>
                    <option value="INDIRECT_INCOME">INDIRECT_INCOME</option>
                    <option value="EQUITY">EQUITY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Description / Purpose
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional ledger description..."
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive / Delete Modal */}
      <ArchiveConfirmModal
        isOpen={archiveModal.isOpen}
        title="Archive General Ledger Account"
        message="Are you sure you want to archive this account? Any future transactions referencing this account will be restricted."
        recordLabel={archiveModal.accountName}
        onConfirm={handleArchive}
        onCancel={() =>
          setArchiveModal({ isOpen: false, accountId: "", accountName: "", loading: false })
        }
        loading={archiveModal.loading}
      />
    </div>
  );
}
