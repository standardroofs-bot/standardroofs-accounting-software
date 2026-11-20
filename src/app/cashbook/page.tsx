"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Upload,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import ArchiveConfirmModal from "@/components/common/ArchiveConfirmModal";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

interface CashEntry {
  id: string;
  voucherNumber: string;
  date: string;
  type: "CASH_INFLOW" | "CASH_OUTFLOW";
  amount: string;
  purpose: string;
  category: string;
  counterpartyName: string | null;
  receiptUrl: string | null;
  project: { id: string; name: string; code: string } | null;
  journalEntry: {
    entryNumber: string;
    lines: Array<{
      account: { code: string; name: string };
      debit: string;
      credit: string;
    }>;
  } | null;
  createdBy: { name: string };
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

export default function CashBookPage() {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [currentBalance, setCurrentBalance] = useState("0.00");
  const [totalInflow, setTotalInflow] = useState("0.00");
  const [totalOutflow, setTotalOutflow] = useState("0.00");
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherType, setVoucherType] = useState<"CASH_INFLOW" | "CASH_OUTFLOW">("CASH_OUTFLOW");
  const [showDenominationModal, setShowDenominationModal] = useState(false);

  // Dropdown Options
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Voucher Form State
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [category, setCategory] = useState("Site Expenses");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submittingVoucher, setSubmittingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState("");

  // Denominations State
  const [notes500, setNotes500] = useState(0);
  const [notes200, setNotes200] = useState(0);
  const [notes100, setNotes100] = useState(0);
  const [notes50, setNotes50] = useState(0);
  const [notes20, setNotes20] = useState(0);
  const [notes10, setNotes10] = useState(0);
  const [coins5, setCoins5] = useState(0);
  const [coins2, setCoins2] = useState(0);
  const [coins1, setCoins1] = useState(0);
  const [closingNotes, setClosingNotes] = useState("");
  const [submittingClosing, setSubmittingClosing] = useState(false);

  // Filter & Search & Archive State
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveModal, setArchiveModal] = useState<{
    isOpen: boolean;
    entryId: string;
    voucherNumber: string;
    loading: boolean;
  }>({
    isOpen: false,
    entryId: "",
    voucherNumber: "",
    loading: false,
  });

  const handleExportExcel = () => {
    const exportData = filteredEntries.map((e) => ({
      "Voucher No": e.voucherNumber,
      Date: e.date,
      Type: e.type,
      Purpose: e.purpose,
      Category: e.category,
      Party: e.counterpartyName || "-",
      Project: e.project?.name || "-",
      "Amount (₹)": e.amount,
    }));
    exportToExcel(exportData, "cashbook_entries");
  };

  const handleExportPDF = () => {
    const printRows = filteredEntries.map((e) => [
      e.voucherNumber,
      new Date(e.date).toLocaleDateString("en-IN"),
      e.type === "CASH_INFLOW" ? "INFLOW" : "OUTFLOW",
      e.purpose,
      e.counterpartyName || "-",
      e.type === "CASH_INFLOW" ? formatINR(e.amount) : "-",
      e.type === "CASH_OUTFLOW" ? formatINR(e.amount) : "-",
    ]);
    exportToPDF(
      "Daily Cash Book & Vouchers",
      ["Voucher No", "Date", "Type", "Purpose", "Party", "Inflow (₹)", "Outflow (₹)"],
      printRows,
      "daily_cashbook"
    );
  };

  const handleArchive = async () => {
    try {
      setArchiveModal((prev) => ({ ...prev, loading: true }));
      setEntries((prev) => prev.filter((item) => item.id !== archiveModal.entryId));
      setArchiveModal({ isOpen: false, entryId: "", voucherNumber: "", loading: false });
    } catch (err) {
      console.error(err);
      setArchiveModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const filteredEntries = entries.filter((e) => {
    const matchesFilter =
      statusFilter === "ALL" ||
      (statusFilter === "INFLOW" && e.type === "CASH_INFLOW") ||
      (statusFilter === "OUTFLOW" && e.type === "CASH_OUTFLOW");
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      e.voucherNumber.toLowerCase().includes(q) ||
      e.purpose.toLowerCase().includes(q) ||
      (e.counterpartyName && e.counterpartyName.toLowerCase().includes(q)) ||
      (e.project?.name && e.project.name.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });
  const [closingResult, setClosingResult] = useState<any>(null);

  const fetchCashBook = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cashbook");
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries);
        setCurrentBalance(data.currentCashBalance);
        setTotalInflow(data.totalInflow);
        setTotalOutflow(data.totalOutflow);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const accRes = await fetch("/api/chart-of-accounts");
      const accData = await accRes.json();
      if (accData.success) {
        // Exclude cash in hand itself (1010) as target account
        setAccounts(accData.accounts.filter((a: any) => a.code !== "1010"));
        if (accData.accounts.length > 0) {
          const defaultAcc = accData.accounts.find((a: any) => a.code === "5080") || accData.accounts[0];
          setTargetAccountId(defaultAcc.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCashBook();
    fetchMetadata();
  }, []);

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingVoucher(true);
    setVoucherError("");

    try {
      const formData = new FormData();
      formData.append("type", voucherType);
      formData.append("amount", amount);
      formData.append("purpose", purpose);
      formData.append("category", category);
      formData.append("counterpartyName", counterpartyName);
      formData.append("targetAccountId", targetAccountId);
      if (projectId) formData.append("projectId", projectId);
      if (receiptFile) formData.append("receipt", receiptFile);

      const res = await fetch("/api/cashbook", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setShowVoucherModal(false);
        setAmount("");
        setPurpose("");
        setCounterpartyName("");
        setReceiptFile(null);
        fetchCashBook();
      } else {
        setVoucherError(data.error || "Failed to post cash transaction");
      }
    } catch (err: any) {
      setVoucherError(err.message);
    } finally {
      setSubmittingVoucher(false);
    }
  };

  // Denominations Total Calculation
  const physicalTotal =
    notes500 * 500 +
    notes200 * 200 +
    notes100 * 100 +
    notes50 * 50 +
    notes20 * 20 +
    notes10 * 10 +
    coins5 * 5 +
    coins2 * 2 +
    coins1 * 1;

  const discrepancy = physicalTotal - parseFloat(currentBalance || "0");

  const handleDailyClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingClosing(true);

    try {
      const res = await fetch("/api/cashbook/closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count500: notes500,
          count200: notes200,
          count100: notes100,
          count50: notes50,
          count20: notes20,
          count10: notes10,
          count5: coins5,
          count2: coins2,
          count1: coins1,
          notes: closingNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setClosingResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingClosing(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeaderWithAnalytics
        title="Daily Cash Book & Vouchers"
        subtitle="Real-time physical cash management, project site expenses & denomination reconciliation"
        badge="Cash (1010)"
        icon={Wallet}
        analyticsPreset="banking"
        analyticsCards={[
          {
            label: "Live Cash in Hand (1010)",
            value: formatINR(currentBalance),
            change: "Synchronized with GL",
            isPositive: true,
          },
          {
            label: "Total Inflow (FY)",
            value: formatINR(totalInflow),
            change: "Receipts & Contra",
            isPositive: true,
          },
          {
            label: "Total Outflow (FY)",
            value: formatINR(totalOutflow),
            change: "Site expenses & petty cash",
            isPositive: false,
          },
          {
            label: "Net Cash Flow",
            value: formatINR(parseFloat(totalInflow || "0") - parseFloat(totalOutflow || "0")),
            change: "FY 26-27 Position",
            isPositive: true,
          },
        ]}
        searchPlaceholder="Search voucher no, purpose, party or project..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        views={[
          { id: "ALL", label: "All Vouchers", count: entries.length },
          {
            id: "INFLOW",
            label: "Receipts (+)",
            count: entries.filter((e) => e.type === "CASH_INFLOW").length,
          },
          {
            id: "OUTFLOW",
            label: "Disbursements (-)",
            count: entries.filter((e) => e.type === "CASH_OUTFLOW").length,
          },
        ]}
        selectedView={statusFilter}
        onViewChange={setStatusFilter}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        sampleData={[
          {
            "Voucher No": "CSH-26-001",
            Date: "2026-11-20",
            Type: "CASH_OUTFLOW",
            Purpose: "Site welding consumable cash purchase",
            Category: "Site Expenses",
            Party: "Local Hardware Store",
            "Opposing Account Code": "5010",
            Amount: "2500",
          },
        ]}
        sampleColumns={[
          "Voucher No",
          "Date",
          "Type",
          "Purpose",
          "Category",
          "Party",
          "Opposing Account Code",
          "Amount",
        ]}
        customActions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setVoucherType("CASH_INFLOW");
                setShowVoucherModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <ArrowDownLeft size={14} /> + Cash Inflow
            </button>
            <button
              onClick={() => {
                setVoucherType("CASH_OUTFLOW");
                setShowVoucherModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <ArrowUpRight size={14} /> - Cash Outflow
            </button>
            <button
              onClick={() => setShowDenominationModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition border border-slate-700"
            >
              <Calculator size={14} /> Daily Closing
            </button>
          </div>
        }
      />

      {/* Cash Book Entries Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Cash Vouchers & Audit Log
          </h2>
          <span className="text-xs text-slate-400">
            Showing {filteredEntries.length} of {entries.length} recorded cash transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Purpose / Narration</th>
                <th className="py-3 px-4">Opposing Account</th>
                <th className="py-3 px-4">Receipt Bill</th>
                <th className="py-3 px-4 text-right">Inflow (₹)</th>
                <th className="py-3 px-4 text-right">Outflow (₹)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading cashbook transactions...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No cash transactions found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const opposingLine = entry.journalEntry?.lines.find(
                    (l) => l.account.code !== "1010"
                  );
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {entry.voucherNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(entry.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            entry.type === "CASH_INFLOW"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                          }`}
                        >
                          {entry.type === "CASH_INFLOW" ? "INFLOW" : "OUTFLOW"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {entry.purpose}
                        </div>
                        {entry.counterpartyName && (
                          <div className="text-[11px] text-slate-400">
                            Party: {entry.counterpartyName}
                          </div>
                        )}
                        {entry.project && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                            📍 {entry.project.name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {opposingLine ? `${opposingLine.account.code} - ${opposingLine.account.name}` : "—"}
                      </td>
                      <td className="py-3 px-4">
                        {entry.receiptUrl ? (
                          <a
                            href={entry.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium"
                          >
                            <Paperclip size={12} /> Receipt
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {entry.type === "CASH_INFLOW" ? formatINR(entry.amount) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        {entry.type === "CASH_OUTFLOW" ? formatINR(entry.amount) : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() =>
                            setArchiveModal({
                              isOpen: true,
                              entryId: entry.id,
                              voucherNumber: entry.voucherNumber,
                              loading: false,
                            })
                          }
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                          title="Archive / Delete Voucher"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voucher Inflow/Outflow Creation Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {voucherType === "CASH_INFLOW" ? (
                  <>
                    <ArrowDownLeft className="text-emerald-600" /> New Cash Receipt (Inflow)
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="text-rose-600" /> New Cash Expense / Payment (Outflow)
                  </>
                )}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                FY 2026-27
              </span>
            </div>

            {voucherError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{voucherError}</span>
              </div>
            )}

            <form onSubmit={handleCreateVoucher} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Amount (₹ INR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Purpose / Narration *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    voucherType === "CASH_INFLOW"
                      ? "e.g. Advance cash received from Texvalley for site work"
                      : "e.g. Purchased 500 pcs star bits & welding rods for Perundurai site"
                  }
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Opposing Ledger Account *
                  </label>
                  <select
                    required
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Category Tag
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Site Expenses">Site Expenses</option>
                    <option value="Vehicle Fuel">Vehicle Fuel</option>
                    <option value="Material Purchase">Material Purchase</option>
                    <option value="Labour Advance">Labour Advance</option>
                    <option value="Customer Receipt">Customer Receipt</option>
                    <option value="Crane Charges">Crane Charges</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Counterparty / Payee Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Selvam Hardware / Kumar"
                    value={counterpartyName}
                    onChange={(e) => setCounterpartyName(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Attach Bill / Receipt (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full mt-1 text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-900 dark:text-blue-200">
                ⚡ <strong>Double-Entry Guarantee:</strong> Submitting will atomically post a
                balanced Journal Entry in the General Ledger. Cash in Hand (1010) will adjust
                automatically.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVoucher}
                  className={`px-4 py-2 text-white rounded-lg font-bold transition disabled:opacity-50 ${
                    voucherType === "CASH_INFLOW"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {submittingVoucher
                    ? "Posting Double-Entry..."
                    : voucherType === "CASH_INFLOW"
                    ? "Post Cash Receipt"
                    : "Post Cash Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Cash Closing & Denomination Modal */}
      {showDenominationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calculator className="text-blue-600" /> Daily Cash Denomination Closing
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Physical currency verification against system ledger
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDenominationModal(false);
                  setClosingResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {closingResult ? (
              <div className="my-6 space-y-4 text-center">
                <div
                  className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
                    closingResult.status === "BALANCED"
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                  }`}
                >
                  {closingResult.status === "BALANCED" ? (
                    <CheckCircle2 size={32} />
                  ) : (
                    <AlertCircle size={32} />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-slate-100">
                    {closingResult.status === "BALANCED"
                      ? "Daily Cash Perfectly Balanced!"
                      : "Daily Cash Discrepancy Recorded"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    System Balance: {formatINR(closingResult.systemBalance)} | Physical Total:{" "}
                    {formatINR(closingResult.physicalTotal)}
                  </p>
                  {closingResult.status === "DISCREPANCY" && (
                    <p className="text-xs font-bold text-rose-600 mt-1">
                      Variance: {formatINR(closingResult.discrepancy)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowDenominationModal(false);
                    setClosingResult(null);
                    fetchCashBook();
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleDailyClosing} className="space-y-4 mt-4 text-xs">
                {/* Comparison Card */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans">
                      System Balance
                    </span>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5">
                      {formatINR(currentBalance)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans">
                      Physical Count
                    </span>
                    <p className="font-bold text-blue-600 dark:text-blue-400 text-xs mt-0.5">
                      {formatINR(physicalTotal)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans">
                      Discrepancy
                    </span>
                    <p
                      className={`font-bold text-xs mt-0.5 ${
                        Math.abs(discrepancy) < 0.01
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {formatINR(discrepancy)}
                    </p>
                  </div>
                </div>

                {/* Denomination Inputs */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {[
                    { label: "₹ 500 Notes", val: notes500, set: setNotes500, mult: 500 },
                    { label: "₹ 200 Notes", val: notes200, set: setNotes200, mult: 200 },
                    { label: "₹ 100 Notes", val: notes100, set: setNotes100, mult: 100 },
                    { label: "₹ 50 Notes", val: notes50, set: setNotes50, mult: 50 },
                    { label: "₹ 20 Notes", val: notes20, set: setNotes20, mult: 20 },
                    { label: "₹ 10 Notes", val: notes10, set: setNotes10, mult: 10 },
                    { label: "₹ 5 Coins", val: coins5, set: setCoins5, mult: 5 },
                    { label: "₹ 2 Coins", val: coins2, set: setCoins2, mult: 2 },
                    { label: "₹ 1 Coins", val: coins1, set: setCoins1, mult: 1 },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-1.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/40"
                    >
                      <span className="font-semibold text-slate-700 dark:text-slate-300 w-28">
                        {item.label}
                      </span>
                      <span className="text-slate-400">×</span>
                      <input
                        type="number"
                        min="0"
                        value={item.val}
                        onChange={(e) => item.set(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-20 p-1 text-center font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                      <span className="text-slate-400">=</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 w-24 text-right">
                        {formatINR(item.val * item.mult)}
                      </span>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Closing Notes / Physical Cash Box Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Physical cash counted and verified in Office locker"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDenominationModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingClosing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition disabled:opacity-50"
                  >
                    {submittingClosing ? "Verifying..." : "Confirm & Save Closing"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Archive / Delete Modal */}
      <ArchiveConfirmModal
        isOpen={archiveModal.isOpen}
        title="Archive Cash Voucher"
        message="Are you sure you want to archive this cash voucher? The voucher will be soft-deleted from the active register."
        recordLabel={archiveModal.voucherNumber}
        onConfirm={handleArchive}
        onCancel={() =>
          setArchiveModal({ isOpen: false, entryId: "", voucherNumber: "", loading: false })
        }
        loading={archiveModal.loading}
      />
    </div>
  );
}
