"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  X,
  FileCheck,
} from "lucide-react";

interface AdvanceItem {
  id: string;
  receiptNumber?: string;
  paymentNumber?: string;
  date: string;
  amount: string;
  allocatedAmount: string;
  remainingBalance: string;
  paymentMode: string;
  referenceNumber?: string | null;
  status: string;
  notes?: string | null;
  customer?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}

export default function AdvancesPage() {
  const [activeTab, setActiveTab] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [advances, setAdvances] = useState<AdvanceItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceItem | null>(null);
  const [targetDocId, setTargetDocId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    supplierId: "",
    amount: "",
    paymentMode: "BANK",
    bankAccountId: "",
    referenceNumber: "",
    notes: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [advRes, custRes, suppRes, bankRes, invRes, pbRes] = await Promise.all([
        fetch(`/api/advances?type=${activeTab}`),
        fetch("/api/customers"),
        fetch("/api/suppliers"),
        fetch("/api/bank-accounts"),
        fetch("/api/invoices"),
        fetch("/api/purchases"),
      ]);

      const [advData, custData, suppData, bankData, invData, pbData] = await Promise.all([
        advRes.json(),
        custRes.json(),
        suppRes.json(),
        bankRes.json(),
        invRes.json(),
        pbRes.json(),
      ]);

      if (advData.success) setAdvances(advData.advances);
      if (custData.success) setCustomers(custData.customers || []);
      if (suppData.success) setSuppliers(suppData.suppliers || []);
      if (bankData.success) setBankAccounts(bankData.bankAccounts || []);
      if (invData.success) setInvoices(invData.invoices || []);
      if (pbData.success) setPurchaseBills(pbData.bills || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleRecordAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab === "CUSTOMER" ? "RECORD_CUSTOMER_ADVANCE" : "RECORD_SUPPLIER_ADVANCE",
          ...form,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Advance recorded and ledger updated!");
        setShowRecordModal(false);
        setForm({
          customerId: "",
          supplierId: "",
          amount: "",
          paymentMode: "BANK",
          bankAccountId: "",
          referenceNumber: "",
          notes: "",
        });
        fetchData();
      } else {
        alert(data.error || "Failed to record advance");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvance || !targetDocId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab === "CUSTOMER" ? "APPLY_CUSTOMER_ADVANCE" : "APPLY_SUPPLIER_ADVANCE",
          advanceId: selectedAdvance.id,
          invoiceId: activeTab === "CUSTOMER" ? targetDocId : undefined,
          purchaseBillId: activeTab === "SUPPLIER" ? targetDocId : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Advance applied successfully!");
        setShowApplyModal(false);
        setSelectedAdvance(null);
        setTargetDocId("");
        fetchData();
      } else {
        alert(data.error || "Failed to apply advance");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPool = advances.reduce((sum, a) => sum + parseFloat(a.amount || "0"), 0);
  const remainingPool = advances.reduce((sum, a) => sum + parseFloat(a.remainingBalance || "0"), 0);
  const allocatedPool = advances.reduce((sum, a) => sum + parseFloat(a.allocatedAmount || "0"), 0);

  // Filter pending invoices/bills for the selected customer/supplier when applying
  const availableDocs = activeTab === "CUSTOMER"
    ? invoices.filter((i) => i.customerId === selectedAdvance?.customer?.id && parseFloat(i.balanceDue) > 0)
    : purchaseBills.filter((b) => b.supplierId === selectedAdvance?.supplier?.id && parseFloat(b.balanceDue) > 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
              Zoho Books Parity
            </span>
            <span className="text-xs text-slate-400 font-medium">1-Click Invoice & Bill Reconciliation</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            Advances & Retainer Invoices
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Record customer advance payments and vendor material advances, and apply them against final bills with 1-click double-entry posting.
          </p>
        </div>

        <button
          onClick={() => setShowRecordModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition active:scale-95"
        >
          <Plus size={16} />
          <span>{activeTab === "CUSTOMER" ? "+ Record Customer Advance" : "+ Record Supplier Advance"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("CUSTOMER")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "CUSTOMER"
              ? "border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <ArrowDownLeft size={16} />
          <span>Customer Project Advances (Liability)</span>
        </button>

        <button
          onClick={() => setActiveTab("SUPPLIER")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "SUPPLIER"
              ? "border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <ArrowUpRight size={16} />
          <span>Supplier Material Advances (Asset)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Advances Recorded</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
            ₹ {totalPool.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400">Total Capital Inward / Outward</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Applied against Invoices / Bills</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            ₹ {allocatedPool.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Reconciled into AR/AP</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Unapplied Advance Balance</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
            ₹ {remainingPool.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400">Available to Settle Future Invoices</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Advance #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">{activeTab === "CUSTOMER" ? "Customer" : "Supplier"}</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4 text-right">Advance Amount (₹)</th>
                <th className="py-3 px-4 text-right">Applied (₹)</th>
                <th className="py-3 px-4 text-right">Remaining (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading advances...
                  </td>
                </tr>
              ) : advances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No advances recorded yet. Use "+ Record Advance" to add one.
                  </td>
                </tr>
              ) : (
                advances.map((adv) => {
                  const hasRemaining = parseFloat(adv.remainingBalance) > 0;
                  return (
                    <tr key={adv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {adv.receiptNumber || adv.paymentNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(adv.date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {adv.customer?.name || adv.supplier?.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold">
                          {adv.paymentMode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹ {parseFloat(adv.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600">
                        ₹ {parseFloat(adv.allocatedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                        ₹ {parseFloat(adv.remainingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            adv.status === "FULLY_ADJUSTED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                          }`}
                        >
                          {adv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasRemaining ? (
                          <button
                            onClick={() => {
                              setSelectedAdvance(adv);
                              setShowApplyModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] shadow-sm transition active:scale-95"
                          >
                            <Sparkles size={12} />
                            <span>Apply to Bill</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Fully Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Advance Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wallet className="text-blue-600" />
                {activeTab === "CUSTOMER" ? "+ Record Customer Advance" : "+ Record Supplier Advance"}
              </h2>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordAdvance} className="space-y-3.5 text-xs">
              {activeTab === "CUSTOMER" ? (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Customer *
                  </label>
                  <select
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Supplier *
                  </label>
                  <select
                    value={form.supplierId}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Advance Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 100000"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={form.paymentMode}
                    onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="BANK">Bank (NEFT/RTGS/UPI)</option>
                    <option value="CASH">Cash in Hand</option>
                  </select>
                </div>

                {form.paymentMode === "BANK" && (
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Bank Account
                    </label>
                    <select
                      value={form.bankAccountId}
                      onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    >
                      <option value="">-- Default Bank --</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reference / UTR Number
                </label>
                <input
                  type="text"
                  value={form.referenceNumber}
                  onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                  placeholder="e.g. UTR-998822"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Recording..." : "Record Advance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Advance Modal */}
      {showApplyModal && selectedAdvance && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="text-blue-600" /> Apply Advance to Outstanding Bill
              </h2>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Party:</span>
                <span className="font-bold">{selectedAdvance.customer?.name || selectedAdvance.supplier?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Available Advance Balance:</span>
                <span className="font-mono font-bold text-emerald-600">
                  ₹ {parseFloat(selectedAdvance.remainingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <form onSubmit={handleApplyAdvance} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select {activeTab === "CUSTOMER" ? "Outstanding Tax Invoice *" : "Outstanding Purchase Bill *"}
                </label>
                {availableDocs.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
                    No outstanding invoices or bills found with an unpaid balance for this party.
                  </div>
                ) : (
                  <select
                    value={targetDocId}
                    onChange={(e) => setTargetDocId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="">-- Choose Document --</option>
                    {availableDocs.map((doc: any) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.invoiceNumber || doc.billNumber} (Due: ₹ {parseFloat(doc.balanceDue).toLocaleString("en-IN")})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || availableDocs.length === 0}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Applying..." : "1-Click Apply & Settle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
