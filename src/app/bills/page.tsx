"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Building,
  Calendar,
  AlertCircle,
  CreditCard,
  Printer,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Package,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/decimal";

interface PurchaseBill {
  id: string;
  billNumber: string;
  vendorInvoiceNumber: string | null;
  date: string;
  dueDate: string | null;
  supplier: { id: string; name: string; companyName: string | null; state: string; stateCode: string };
  project: { id: string; code: string; name: string } | null;
  subTotal: number | string;
  cgstTotal: number | string;
  sgstTotal: number | string;
  igstTotal: number | string;
  totalAmount: number | string;
  amountPaid: number | string;
  balanceDue: number | string;
  status: string;
  items: Array<{
    id: string;
    description: string;
    hsnSacCode: string;
    quantity: number | string;
    unit: string;
    unitPrice: number | string;
    taxableAmount: number | string;
    totalAmount: number | string;
  }>;
  payments: Array<any>;
}

export default function BillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Record Bill Modal State
  const [showBillModal, setShowBillModal] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [destination, setDestination] = useState<"INVENTORY" | "PROJECT">("INVENTORY");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<any[]>([
    {
      description: "Galvalume Roofing Sheets (0.50mm AZ150 Blue)",
      hsnSacCode: "7210",
      quantity: 1200,
      unit: "SQFT",
      unitPrice: 52,
      gstRate: 18,
    },
  ]);
  const [submittingBill, setSubmittingBill] = useState(false);
  const [billError, setBillError] = useState("");

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillForPay, setSelectedBillForPay] = useState<PurchaseBill | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [tdsSection, setTdsSection] = useState("194C");
  const [tdsRate, setTdsRate] = useState("1");
  const [tdsAmount, setTdsAmount] = useState("0");
  const [paymentMode, setPaymentMode] = useState("NEFT");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [bRes, sRes, pRes, bankRes] = await Promise.all([
        fetch(`/api/bills?status=${filterStatus}`),
        fetch("/api/vendors"),
        fetch("/api/projects"),
        fetch("/api/bank-accounts"),
      ]);
      const bData = await bRes.json();
      const sData = await sRes.json();
      const pData = await pRes.json();
      const bankData = await bankRes.json();

      if (bData.success) setBills(bData.bills);
      if (sData.success) {
        setSuppliers(sData.vendors);
        if (sData.vendors.length > 0 && !supplierId) setSupplierId(sData.vendors[0].id);
      }
      if (pData.success) setProjects(pData.projects);
      if (bankData.success) {
        setBankAccounts(bankData.bankAccounts);
        const icici = bankData.bankAccounts.find((b: any) =>
          b.accountNumber.includes("3161") || b.isPrimary
        );
        if (icici) setBankAccountId(icici.id);
        else if (bankData.bankAccounts.length > 0) setBankAccountId(bankData.bankAccounts[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        description: "",
        hsnSacCode: "7210",
        quantity: 1,
        unit: "SQFT",
        unitPrice: 100,
        gstRate: 18,
      },
    ]);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lines];
    updated[idx][field] = value;
    setLines(updated);
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setBillError("Please select a vendor.");
      return;
    }
    setSubmittingBill(true);
    setBillError("");

    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          projectId: projectId || null,
          vendorInvoiceNumber,
          date,
          dueDate: dueDate || null,
          destination,
          notes,
          items: lines,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowBillModal(false);
        loadData();
      } else {
        setBillError(data.error || "Failed to create Bill");
      }
    } catch (err: any) {
      setBillError(err.message || "Failed to record bill");
    } finally {
      setSubmittingBill(false);
    }
  };

  const openPaymentModal = (bill: PurchaseBill) => {
    setSelectedBillForPay(bill);
    setPaymentAmount(String(bill.balanceDue));
    setTdsAmount("0");
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPay) return;

    setSubmittingPayment(true);
    setPaymentError("");

    try {
      const res = await fetch("/api/payments-made", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseBillId: selectedBillForPay.id,
          amount: paymentAmount,
          tdsSection: Number(tdsAmount) > 0 ? tdsSection : null,
          tdsRate: Number(tdsAmount) > 0 ? Number(tdsRate) : null,
          tdsAmount: tdsAmount || "0",
          paymentMode,
          bankAccountId: paymentMode === "CASH" ? null : bankAccountId || null,
          referenceNumber: paymentRef,
          paymentDate,
          notes: `Payment for Bill ${selectedBillForPay.billNumber}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPaymentModal(false);
        loadData();
      } else {
        setPaymentError(data.error || "Payment recording failed.");
      }
    } catch (err: any) {
      setPaymentError(err.message || "Failed to record payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const calcSubTotal = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  );
  const calcGst = lines.reduce(
    (sum, l) =>
      sum +
      (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * ((Number(l.gstRate) || 0) / 100),
    0
  );
  const calcTotal = calcSubTotal + calcGst;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="text-blue-600" /> Vendor Purchase Bills
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record supplier GST invoices, auto-post Input Tax Credit (CGST/SGST/IGST), stock movements & vendor payables
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/purchase-orders"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition"
          >
            Purchase Orders
          </Link>
          <Link
            href="/payments-made"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition"
          >
            Payments Made
          </Link>
          <button
            onClick={() => setShowBillModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Plus size={15} /> + Record New Bill
          </button>
        </div>
      </div>

      {/* Bills Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
            All Bills ({bills.length})
          </span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 border rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          >
            <option value="ALL">All Bills</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="PAID">Paid</option>
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading bills...</div>
        ) : bills.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <p>No vendor purchase bills recorded yet.</p>
            <button
              onClick={() => setShowBillModal(true)}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              + Record your first Vendor Bill
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-3">Bill Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Vendor Invoice #</th>
                  <th className="py-2.5 px-3">Destination Site</th>
                  <th className="py-2.5 px-3 text-right">Bill Total (₹)</th>
                  <th className="py-2.5 px-3 text-right">Balance Due (₹)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {b.billNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {new Date(b.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {b.supplier.name}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {b.vendorInvoiceNumber || "-"}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {b.project ? `${b.project.code} - ${b.project.name}` : "Main Yard Inventory"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(b.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-amber-600 dark:text-amber-400">
                      {formatINR(b.balanceDue)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          b.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : b.status === "PARTIAL"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {Number(b.balanceDue) > 0 ? (
                        <button
                          onClick={() => openPaymentModal(b)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <CreditCard size={12} /> Pay Bill
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold text-[11px]">Paid in Full</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Bill Modal */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="text-blue-600" /> Record Supplier Purchase Bill
              </h3>
              <button
                onClick={() => setShowBillModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {billError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-lg">
                {billError}
              </div>
            )}

            <form onSubmit={handleCreateBill} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Vendor *
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.companyName ? `(${s.companyName})` : ""} - {s.state} ({s.stateCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Vendor Tax Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={vendorInvoiceNumber}
                    onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2026-9921"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Bill Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Bill Allocation Destination
                  </label>
                  <select
                    value={destination}
                    onChange={(e: any) => setDestination(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="INVENTORY">Stock-In / Inventory (Yard)</option>
                    <option value="PROJECT">Direct Project Site Cost</option>
                  </select>
                </div>
              </div>

              {destination === "PROJECT" && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Project Site
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select Project Site</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Line Items */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden p-3 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                    Purchase Bill Items
                  </span>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Item description"
                          value={line.description}
                          onChange={(e) => updateLine(idx, "description", e.target.value)}
                          className="w-full px-2 py-1.5 border rounded text-xs bg-slate-50 dark:bg-slate-800"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Qty"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                          className="w-full px-2 py-1.5 border rounded text-xs font-mono text-right bg-slate-50 dark:bg-slate-800"
                          required
                        />
                      </div>
                      <div className="col-span-1">
                        <select
                          value={line.unit}
                          onChange={(e) => updateLine(idx, "unit", e.target.value)}
                          className="w-full px-1 py-1.5 border rounded text-xs bg-slate-50 dark:bg-slate-800"
                        >
                          <option value="SQFT">SQFT</option>
                          <option value="TON">TON</option>
                          <option value="KG">KG</option>
                          <option value="NOS">NOS</option>
                          <option value="BOX">BOX</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate ₹"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(idx, "unitPrice", e.target.value)}
                          className="w-full px-2 py-1.5 border rounded text-xs font-mono text-right bg-slate-50 dark:bg-slate-800"
                          required
                        />
                      </div>
                      <div className="col-span-1">
                        <select
                          value={line.gstRate}
                          onChange={(e) => updateLine(idx, "gstRate", e.target.value)}
                          className="w-full px-1 py-1.5 border rounded text-xs bg-slate-50 dark:bg-slate-800"
                        >
                          <option value="18">18%</option>
                          <option value="12">12%</option>
                          <option value="28">28%</option>
                          <option value="5">5%</option>
                          <option value="0">0%</option>
                        </select>
                      </div>
                      <div className="col-span-1 text-center">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end font-mono text-xs space-y-1">
                  <div className="w-64 space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span>{formatINR(calcSubTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>GST:</span>
                      <span>{formatINR(calcGst)}</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-900 dark:text-slate-100 border-t border-slate-300 dark:border-slate-700 pt-1">
                      <span>Grand Total:</span>
                      <span>{formatINR(calcTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBill}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingBill ? "Posting Bill..." : "Post Vendor Bill & Input GST"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Bill Modal */}
      {showPaymentModal && selectedBillForPay && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="text-emerald-600" /> Record Vendor Payout
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {paymentError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-lg">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Paying Vendor Bill</span>
                  <strong>{selectedBillForPay.billNumber} ({selectedBillForPay.supplier.name})</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">Balance Due</span>
                  <strong className="text-amber-600 text-sm">{formatINR(selectedBillForPay.balanceDue)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="NEFT">NEFT / RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              {paymentMode !== "CASH" && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Paid Through Bank Account
                  </label>
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    required
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber} ({b.accountName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Net Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    TDS Section & Deduction
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={tdsSection}
                      onChange={(e) => setTdsSection(e.target.value)}
                      className="w-24 px-2 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      <option value="194C">194C</option>
                      <option value="194Q">194Q</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="TDS ₹"
                      value={tdsAmount}
                      onChange={(e) => setTdsAmount(e.target.value)}
                      className="w-full px-2 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Bank Reference Number / UTR
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UTR123456789"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? "Posting..." : "Post Payment Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
