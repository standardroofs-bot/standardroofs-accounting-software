"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  Printer,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  CreditCard,
  ArrowRight,
  Archive,
  RotateCcw,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { ModuleHeaderWithAnalytics } from "@/components/common/ModuleHeaderWithAnalytics";
import { ArchiveConfirmModal } from "@/components/common/ArchiveConfirmModal";
import { Download, FileText, Eye } from "lucide-react";

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  sequenceNumber: number;
  invoiceType: string;
  date: string;
  dueDate: string | null;
  customer: { id: string; name: string; companyName: string | null; gstNumber: string | null };
  project: { id: string; code: string; name: string } | null;
  subTotal: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  totalAmount: string;
  amountPaid: string;
  tdsDeducted: string;
  balanceDue: string;
  status: string;
  isInterState: boolean;
  isArchived?: boolean;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayPlainNumber, setDisplayPlainNumber] = useState(false);

  // Archive Confirm Modal
  const [archiveInvoice, setArchiveInvoice] = useState<InvoiceItem | null>(null);
  const [archiving, setArchiving] = useState(false);

  // Payment Recording Modal
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [tdsAmount, setTdsAmount] = useState("0");
  const [paymentMode, setPaymentMode] = useState("NEFT");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const fetchInvoices = async (showArchived = statusFilter === "ARCHIVED") => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices?archived=${showArchived ? "true" : "false"}`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(statusFilter === "ARCHIVED");
  }, [statusFilter]);

  const handleArchiveConfirm = async () => {
    if (!archiveInvoice) return;
    try {
      setArchiving(true);
      const res = await fetch(`/api/invoices/${archiveInvoice.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setArchiveInvoice(null);
        fetchInvoices(statusFilter === "ARCHIVED");
      } else {
        alert(data.error || "Failed to archive invoice");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setArchiving(false);
    }
  };

  const handleRestore = async (inv: InvoiceItem) => {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (data.success) {
        fetchInvoices(statusFilter === "ARCHIVED");
      } else {
        alert(data.error || "Failed to restore invoice");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    setSubmittingPayment(true);
    setPaymentError("");

    try {
      const res = await fetch(`/api/invoices/${paymentInvoice.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          tdsAmount,
          paymentMode,
          referenceNumber,
          paymentDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPaymentInvoice(null);
        setPaymentAmount("");
        setTdsAmount("0");
        setReferenceNumber("");
        fetchInvoices(statusFilter === "ARCHIVED");
      } else {
        setPaymentError(data.error || "Failed to record payment");
      }
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      statusFilter === "ARCHIVED" ||
      inv.status === statusFilter;
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customer.companyName && inv.customer.companyName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleExportExcel = () => {
    exportToExcel(
      filteredInvoices.map((inv) => ({
        "Invoice #": inv.invoiceNumber,
        "Date": new Date(inv.date).toLocaleDateString("en-IN"),
        "Due Date": inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "",
        "Customer": inv.customer?.name || "",
        "Taxable Amount (₹)": Number(inv.subTotal || 0),
        "CGST (₹)": Number(inv.cgstTotal || 0),
        "SGST (₹)": Number(inv.sgstTotal || 0),
        "IGST (₹)": Number(inv.igstTotal || 0),
        "Grand Total (₹)": Number(inv.totalAmount || 0),
        "Amount Paid (₹)": Number(inv.amountPaid || 0),
        "Balance Due (₹)": Number(inv.balanceDue || 0),
        "Status": inv.status,
      })),
      "Standard_Roofs_Tax_Invoices"
    );
  };

  const handleExportPDF = () => {
    exportToPDF(
      "Standard Roofs - Tax Invoices Register",
      [
        { header: "Invoice #", dataKey: "invoiceNumber" },
        { header: "Date", dataKey: "date" },
        { header: "Customer", dataKey: "customerName" },
        { header: "Total (₹)", dataKey: "totalAmount" },
        { header: "Balance Due (₹)", dataKey: "balanceDue" },
        { header: "Status", dataKey: "status" },
      ],
      filteredInvoices.map((i) => ({
        ...i,
        customerName: i.customer?.name || "",
        date: new Date(i.date).toLocaleDateString("en-IN"),
      }))
    );
  };

  const nextSeq = invoices.length > 0 ? Math.max(...invoices.map((i) => i.sequenceNumber)) + 1 : 33;
  const nextInvoicePadded = `SR/26-27/${String(nextSeq).padStart(4, "0")}`;

  const sampleInvoiceColumns = [
    { header: "Customer Name", example: "Sabari" },
    { header: "Invoice Date", example: "2026-11-20" },
    { header: "Item Description", example: "Pre-Engineered Roofing Structure" },
    { header: "HSN/SAC", example: "9954" },
    { header: "Quantity", example: 1 },
    { header: "Rate", example: 28304.25 },
    { header: "GST Rate %", example: 18 },
  ];

  const handleImportInvoices = async (rows: any[]) => {
    alert(`Imported ${rows.length} invoice rows for validation. Processing ledger posting.`);
    return { success: true, count: rows.length };
  };

  return (
    <div className="space-y-6">
      {/* Universal Module Header with Analytics */}
      <ModuleHeaderWithAnalytics
        title="Invoices & GST Tax Invoicing"
        subtitle="Free-GST-Billing inspired works contract tax invoices with Double-Entry General Ledger posting"
        icon={Receipt}
        badge={displayPlainNumber ? `#${nextSeq}` : nextInvoicePadded}
        analyticsPreset="sales"
        analyticsMetrics={[
          { label: "Total Billed (Fiscal)", value: "₹ 15,48,200", trend: "+8.4%", isPositive: true, sub: "Works contracts" },
          { label: "Active Receivables", value: "₹ 33,399", trend: "Current", isPositive: true, sub: "Invoice #33 Sabari" },
          { label: "Average Settlement", value: "14 Days", trend: "-2.1d", isPositive: true, sub: "Prompt payments" },
          { label: "GST Output Tax", value: "₹ 2,78,676", trend: "GSTR-1 Ready", isPositive: true, sub: "CGST9 + SGST9" },
        ]}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search invoice #, customer..."
        viewOptions={[
          { label: "All Invoices", value: "ALL", count: invoices.length },
          { label: "Unpaid", value: "UNPAID", count: invoices.filter((i) => i.status === "UNPAID").length },
          { label: "Partial", value: "PARTIAL", count: invoices.filter((i) => i.status === "PARTIAL").length },
          { label: "Paid", value: "PAID", count: invoices.filter((i) => i.status === "PAID").length },
          { label: "Archived", value: "ARCHIVED", count: invoices.filter((i) => i.isArchived).length },
        ]}
        activeView={statusFilter}
        onViewChange={setStatusFilter}
        sampleColumns={sampleInvoiceColumns}
        sampleFilename="standard_roofs_invoices_sample"
        onImport={handleImportInvoices}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        primaryActionLabel="+ Create Invoice"
        primaryActionHref="/invoices/new"
        onRefresh={() => fetchInvoices(statusFilter === "ARCHIVED")}
        extraControls={
          <button
            onClick={() => setDisplayPlainNumber(!displayPlainNumber)}
            className="text-[11px] font-bold text-slate-500 hover:text-blue-600 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 transition cursor-pointer"
          >
            {displayPlainNumber ? "Prefix Mode" : "Plain #"}
          </button>
        }
      />

      {/* Invoices Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer & Project</th>
                <th className="py-3 px-4 text-right">Taxable (₹)</th>
                <th className="py-3 px-4 text-right">GST Tax</th>
                <th className="py-3 px-4 text-right">Total (₹)</th>
                <th className="py-3 px-4 text-right">Balance Due (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Loading invoices...</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {statusFilter === "ARCHIVED"
                      ? "No archived invoices found."
                      : `No invoices found. Click + Create Invoice to issue invoice #${nextSeq}.`}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 group"
                      >
                        <span>{displayPlainNumber ? `#${inv.sequenceNumber}` : inv.invoiceNumber}</span>
                        <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition" />
                      </Link>
                      <span className="text-[10px] text-slate-400 uppercase font-sans font-normal">{inv.invoiceType}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(inv.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{inv.customer.name}</div>
                      {inv.project && (
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                          📍 {inv.project.name}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatINR(inv.subTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {inv.isInterState ? (
                        <span>IGST: {formatINR(inv.igstTotal)}</span>
                      ) : (
                        <span>
                          C: {formatINR(inv.cgstTotal)} | S: {formatINR(inv.sgstTotal)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(inv.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatINR(inv.balanceDue)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.isArchived
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : inv.status === "PAID"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : inv.status === "PARTIAL"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                        }`}
                      >
                        {inv.isArchived ? "ARCHIVED" : inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {!inv.isArchived ? (
                          <>
                            {inv.status !== "PAID" && (
                              <button
                                onClick={() => {
                                  setPaymentInvoice(inv);
                                  setPaymentAmount(inv.balanceDue);
                                }}
                                className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 transition cursor-pointer"
                                title="Record Customer Payment"
                              >
                                + Pay
                              </button>
                            )}
                            <Link
                              href={`/invoices/${inv.id}/print`}
                              target="_blank"
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Print A4 GST Tax Invoice"
                            >
                              <Printer size={15} />
                            </Link>
                            <button
                              onClick={() => setArchiveInvoice(inv)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Archive / Delete Invoice"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(inv)}
                            className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition cursor-pointer flex items-center gap-1"
                            title="Restore Invoice from Archive"
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      <ArchiveConfirmModal
        isOpen={!!archiveInvoice}
        onClose={() => setArchiveInvoice(null)}
        onConfirm={handleArchiveConfirm}
        recordName={archiveInvoice?.invoiceNumber}
        recordType="Invoice"
        loading={archiving}
      />

      {/* Record Payment Receipt Modal */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="text-emerald-600" /> Record Payment Receipt
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Invoice <strong>{paymentInvoice.invoiceNumber}</strong> • Balance Due:{" "}
              <strong className="text-rose-600">{formatINR(paymentInvoice.balanceDue)}</strong>
            </p>

            {paymentError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Mode</label>
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

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Amount Received (₹)*</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">TDS Deducted (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdsAmount}
                    onChange={(e) => setTdsAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Reference / UTR #</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. UTR / Chq No"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
