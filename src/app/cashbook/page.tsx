"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Edit3,
  Trash2,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Filter,
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

interface CashEntry {
  id: string;
  voucherNumber: string;
  date: string;
  type: "CASH_INFLOW" | "CASH_OUTFLOW";
  amount: string;
  purpose: string;
  category: string;
  walletName: string;
  counterpartyName: string | null;
}

interface WalletBalance {
  walletName: string;
  balance: number;
}

const WALLETS = [
  "Office Cash",
  "ICICI",
  "Office Gpay",
  "Ravi Gpay",
  "Prabha Gpay",
  "RBL",
  "Periyasamy Gpay",
  "Suji Cash",
];

const CATEGORIES = [
  "Customer Payment",
  "Supplier Payment",
  "Contractor payment",
  "Labour Wages",
  "Employee Salary",
  "Labour Advance",
  "Employee Advance",
  "Food",
  "Petrol",
  "Material",
  "Chit",
  "Service",
  "Go2 Expenses",
  "Go 2 income",
  "Diwali Expenses",
  "Site visit expenses",
  "Other Expenses",
  "Other income",
  "Cash transfer",
];

function formatINR(val: number | string): string {
  const n = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export default function CashBookPage() {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [totalInflow, setTotalInflow] = useState("0.00");
  const [totalOutflow, setTotalOutflow] = useState("0.00");
  const [currentBalance, setCurrentBalance] = useState("0.00");
  const [loading, setLoading] = useState(true);

  const [selectedWallet, setSelectedWallet] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [entryModal, setEntryModal] = useState<{
    mode: "ADD" | "EDIT";
    id?: string;
    date: string;
    type: "CASH_INFLOW" | "CASH_OUTFLOW";
    amount: string;
    purpose: string;
    category: string;
    walletName: string;
    counterpartyName: string;
  } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<CashEntry | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadCashBook = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedWallet !== "ALL") params.set("wallet", selectedWallet);
      if (selectedCategory !== "ALL") params.set("category", selectedCategory);

      const res = await fetch(`/api/cashbook?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setWalletBalances(data.walletBalances || []);
        setTotalInflow(data.totalInflow || "0.00");
        setTotalOutflow(data.totalOutflow || "0.00");
        setCurrentBalance(data.currentCashBalance || "0.00");
      }
    } catch {
      showToast("Failed to load Cash Book", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedWallet, selectedCategory]);

  useEffect(() => {
    loadCashBook();
  }, [loadCashBook]);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryModal) return;
    const payload = {
      date: entryModal.date,
      type: entryModal.type,
      amount: Number(entryModal.amount) || 0,
      purpose: entryModal.purpose.trim(),
      category: entryModal.category,
      walletName: entryModal.walletName,
      counterpartyName: entryModal.counterpartyName.trim() || null,
    };

    const url = entryModal.mode === "ADD" ? "/api/cashbook" : `/api/cashbook/${entryModal.id}`;
    const method = entryModal.mode === "ADD" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      setEntryModal(null);
      showToast(entryModal.mode === "ADD" ? "Cash Book entry recorded" : "Cash Book entry updated");
      await loadCashBook();
    } else {
      showToast(data.error || "Failed to save entry", "error");
    }
  };

  const handleDeleteEntry = async () => {
    if (!confirmDelete) return;
    const res = await fetch(`/api/cashbook/${confirmDelete.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setConfirmDelete(null);
      showToast("Entry deleted & wallet balance recalculated");
      await loadCashBook();
    } else {
      showToast(data.error || "Failed to delete entry", "error");
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.purpose.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.walletName.toLowerCase().includes(q) ||
      (e.counterpartyName || "").toLowerCase().includes(q) ||
      e.voucherNumber.toLowerCase().includes(q)
    );
  });

  const handleExport = () => {
    const rows = filteredEntries.map((e) => ({
      Date: new Date(e.date).toISOString().slice(0, 10),
      Voucher: e.voucherNumber,
      Type: e.type,
      Wallet: e.walletName,
      Category: e.category,
      Purpose: e.purpose,
      Counterparty: e.counterpartyName || "",
      Amount: Number(e.amount),
    }));
    exportToExcel(rows, `SR_CashBook_${selectedWallet}`, "CashBook");
  };

  return (
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-2 space-y-5 font-sans pb-16 text-slate-800">
      {/* 1. HEADER */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
              Standard Daily Cash Book & 8-Wallet Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live balances across Office Cash, ICICI, Office Gpay, Ravi Gpay, Prabha Gpay, RBL, Periyasamy Gpay & Suji Cash
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setEntryModal({
                mode: "ADD",
                date: new Date().toISOString().slice(0, 10),
                type: "CASH_OUTFLOW",
                amount: "",
                purpose: "",
                category: "Material",
                walletName: selectedWallet !== "ALL" ? selectedWallet : "Office Cash",
                counterpartyName: "",
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus size={14} />
            <span>+ Add Entry</span>
          </button>
        </div>
      </div>

      {/* 2. 8-WALLET LIVE BALANCE CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {walletBalances.map((wb) => {
          const isSelected = selectedWallet === wb.walletName;
          return (
            <button
              key={wb.walletName}
              type="button"
              onClick={() => setSelectedWallet(isSelected ? "ALL" : wb.walletName)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white hover:bg-slate-50 border-slate-200/90 text-slate-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
              }`}
            >
              <div className={`text-[10px] font-bold uppercase tracking-wider truncate ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                {wb.walletName}
              </div>
              <div className={`text-sm font-extrabold mt-1 tabular-nums ${isSelected ? "text-white" : wb.balance < 0 ? "text-rose-600" : "text-slate-900"}`}>
                {formatINR(wb.balance)}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. TOTALS + FILTERS */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-semibold">Net Liquidity: </span>
            <span className="font-extrabold text-indigo-700 tabular-nums">{formatINR(currentBalance)}</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-700 font-bold tabular-nums">
            <ArrowDownLeft size={14} /> Inflow: {formatINR(totalInflow)}
          </div>
          <div className="flex items-center gap-1 text-rose-600 font-bold tabular-nums">
            <ArrowUpRight size={14} /> Outflow: {formatINR(totalOutflow)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <Filter size={12} className="text-slate-400" />
            <select
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All 8 Wallets</option>
              {WALLETS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, voucher..."
              className="pl-7 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* 4. CASH BOOK TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading 8-wallet Cash Book...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">No entries match the current filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Wallet</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Description / Purpose</th>
                  <th className="py-3 px-3 text-right text-emerald-700">Inflow (₹)</th>
                  <th className="py-3 px-3 text-right text-rose-600">Outflow (₹)</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(entry.date).toISOString().slice(0, 10)}
                      <div className="text-[9.5px] text-slate-400">{entry.voucherNumber}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10.5px] font-bold">
                        {entry.walletName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-slate-700">
                      {entry.category}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900">{entry.purpose}</div>
                      {entry.counterpartyName && (
                        <div className="text-[10px] text-slate-400">{entry.counterpartyName}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700 tabular-nums">
                      {entry.type === "CASH_INFLOW" ? formatINR(entry.amount) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600 tabular-nums">
                      {entry.type === "CASH_OUTFLOW" ? formatINR(entry.amount) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setEntryModal({
                              mode: "EDIT",
                              id: entry.id,
                              date: new Date(entry.date).toISOString().slice(0, 10),
                              type: entry.type,
                              amount: String(entry.amount),
                              purpose: entry.purpose,
                              category: entry.category,
                              walletName: entry.walletName,
                              counterpartyName: entry.counterpartyName || "",
                            })
                          }
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                          title="Edit Entry"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(entry)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {entryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveEntry} className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-bold text-sm text-slate-900">
                {entryModal.mode === "ADD" ? "New 8-Wallet Cash Book Entry" : "Edit Cash Book Entry"}
              </div>
              <button type="button" onClick={() => setEntryModal(null)} className="text-slate-500 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={entryModal.date}
                    onChange={(e) => setEntryModal({ ...entryModal, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Flow Type</label>
                  <select
                    value={entryModal.type}
                    onChange={(e) => setEntryModal({ ...entryModal, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="CASH_OUTFLOW">Outflow (Paid / Expense)</option>
                    <option value="CASH_INFLOW">Inflow (Received)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wallet *</label>
                  <select
                    value={entryModal.walletName}
                    onChange={(e) => setEntryModal({ ...entryModal, walletName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    {WALLETS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={entryModal.category}
                    onChange={(e) => setEntryModal({ ...entryModal, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={entryModal.amount}
                  onChange={(e) => setEntryModal({ ...entryModal, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Purpose *</label>
                <input
                  required
                  type="text"
                  value={entryModal.purpose}
                  onChange={(e) => setEntryModal({ ...entryModal, purpose: e.target.value })}
                  placeholder="Site material, customer receipt, contractor payment..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Counterparty / Site</label>
                <input
                  type="text"
                  value={entryModal.counterpartyName}
                  onChange={(e) => setEntryModal({ ...entryModal, counterpartyName: e.target.value })}
                  placeholder="Optional customer/vendor/team name"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setEntryModal(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer">
                Save Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-3">
            <div className="text-sm font-extrabold text-slate-900">Delete Cash Book Entry?</div>
            <p className="text-xs text-slate-600">
              Remove <strong>{confirmDelete.purpose}</strong> ({formatINR(confirmDelete.amount)}) from <strong>{confirmDelete.walletName}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleDeleteEntry} className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold text-white flex items-center gap-2 ${toast.type === "error" ? "bg-rose-600" : "bg-indigo-600"}`}>
          <CheckCircle2 size={15} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
