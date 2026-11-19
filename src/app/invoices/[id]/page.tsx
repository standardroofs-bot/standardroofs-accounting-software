"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  ArrowLeft,
  Printer,
  CreditCard,
  Ban,
  Copy,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { formatINR, numberToWordsINR } from "@/lib/decimal";

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  sequenceNumber: number;
  invoiceType: string;
  date: string;
  dueDate: string | null;
  customerId: string;
  projectId: string | null;
  financialYearId: string;
  placeOfSupply: string;
  placeOfSupplyStateCode: string;
  isInterState: boolean;
  subTotal: number | string;
  cgstTotal: number | string;
  sgstTotal: number | string;
  igstTotal: number | string;
  adjustment?: number | string;
  totalAmount: number | string;
  paidAmount: number | string;
  balanceDue: number | string;
  status: string;
  notes: string | null;
  terms: string | null;
  shippingAddress?: string | null;
  customer: {
    id: string;
    name: string;
    companyName: string | null;
    gstNumber: string | null;
    panNumber: string | null;
    state: string;
    stateCode: string;
    billingAddress: string;
    shippingAddress: string | null;
    phone: string | null;
    email: string | null;
  };
  project?: {
    id: string;
    code: string;
    name: string;
    siteLocation: string;
    city: string;
    state: string;
    roofType: string;
  } | null;
  items: Array<{
    id: string;
    description: string;
    subDescription?: string | null;
    hsnSacCode: string;
    quantity: number | string;
    unit: string;
    unitPrice: number | string;
    discount: number | string;
    taxableAmount: number | string;
    gstRate: number | string;
    cgstAmount: number | string;
    sgstAmount: number | string;
    igstAmount: number | string;
    totalAmount: number | string;
  }>;
  payments: Array<{
    id: string;
    paymentNumber: string;
    paymentDate: string;
    amount: number | string;
    tdsAmount: number | string;
    paymentMode: string;
    referenceNumber: string | null;
    notes: string | null;
  }>;
  journalEntry?: {
    id: string;
    entryNumber: string;
    date: string;
    lines: Array<{
      id: string;
      account: { code: string; name: string };
      debit: number | string;
      credit: number | string;
    }>;
  } | null;
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [tdsAmount, setTdsAmount] = useState("0");
  const [paymentMode, setPaymentMode] = useState("NEFT");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/${id}`);
      const data = await res.json();
      if (data.success) {
        setInvoice(data.invoice);
        setPaymentAmount(String(data.invoice.balanceDue || 0));
      } else {
        setError(data.error || "Failed to load invoice");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

  useEffect(() => {
    async function loadBanks() {
      try {
        const res = await fetch("/api/bank-accounts");
        const data = await res.json();
        if (data.success && data.bankAccounts) {
          setBankAccounts(data.bankAccounts);
          const icici = data.bankAccounts.find((b: any) =>
            b.accountNumber.includes("3161") || b.isPrimary
          );
          if (icici) setBankAccountId(icici.id);
          else if (data.bankAccounts.length > 0) setBankAccountId(data.bankAccounts[0].id);
        }
      } catch (e) {
        console.error("Failed to load bank accounts", e);
      }
    }
    loadBanks();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setPaymentError("Please enter a valid payment amount.");
      return;
    }

    setSubmittingPayment(true);
    setPaymentError("");

    try {
      const res = await fetch(`/api/invoices/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          tdsAmount: tdsAmount || "0",
          paymentMode,
          bankAccountId: paymentMode === "CASH" ? null : bankAccountId || null,
          referenceNumber: paymentRef,
          paymentDate,
          notes: `Payment for Invoice ${invoice?.invoiceNumber}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowPaymentModal(false);
        loadInvoice();
      } else {
        setPaymentError(data.error || "Payment recording failed.");
      }
    } catch (err: any) {
      setPaymentError(err.message || "Failed to record payment.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleVoidInvoice = async () => {
    if (!confirm(`Are you sure you want to VOID invoice ${invoice?.invoiceNumber}? This action marks the balance due as zero and voids the tax bill.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "VOID" }),
      });
      const data = await res.json();
      if (data.success) {
        loadInvoice();
      } else {
        alert(data.error || "Failed to void invoice");
      }
    } catch (err: any) {
      alert(err.message || "Failed to void invoice");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle size={48} className="mx-auto text-red-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          {error || "Invoice Not Found"}
        </h2>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Back to Invoices
        </Link>
      </div>
    );
  }

  const isPaid = Number(invoice.balanceDue) <= 0;
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && !isPaid;

  const statusColor =
    invoice.status === "VOID"
      ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      : isPaid
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
      : isOverdue
      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300"
      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {invoice.invoiceNumber}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${statusColor}`}>
                {invoice.status === "VOID" ? "VOID" : isPaid ? "PAID" : isOverdue ? "OVERDUE" : invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sequence #{invoice.sequenceNumber} • Created on {new Date(invoice.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/invoices/${invoice.id}/print`}
            target="_blank"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition active:scale-95"
          >
            <Printer size={15} /> Print / PDF
          </Link>

          {!isPaid && invoice.status !== "VOID" && (
            <button
              onClick={() => {
                setPaymentAmount(String(invoice.balanceDue));
                setShowPaymentModal(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <CreditCard size={15} /> Record Payment
            </button>
          )}

          <Link
            href="/advances"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition"
          >
            <DollarSign size={15} /> Apply Advance
          </Link>

          <Link
            href={`/invoices/new?cloneFrom=${invoice.id}`}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition"
            title="Clone Invoice"
          >
            <Copy size={15} /> Clone
          </Link>

          {invoice.status !== "VOID" && (
            <button
              onClick={handleVoidInvoice}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold border border-red-200 dark:border-red-900 flex items-center gap-1.5 transition cursor-pointer"
              title="Void Invoice"
            >
              <Ban size={15} /> Void
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Invoice Total Amount
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {formatINR(invoice.totalAmount)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Includes GST {formatINR(Number(invoice.cgstTotal) + Number(invoice.sgstTotal) + Number(invoice.igstTotal))}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Payment Received
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(invoice.paidAmount)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {invoice.payments?.length || 0} payment receipt(s) recorded
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Balance Due
          </span>
          <div className={`text-2xl font-black mt-1 ${Number(invoice.balanceDue) > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}>
            {formatINR(invoice.balanceDue)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {invoice.dueDate ? `Due on ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}` : "No due date specified"}
          </p>
        </div>
      </div>

      {/* Zoho Split View: Customer & Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Information */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-2">
              <Building size={14} className="text-blue-600" /> Customer Information
            </span>
            <Link
              href={`/customers`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              View Customers <ChevronRight size={12} />
            </Link>
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {invoice.customer.name}
            </div>
            {invoice.customer.companyName && (
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {invoice.customer.companyName}
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-line leading-relaxed">
              {invoice.customer.billingAddress || invoice.customer.shippingAddress || "Erode, Tamil Nadu"}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300">
                GSTIN: {invoice.customer.gstNumber || "Unregistered"}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300">
                Place of Supply: {invoice.placeOfSupply} ({invoice.placeOfSupplyStateCode})
              </span>
              {invoice.isInterState ? (
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded font-bold">
                  Inter-State (IGST)
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-bold">
                  Intra-State TN (CGST + SGST)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Project & Job Site */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-2">
              <FileText size={14} className="text-blue-600" /> Roofing Project / Site
            </span>
            {invoice.project && (
              <Link
                href={`/projects/${invoice.project.id}`}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
              >
                Project Hub <ExternalLink size={12} />
              </Link>
            )}
          </div>
          {invoice.project ? (
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {invoice.project.code} — {invoice.project.name}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {invoice.project.siteLocation}, {invoice.project.city}, {invoice.project.state}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-md text-xs font-bold border border-amber-200 dark:border-amber-900">
                  Roofing Type: {invoice.project.roofType}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3">
              Direct Sales Invoice (No linked project site).
            </div>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
            Line Items ({invoice.items?.length || 0})
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Place of Supply: {invoice.placeOfSupply}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Description of Goods / Roofing Contract</th>
                <th className="py-2.5 px-3 text-center">HSN/SAC</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-center">Unit</th>
                <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-3 text-center">GST %</th>
                <th className="py-2.5 px-3 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoice.items?.map((it, idx) => (
                <tr key={it.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    <div>{it.description}</div>
                    {it.subDescription && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                        {it.subDescription}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">{it.hsnSacCode}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium">{Number(it.quantity).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">{it.unit}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{Number(it.unitPrice).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">{formatINR(it.taxableAmount)}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{Number(it.gstRate).toFixed(0)}%</td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                    {formatINR(it.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary Block */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="text-xs text-slate-600 dark:text-slate-400 max-w-lg">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">Amount in Words:</span>
            <span className="italic">{numberToWordsINR(invoice.totalAmount)}</span>
          </div>

          <div className="w-full md:w-80 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal (Taxable):</span>
              <span className="font-bold">{formatINR(invoice.subTotal)}</span>
            </div>
            {invoice.isInterState ? (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>IGST (18%):</span>
                <span className="font-bold">{formatINR(invoice.igstTotal)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>CGST (9%):</span>
                  <span className="font-bold">{formatINR(invoice.cgstTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>SGST (9%):</span>
                  <span className="font-bold">{formatINR(invoice.sgstTotal)}</span>
                </div>
              </>
            )}
            {Number(invoice.adjustment || 0) !== 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Adjustment (+/-):</span>
                <span className="font-bold">
                  {Number(invoice.adjustment) < 0
                    ? `(-) ${formatINR(Math.abs(Number(invoice.adjustment)))}`
                    : `(+) ${formatINR(Number(invoice.adjustment))}`}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-300 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-slate-100">
              <span>Grand Total:</span>
              <span>{formatINR(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Receipts History */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-2">
            <CreditCard size={15} className="text-emerald-600" /> Payment Receipts ({invoice.payments?.length || 0})
          </span>
          {!isPaid && invoice.status !== "VOID" && (
            <button
              onClick={() => {
                setPaymentAmount(String(invoice.balanceDue));
                setShowPaymentModal(true);
              }}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              + Record New Payment
            </button>
          )}
        </div>
        {invoice.payments && invoice.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-3">Receipt #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Reference No</th>
                  <th className="py-2.5 px-3 text-right">TDS Deducted (₹)</th>
                  <th className="py-2.5 px-3 text-right">Amount Received (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoice.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {p.paymentNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {new Date(p.paymentDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{p.paymentMode}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{p.referenceNumber || "-"}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">{formatINR(p.tdsAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {formatINR(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-500">
            No payments recorded yet for this invoice.
          </div>
        )}
      </div>

      {/* Accounting Audit Trail (Double-Entry Ledger) */}
      {invoice.journalEntry && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-2">
              <ShieldCheck size={15} className="text-blue-600" /> Double-Entry General Ledger Voucher ({invoice.journalEntry.entryNumber})
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Auto-posted to Balance Sheet & P&L
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-1.5 px-2">Account Code</th>
                  <th className="py-1.5 px-2">Account Name</th>
                  <th className="py-1.5 px-2 text-right">Debit (Dr) ₹</th>
                  <th className="py-1.5 px-2 text-right">Credit (Cr) ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoice.journalEntry.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5 px-2 text-blue-600 font-bold">{l.account.code}</td>
                    <td className="py-1.5 px-2 font-sans font-medium">{l.account.name}</td>
                    <td className="py-1.5 px-2 text-right font-bold">
                      {Number(l.debit) > 0 ? formatINR(l.debit) : "-"}
                    </td>
                    <td className="py-1.5 px-2 text-right font-bold text-slate-700 dark:text-slate-300">
                      {Number(l.credit) > 0 ? formatINR(l.credit) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="text-emerald-600" /> Record Customer Payment
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
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
                    Deposit To Bank Account
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
                    Amount Received (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Balance Due: {formatINR(invoice.balanceDue)}
                  </span>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    TDS Deducted (Sec 194C)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdsAmount}
                    onChange={(e) => setTdsAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                  <div className="flex gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setTdsAmount((Number(paymentAmount) * 0.01).toFixed(2))}
                      className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded hover:bg-slate-300"
                    >
                      1% Ind/HUF
                    </button>
                    <button
                      type="button"
                      onClick={() => setTdsAmount((Number(paymentAmount) * 0.02).toFixed(2))}
                      className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded hover:bg-slate-300"
                    >
                      2% Company
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reference No / UTR / Cheque No
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. ICICR20261119001234"
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
                  {submittingPayment ? "Recording..." : "Post Payment Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
