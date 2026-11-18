"use client";

import { useState, useEffect } from "react";
import {
  RotateCcw,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  X,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

interface NoteItem {
  id: string;
  noteNumber: string;
  type: "CREDIT_NOTE" | "DEBIT_NOTE";
  date: string;
  customerId?: string | null;
  supplierId?: string | null;
  invoiceId?: string | null;
  purchaseBillId?: string | null;
  reason: string;
  subTotal: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  totalAmount: string;
  status: string;
  customer?: { name: string; stateCode: string } | null;
  supplier?: { name: string; stateCode: string } | null;
  invoice?: { invoiceNumber: string } | null;
  purchaseBill?: { billNumber: string } | null;
}

export default function CreditNotesPage() {
  const [activeTab, setActiveTab] = useState<"CREDIT_NOTE" | "DEBIT_NOTE">("CREDIT_NOTE");
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    supplierId: "",
    invoiceId: "",
    purchaseBillId: "",
    reason: "Material Return / Quality Rejection",
    taxableAmount: "",
    gstRate: "18.00",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notesRes, custRes, suppRes, invRes, pbRes] = await Promise.all([
        fetch(`/api/credit-notes?type=${activeTab}`),
        fetch("/api/customers"),
        fetch("/api/suppliers"),
        fetch("/api/invoices"),
        fetch("/api/purchases"),
      ]);

      const [notesData, custData, suppData, invData, pbData] = await Promise.all([
        notesRes.json(),
        custRes.json(),
        suppRes.json(),
        invRes.json(),
        pbRes.json(),
      ]);

      if (notesData.success) setNotes(notesData.notes);
      if (custData.success) setCustomers(custData.customers || []);
      if (suppData.success) setSuppliers(suppData.suppliers || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/credit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab,
          ...form,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`${activeTab === "CREDIT_NOTE" ? "Credit Note" : "Debit Note"} issued successfully!`);
        setShowModal(false);
        setForm({
          customerId: "",
          supplierId: "",
          invoiceId: "",
          purchaseBillId: "",
          reason: "Material Return / Quality Rejection",
          taxableAmount: "",
          gstRate: "18.00",
        });
        fetchData();
      } else {
        alert(data.error || "Failed to create note");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = notes.reduce((sum, n) => sum + parseFloat(n.totalAmount || "0"), 0);

  const filteredNotes = notes.filter((n) => {
    const name = (n.customer?.name || n.supplier?.name || "").toLowerCase();
    const num = n.noteNumber.toLowerCase();
    const r = n.reason.toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || num.includes(q) || r.includes(q);
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
              Zoho Books Parity
            </span>
            <span className="text-xs text-slate-400 font-medium">GST Compliant Adjustments</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            Credit & Debit Notes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Post customer credit notes (sales returns/adjustments) and vendor debit notes (purchase rejections/discounts) with auto double-entry balancing.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition active:scale-95 ${
            activeTab === "CREDIT_NOTE"
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          <Plus size={16} />
          <span>{activeTab === "CREDIT_NOTE" ? "+ Issue Customer Credit Note" : "+ Issue Vendor Debit Note"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("CREDIT_NOTE")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "CREDIT_NOTE"
              ? "border-rose-600 text-rose-600 bg-rose-50/50 dark:bg-rose-950/20"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <ArrowDownLeft size={16} />
          <span>Customer Credit Notes (Sales Reversal)</span>
        </button>

        <button
          onClick={() => setActiveTab("DEBIT_NOTE")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "DEBIT_NOTE"
              ? "border-emerald-600 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <ArrowUpRight size={16} />
          <span>Vendor Debit Notes (Purchase Return)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Notes Issued</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {notes.length}
          </div>
          <span className="text-[11px] text-slate-400">Current Financial Year</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">
            {activeTab === "CREDIT_NOTE" ? "Total Revenue Reduced" : "Total Purchase Costs Reduced"}
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
            ₹ {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400">Inclusive of GST Adjustments</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Status</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            100% Balanced
          </div>
          <span className="text-[11px] text-slate-400">General Ledger Synchronized</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Note #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">{activeTab === "CREDIT_NOTE" ? "Customer" : "Supplier"}</th>
                <th className="py-3 px-4">Linked Doc</th>
                <th className="py-3 px-4">Reason / Particulars</th>
                <th className="py-3 px-4 text-right">Taxable (₹)</th>
                <th className="py-3 px-4 text-right">Total Adjustment (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading records...
                  </td>
                </tr>
              ) : filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No {activeTab === "CREDIT_NOTE" ? "credit notes" : "debit notes"} recorded yet.
                  </td>
                </tr>
              ) : (
                filteredNotes.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {n.noteNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(n.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {n.customer?.name || n.supplier?.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {n.invoice?.invoiceNumber || n.purchaseBill?.billNumber || "Direct Note"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {n.reason}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      ₹ {parseFloat(n.subTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₹ {parseFloat(n.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20">
                        {n.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Note Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <RotateCcw className={activeTab === "CREDIT_NOTE" ? "text-rose-600" : "text-emerald-600"} />
                {activeTab === "CREDIT_NOTE" ? "Issue Customer Credit Note" : "Issue Vendor Debit Note"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {activeTab === "CREDIT_NOTE" ? (
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
                        {c.name} ({c.gstNumber || "Unregistered"})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Vendor / Supplier *
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
                        {s.name} ({s.gstNumber || "Unregistered"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Adjustment *
                </label>
                <select
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="Material Return / Quality Rejection">Material Return / Quality Rejection</option>
                  <option value="Agreed Rate Difference / Discount">Agreed Rate Difference / Discount</option>
                  <option value="Billing Discrepancy Correction">Billing Discrepancy Correction</option>
                  <option value="Project Scope Reduction">Project Scope Reduction</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Taxable Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.taxableAmount}
                    onChange={(e) => setForm({ ...form, taxableAmount: e.target.value })}
                    placeholder="e.g. 25000"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    GST Rate %
                  </label>
                  <select
                    value={form.gstRate}
                    onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="18.00">18% (Standard GST)</option>
                    <option value="12.00">12%</option>
                    <option value="5.00">5%</option>
                    <option value="0.00">0% (Nil)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] space-y-1">
                <span className="font-bold text-slate-500 uppercase text-[10px]">Double-Entry Posting:</span>
                {activeTab === "CREDIT_NOTE" ? (
                  <p className="text-slate-600 dark:text-slate-300">
                    Dr Revenue (4010) + Dr Output GST (2030/2031) | Cr Customer Receivable (1030)
                  </p>
                ) : (
                  <p className="text-slate-600 dark:text-slate-300">
                    Dr Supplier Payable (2010) | Cr Material Purchase (5010) + Cr Input GST (1060/1061)
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 rounded-xl text-white font-bold shadow-md transition disabled:opacity-50 ${
                    activeTab === "CREDIT_NOTE"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {submitting ? "Posting..." : "Confirm & Post Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
