"use client";

import { useEffect, useState } from "react";
import {
  Landmark,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  X,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

interface BankAccountItem {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  currentBalance: string;
  accountId: string;
  account: {
    code: string;
    name: string;
    currentBalance: string;
  };
  transactions: Array<{
    id: string;
    voucherNumber: string;
    date: string;
    type: string;
    amount: string;
    referenceNumber: string | null;
    payeeOrPayer: string;
    purpose: string;
    isReconciled?: boolean;
    reconciledAt?: string | null;
    bankStatementRef?: string | null;
  }>;
}

export default function BankingPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);

  // Transaction Modal State
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [transactionType, setTransactionType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [payeeOrPayer, setPayeeOrPayer] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Contra Voucher Modal State
  const [showContraModal, setShowContraModal] = useState(false);
  const [contraType, setContraType] = useState<"CASH_TO_BANK" | "BANK_TO_CASH" | "BANK_TO_BANK">("CASH_TO_BANK");
  const [contraSourceBankId, setContraSourceBankId] = useState("");
  const [contraDestBankId, setContraDestBankId] = useState("");
  const [contraAmount, setContraAmount] = useState("");
  const [contraRef, setContraRef] = useState("");
  const [contraNarration, setContraNarration] = useState("");

  // Reconciliation Modal & State
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileBankId, setReconcileBankId] = useState("");
  const [reconcileSummary, setReconcileSummary] = useState<any>(null);
  const [csvText, setCsvText] = useState("");
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMsg, setReconcileMsg] = useState("");

  const fetchBankData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/bank-accounts");
      const data = await res.json();
      if (data.success) {
        setBankAccounts(data.bankAccounts);
        if (data.bankAccounts.length > 0 && !selectedBankId) {
          setSelectedBankId(data.bankAccounts[0].id);
          setContraSourceBankId(data.bankAccounts[0].id);
          setReconcileBankId(data.bankAccounts[0].id);
          if (data.bankAccounts.length > 1) {
            setContraDestBankId(data.bankAccounts[1].id);
          } else {
            setContraDestBankId(data.bankAccounts[0].id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoA = async () => {
    try {
      const res = await fetch("/api/chart-of-accounts");
      const data = await res.json();
      if (data.success) {
        setAllAccounts(data.accounts);
        if (data.accounts.length > 0) {
          setTargetAccountId(data.accounts[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReconcileSummary = async (bId: string) => {
    if (!bId) return;
    try {
      const res = await fetch(`/api/banking/reconcile?bankAccountId=${bId}`);
      const data = await res.json();
      if (data.success) {
        setReconcileSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBankData();
    fetchCoA();
  }, []);

  useEffect(() => {
    if (reconcileBankId) {
      fetchReconcileSummary(reconcileBankId);
    }
  }, [reconcileBankId]);

  const handlePostTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId: selectedBankId,
          type: transactionType,
          amount,
          purpose,
          payeeOrPayer,
          referenceNumber,
          targetAccountId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowTransactionModal(false);
        setAmount("");
        setPurpose("");
        setPayeeOrPayer("");
        setReferenceNumber("");
        fetchBankData();
      } else {
        setErrorMsg(data.error || "Failed to post bank transaction");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostContra = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/banking/contra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contraType,
          sourceBankId: contraSourceBankId,
          destinationBankId: contraDestBankId,
          amount: contraAmount,
          referenceNumber: contraRef,
          narration: contraNarration,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message || "Contra voucher created successfully!");
        setShowContraModal(false);
        setContraAmount("");
        setContraRef("");
        setContraNarration("");
        fetchBankData();
      } else {
        setErrorMsg(data.error || "Failed to create Contra Voucher");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleReconcile = async (txId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/banking/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_SINGLE",
          transactionId: txId,
          isReconciled: !currentStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBankData();
        if (reconcileBankId) fetchReconcileSummary(reconcileBankId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleParseAndAutoMatchCSV = async () => {
    if (!csvText.trim()) {
      alert("Please paste bank statement CSV content.");
      return;
    }

    setReconciling(true);
    setReconcileMsg("");
    try {
      // Simple CSV parser
      const lines = csvText.trim().split("\n");
      const rows: any[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || (i === 0 && line.toLowerCase().includes("date"))) continue;

        const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        if (cols.length >= 3) {
          // Expected format: Date, Description, RefNo, Debit, Credit, Balance
          rows.push({
            date: cols[0],
            description: cols[1] || "",
            refNo: cols[2] || "",
            debit: parseFloat(cols[3]) || 0,
            credit: parseFloat(cols[4]) || 0,
            balance: parseFloat(cols[5]) || 0,
          });
        }
      }

      if (rows.length === 0) {
        alert("No valid rows detected in CSV format.");
        setReconciling(false);
        return;
      }

      const res = await fetch("/api/banking/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "AUTO_MATCH_STATEMENT",
          bankAccountId: reconcileBankId,
          statementRows: rows,
          fileName: `BankStatement_${new Date().toISOString().split("T")[0]}.csv`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReconcileMsg(data.message);
        fetchBankData();
        fetchReconcileSummary(reconcileBankId);
      } else {
        alert(data.error || "Auto-matching failed.");
      }
    } catch (err: any) {
      alert("Error parsing CSV: " + err.message);
    } finally {
      setReconciling(false);
    }
  };

  const totalBankLiquidity = bankAccounts.reduce(
    (sum, b) => sum + parseFloat(b.currentBalance || "0"),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
              Zoho Banking
            </span>
            <span className="text-xs text-slate-400 font-medium">Contra Transfers & CSV Reconciliation</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-1">
            <Landmark className="text-blue-600" /> Banking & Credit Facilities
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Current accounts, cash contra transfers, auto bank reconciliation & cleared check tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Contra Voucher Button */}
          <button
            onClick={() => setShowContraModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition active:scale-95"
          >
            <ArrowLeftRight size={15} /> + Contra Voucher (Cash ⇄ Bank)
          </button>

          {/* Auto Reconcile Button */}
          <button
            onClick={() => setShowReconcileModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl text-xs font-bold shadow transition active:scale-95"
          >
            <Sparkles size={15} className="text-amber-400" /> Auto-Reconcile Statement
          </button>

          {/* Deposit Button */}
          <button
            onClick={() => {
              setTransactionType("DEPOSIT");
              setShowTransactionModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition active:scale-95"
          >
            <ArrowDownLeft size={15} /> + Deposit
          </button>

          {/* Withdrawal Button */}
          <button
            onClick={() => {
              setTransactionType("WITHDRAWAL");
              setShowTransactionModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition active:scale-95"
          >
            <ArrowUpRight size={15} /> - Payout
          </button>
        </div>
      </div>

      {/* Bank Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-8 text-xs text-slate-400">
            Loading bank accounts...
          </div>
        ) : (
          bankAccounts.map((bank) => (
            <div
              key={bank.id}
              className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-6 rounded-2xl shadow-lg border border-slate-700/60 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center font-bold text-blue-400">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{bank.accountName}</h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {bank.bankName} • {bank.branchName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    GL: {bank.account.code}
                  </span>
                  <button
                    onClick={() => {
                      setReconcileBankId(bank.id);
                      setShowReconcileModal(true);
                    }}
                    className="p-1 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 transition"
                  >
                    Reconcile
                  </button>
                </div>
              </div>

              <div className="mt-6 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Available Balance
                  </span>
                  <p className="text-2xl font-black text-white mt-0.5 font-mono">
                    {formatINR(bank.currentBalance)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    A/C Number
                  </span>
                  <p className="font-mono text-xs font-bold text-slate-200 mt-0.5">
                    •••• •••• {bank.accountNumber.slice(-4)}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                    IFSC: {bank.ifscCode}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Statement & Transactions Table with Reconciliation Badges */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Bank Transaction Ledger & Reconciliation Status
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {bankAccounts.flatMap((b) => b.transactions).length} entries
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Combined Bank Liquidity: <strong className="text-slate-800 dark:text-slate-100 font-mono">{formatINR(totalBankLiquidity)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Bank</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Payee / Payer</th>
                <th className="py-3 px-4">Purpose / Reference</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Status / Reconciled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {bankAccounts.flatMap((b) => b.transactions).length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No bank transactions recorded yet. Use Contra, Deposit, or Payout to record.
                  </td>
                </tr>
              ) : (
                bankAccounts.flatMap((b) =>
                  b.transactions.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {t.voucherNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {b.bankName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.type === "DEPOSIT" || t.type === "TRANSFER_IN"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {t.payeeOrPayer}
                      </td>
                      <td className="py-3 px-4">
                        <div>{t.purpose}</div>
                        {t.referenceNumber && (
                          <div className="text-[10px] font-mono text-slate-400">
                            Ref: {t.referenceNumber}
                          </div>
                        )}
                        {t.bankStatementRef && (
                          <div className="text-[10px] text-blue-500 italic">
                            Matched: {t.bankStatementRef}
                          </div>
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          t.type === "DEPOSIT" || t.type === "TRANSFER_IN"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatINR(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleReconcile(t.id, !!t.isReconciled)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition ${
                            t.isReconciled
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                          }`}
                          title="Click to toggle reconciled status"
                        >
                          {t.isReconciled ? (
                            <>
                              <CheckCircle2 size={12} />
                              <span>Cleared</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 rounded-full bg-slate-400" />
                              <span>Pending</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contra Voucher Modal */}
      {showContraModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ArrowLeftRight className="text-indigo-600" /> Record Contra Voucher
                </h2>
                <p className="text-xs text-slate-500">
                  Internal liquidity transfer (Cash ⇄ Bank or Bank ⇄ Bank). Bypasses P&L entirely.
                </p>
              </div>
              <button
                onClick={() => setShowContraModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePostContra} className="space-y-3.5 mt-4 text-xs">
              {/* Type Selector Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setContraType("CASH_TO_BANK")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition ${
                    contraType === "CASH_TO_BANK"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Cash → Bank
                </button>
                <button
                  type="button"
                  onClick={() => setContraType("BANK_TO_CASH")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition ${
                    contraType === "BANK_TO_CASH"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Bank → Cash
                </button>
                <button
                  type="button"
                  onClick={() => setContraType("BANK_TO_BANK")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition ${
                    contraType === "BANK_TO_BANK"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Bank → Bank
                </button>
              </div>

              {/* Source & Destination selectors based on type */}
              {contraType === "CASH_TO_BANK" && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Destination Bank Account *
                  </label>
                  <select
                    value={contraDestBankId}
                    onChange={(e) => setContraDestBankId(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    required
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountName} (•••• {b.accountNumber.slice(-4)})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Source: Cash-in-Hand (GL 1010) → Credit Cash, Debit Bank
                  </span>
                </div>
              )}

              {contraType === "BANK_TO_CASH" && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Source Bank Account (ATM / Cheque Withdrawal) *
                  </label>
                  <select
                    value={contraSourceBankId}
                    onChange={(e) => setContraSourceBankId(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    required
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountName} (•••• {b.accountNumber.slice(-4)})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Destination: Cash-in-Hand (GL 1010) → Credit Bank, Debit Cash
                  </span>
                </div>
              )}

              {contraType === "BANK_TO_BANK" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      From Bank (Source) *
                    </label>
                    <select
                      value={contraSourceBankId}
                      onChange={(e) => setContraSourceBankId(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                      required
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} (•••• {b.accountNumber.slice(-4)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      To Bank (Destination) *
                    </label>
                    <select
                      value={contraDestBankId}
                      onChange={(e) => setContraDestBankId(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                      required
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} (•••• {b.accountNumber.slice(-4)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={contraAmount}
                  onChange={(e) => setContraAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  required
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Cheque / UTR / Reference No.
                </label>
                <input
                  type="text"
                  value={contraRef}
                  onChange={(e) => setContraRef(e.target.value)}
                  placeholder="e.g. ATM-0492 / CHQ-100234"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Narration / Purpose
                </label>
                <input
                  type="text"
                  value={contraNarration}
                  onChange={(e) => setContraNarration(e.target.value)}
                  placeholder="e.g. Daily office cash replenishment from HDFC"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContraModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Posting..." : "Post Contra Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Reconciliation Modal */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Bank Statement Auto-Reconciliation
                  </h2>
                  <p className="text-xs text-slate-500">
                    Match bank statement CSV lines with internal books and calculate cleared balances.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReconcileModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Select Bank for reconciliation */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Reconciling Bank:
              </label>
              <select
                value={reconcileBankId}
                onChange={(e) => setReconcileBankId(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} - {b.accountName} (•••• {b.accountNumber.slice(-4)})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Bank Reconciliation Summary Card */}
            {reconcileSummary && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                  Bank Reconciliation Statement Summary
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400">Balance as per Company Books</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                      ₹ {parseFloat(reconcileSummary.bookBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400">Reconciled / Cleared in Bank</span>
                    <div className="font-mono font-bold text-emerald-600 text-sm">
                      ₹ {parseFloat(reconcileSummary.reconciledBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-1 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>(+) Unreconciled / Uncleared Cheques Issued:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      ₹ {parseFloat(reconcileSummary.unreconciledPayments).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>(-) Uncredited Deposits / Cheques Received:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      ₹ {parseFloat(reconcileSummary.unreconciledDeposits).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 pt-1">
                    <span>(=) Estimated Bank Statement Balance:</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      ₹ {parseFloat(reconcileSummary.estimatedStatementBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CSV Statement Paste / Upload */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Paste Bank Statement CSV Text:</span>
                <span className="text-[10px] font-normal text-slate-400">
                  Format: Date, Description, RefNo, Debit, Credit, Balance
                </span>
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="2026-04-10, NEFT INWARD TEXVALLEY, UTR998273, 0, 500000, 500000&#10;2026-04-12, TATA STEEL VENDOR NEFT, CMS882711, 250000, 0, 250000"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {reconcileMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{reconcileMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowReconcileModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleParseAndAutoMatchCSV}
                disabled={reconciling || !csvText.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>{reconciling ? "Matching..." : "Run Auto-Matching"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal (Deposit/Withdrawal) */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Landmark className="text-blue-600" />
              {transactionType === "DEPOSIT" ? "Record Bank Deposit" : "Record Bank Payment"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Synchronized Double-Entry posting directly to General Ledger
            </p>

            {errorMsg && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePostTransaction} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Select Bank Account *
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountName} (•••• {b.accountNumber.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {transactionType === "DEPOSIT" ? "Credit Source Account *" : "Debit Expense / Vendor Account *"}
                </label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {allAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  required
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Payee / Payer
                  </label>
                  <input
                    type="text"
                    value={payeeOrPayer}
                    onChange={(e) => setPayeeOrPayer(e.target.value)}
                    placeholder="e.g. Client / Vendor"
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Cheque / UTR Ref
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. UTR884920"
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Purpose / Narration *
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Advance for PEB Roofing Materials"
                  required
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 rounded-lg text-white font-bold transition shadow ${
                    transactionType === "DEPOSIT"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  } disabled:opacity-50`}
                >
                  {submitting ? "Posting..." : "Confirm & Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
