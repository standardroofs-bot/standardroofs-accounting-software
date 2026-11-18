"use client";

import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

interface VoucherLine {
  id?: string;
  accountId: string;
  debit: string;
  credit: string;
  narration?: string;
  account?: {
    code: string;
    name: string;
    type: string;
  };
}

interface VoucherItem {
  id: string;
  entryNumber: string;
  date: string;
  voucherType: string;
  narration: string;
  referenceNumber: string | null;
  totalDebit: string;
  totalCredit: string;
  status: "DRAFT" | "POSTED" | "REVERSED";
  isReversal: boolean;
  reversalReason: string | null;
  createdBy: { name: string };
  lines: VoucherLine[];
  reversalOf?: { entryNumber: string };
  reversedBy?: { entryNumber: string };
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [voucherType, setVoucherType] = useState("JOURNAL_VOUCHER");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [narration, setNarration] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [lines, setLines] = useState<Array<{ accountId: string; debit: string; credit: string; narration: string }>>([
    { accountId: "", debit: "0", credit: "0", narration: "" },
    { accountId: "", debit: "0", credit: "0", narration: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Reversal Modal
  const [reversalTarget, setReversalTarget] = useState<VoucherItem | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversing, setReversing] = useState(false);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const url = selectedType === "ALL" ? "/api/vouchers" : `/api/vouchers?type=${selectedType}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setVouchers(data.vouchers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/chart-of-accounts");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts);
        if (data.accounts.length >= 2 && !lines[0].accountId) {
          setLines([
            { accountId: data.accounts[0].id, debit: "0", credit: "0", narration: "" },
            { accountId: data.accounts[1].id, debit: "0", credit: "0", narration: "" },
          ]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVouchers();
    fetchAccounts();
  }, [selectedType]);

  // Live Debit = Credit Calculations
  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) < 0.001 && totalDebit > 0;

  const addLine = () => {
    setLines([
      ...lines,
      { accountId: accounts[0]?.id || "", debit: "0", credit: "0", narration: "" },
    ]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: string, val: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };
    setLines(updated);
  };

  const handlePostVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      setErrorMsg("Transaction is unbalanced! Total Debits must strictly equal Total Credits.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherType,
          date,
          narration,
          referenceNumber,
          lines,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNarration("");
        setReferenceNumber("");
        fetchVouchers();
      } else {
        setErrorMsg(data.error || "Failed to post voucher");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverseVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget || !reversalReason) return;

    setReversing(true);
    try {
      const res = await fetch("/api/vouchers/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journalEntryId: reversalTarget.id,
          reason: reversalReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReversalTarget(null);
        setReversalReason("");
        fetchVouchers();
      } else {
        alert(data.error || "Reversal failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReversing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" /> Accounting Vouchers & Journals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Strict Double-Entry General Ledger Transactions with balanced Debit = Credit guard
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition active:scale-95"
        >
          <Plus size={16} /> + New Journal Voucher
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {["ALL", "PAYMENT", "RECEIPT", "CONTRA", "JOURNAL_VOUCHER", "REVERSAL"].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              selectedType === t
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {t.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Vouchers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Narration</th>
                <th className="py-3 px-4">Ledger Breakdown (Debits & Credits)</th>
                <th className="py-3 px-4 text-right">Total Amount (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading vouchers...
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No vouchers found for this filter.
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition align-top"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <div>{v.entryNumber}</div>
                      {v.referenceNumber && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          Ref: {v.referenceNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(v.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {v.voucherType}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {v.narration}
                      </div>
                      {v.isReversal && v.reversalReason && (
                        <div className="text-[10px] text-rose-500 font-medium mt-1">
                          ↳ Reason: {v.reversalReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {v.lines.map((line, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-4 font-mono text-[11px]"
                          >
                            <span className="text-slate-600 dark:text-slate-400">
                              {line.account?.code} - {line.account?.name}
                            </span>
                            <div className="flex items-center gap-2">
                              {parseFloat(line.debit) > 0 && (
                                <span className="text-emerald-600 font-bold">
                                  Dr: {formatINR(line.debit)}
                                </span>
                              )}
                              {parseFloat(line.credit) > 0 && (
                                <span className="text-blue-600 font-bold">
                                  Cr: {formatINR(line.credit)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(v.totalDebit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          v.status === "POSTED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {v.status === "POSTED" && !v.isReversal ? (
                        <button
                          onClick={() => setReversalTarget(v)}
                          title="Reverse this posted transaction (Never deletes)"
                          className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold border border-rose-200 transition"
                        >
                          <RotateCcw size={12} className="inline mr-1" /> Reverse
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Immutable</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Journal Voucher Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="text-blue-600" /> New Journal Voucher
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600">
                Double-Entry Guard
              </span>
            </div>

            {errorMsg && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePostVoucher} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Voucher Type
                  </label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="JOURNAL_VOUCHER">Journal Voucher (JV)</option>
                    <option value="PAYMENT">Payment Voucher (PV)</option>
                    <option value="RECEIPT">Receipt Voucher (RV)</option>
                    <option value="CONTRA">Contra Voucher (CN)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Reference / Bill No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-9901"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Narration / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adjustment for structural steel transportation charges"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Journal Lines Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <tr>
                      <th className="py-2 px-3">Account</th>
                      <th className="py-2 px-3 w-28">Debit (₹)</th>
                      <th className="py-2 px-3 w-28">Credit (₹)</th>
                      <th className="py-2 px-3">Narration</th>
                      <th className="py-2 px-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="p-1">
                        <td className="py-1.5 px-3">
                          <select
                            value={line.accountId}
                            onChange={(e) => updateLine(idx, "accountId", e.target.value)}
                            className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                          >
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="number"
                            step="0.01"
                            value={line.debit}
                            onChange={(e) => updateLine(idx, "debit", e.target.value)}
                            className="w-full p-1.5 text-right font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="number"
                            step="0.01"
                            value={line.credit}
                            onChange={(e) => updateLine(idx, "credit", e.target.value)}
                            className="w-full p-1.5 text-right font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            placeholder="Line remark"
                            value={line.narration || ""}
                            onChange={(e) => updateLine(idx, "narration", e.target.value)}
                            className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {lines.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addLine}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
              >
                <Plus size={14} /> + Add Line
              </button>

              {/* Debit = Credit Live Guard Card */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs ${
                  isBalanced
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                }`}
              >
                <div>
                  <span>Total Debit: </span>
                  <strong>{formatINR(totalDebit)}</strong>
                </div>
                <div>
                  <span>Total Credit: </span>
                  <strong>{formatINR(totalCredit)}</strong>
                </div>
                <div>
                  <span>Difference: </span>
                  <strong className={isBalanced ? "text-emerald-600" : "text-rose-600"}>
                    {formatINR(difference)}
                  </strong>
                </div>
                <div className="font-sans font-bold flex items-center gap-1">
                  {isBalanced ? (
                    <>
                      <CheckCircle2 size={16} /> Balanced
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} /> Unbalanced
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced || submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition disabled:opacity-40"
                >
                  {submitting ? "Posting..." : "Confirm & Post Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h2 className="text-base font-black text-rose-600 flex items-center gap-2">
              <RotateCcw size={18} /> Reverse Transaction {reversalTarget.entryNumber}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Double-entry audit compliance rule: Original voucher is never deleted. A strictly
              balanced offsetting reversal entry will be posted.
            </p>

            <form onSubmit={handleReverseVoucher} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Mandatory Reversal Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Wrong bank account selected / duplicate invoice billing"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversing}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition disabled:opacity-50"
                >
                  {reversing ? "Reversing..." : "Execute Reversal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
