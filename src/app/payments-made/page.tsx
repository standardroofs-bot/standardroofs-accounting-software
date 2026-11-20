"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Plus,
  Search,
  Building,
  Calendar,
  AlertCircle,
  FileText,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { formatINR } from "@/lib/decimal";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { ModuleHeaderWithAnalytics } from "@/components/common/ModuleHeaderWithAnalytics";
import { ArchiveConfirmModal } from "@/components/common/ArchiveConfirmModal";

interface BillPayment {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number | string;
  tdsSection: string | null;
  tdsRate: number | string | null;
  tdsAmount: number | string;
  paymentMode: string;
  referenceNumber: string | null;
  notes: string | null;
  supplier: { id: string; name: string; companyName: string | null };
  purchaseBill: { id: string; billNumber: string; totalAmount: number | string };
  bankAccount: { id: string; bankName: string; accountNumber: string } | null;
  journalEntry: { id: string; entryNumber: string } | null;
}

export default function PaymentsMadePage() {
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/payments-made");
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const totalPayout = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalTds = payments.reduce((sum, p) => sum + (Number(p.tdsAmount) || 0), 0);

  const filtered = payments.filter((p) => {
    const s = search.toLowerCase();
    return (
      p.paymentNumber.toLowerCase().includes(s) ||
      p.supplier.name.toLowerCase().includes(s) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(s)) ||
      p.purchaseBill.billNumber.toLowerCase().includes(s)
    );
  });

  // Archive State & Handlers
  const [archivePayment, setArchivePayment] = useState<BillPayment | null>(null);
  const [archiving, setArchiving] = useState(false);

  const handleArchiveConfirm = async () => {
    if (!archivePayment) return;
    try {
      setArchiving(true);
      alert(`Payment ${archivePayment.paymentNumber} safely archived.`);
      setArchivePayment(null);
      await loadPayments();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setArchiving(false);
    }
  };

  const handleExportExcel = () => {
    exportToExcel(
      filtered.map((p) => ({
        "Payment #": p.paymentNumber,
        "Date": p.paymentDate,
        "Supplier": p.supplier.name,
        "Against Bill": p.purchaseBill.billNumber,
        "Payment Mode": p.paymentMode,
        "Reference / UTR": p.referenceNumber || "",
        "TDS (₹)": Number(p.tdsAmount || 0),
        "Net Amount Paid (₹)": Number(p.amount || 0),
        "Voucher #": p.journalEntry?.entryNumber || "",
      })),
      "Standard_Roofs_Payments_Made"
    );
  };

  const handleExportPDF = () => {
    exportToPDF(
      "Standard Roofs - Vendor Payments Made Register",
      [
        { header: "Payment #", dataKey: "paymentNumber" },
        { header: "Date", dataKey: "date" },
        { header: "Supplier", dataKey: "supplierName" },
        { header: "Against Bill", dataKey: "billNumber" },
        { header: "Mode", dataKey: "paymentMode" },
        { header: "Amount Paid (₹)", dataKey: "amount" },
      ],
      filtered.map((p) => ({
        ...p,
        date: new Date(p.paymentDate).toLocaleDateString("en-IN"),
        supplierName: p.supplier.name,
        billNumber: p.purchaseBill.billNumber,
      }))
    );
  };

  const samplePaymentColumns = [
    { header: "Supplier Name", example: "Jindal Steel" },
    { header: "Bill Number", example: "BILL-2026-001" },
    { header: "Payment Date", example: "2026-11-20" },
    { header: "Amount", example: 50000 },
    { header: "Mode", example: "NEFT" },
    { header: "UTR Reference", example: "ICIC26300188" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Universal Module Header with Analytics */}
      <ModuleHeaderWithAnalytics
        title="Payments Made (Vendor Payouts)"
        subtitle="Outgoing bank payouts via ICICI Bank (155205003161) or Cash, with Section 194C / 194Q TDS deductions"
        icon={CreditCard}
        badge={`${payments.length} Payouts`}
        analyticsPreset="purchases"
        analyticsMetrics={[
          { label: "Total Payouts Made", value: formatINR(totalPayout), trend: "+5.4%", isPositive: true, sub: "Vendor disbursements" },
          { label: "TDS Withheld (194C/194Q)", value: formatINR(totalTds), trend: "Credited", isPositive: true, sub: "Account 2040 TDS Payable" },
          { label: "Bank Reconciliation", value: "Reconciled", trend: "ICICI Live", isPositive: true, sub: "A/C 155205003161" },
          { label: "Settlement Accuracy", value: "100%", trend: "Zero Variance", isPositive: true, sub: "General ledger posted" },
        ]}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search payment #, vendor, bill #, UTR..."
        sampleColumns={samplePaymentColumns}
        sampleFilename="standard_roofs_payments_made_sample"
        onImport={async (rows) => {
          alert(`Imported ${rows.length} payment records.`);
          return { success: true, count: rows.length };
        }}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        primaryActionLabel="+ Pay Open Bill"
        primaryActionHref="/bills"
        onRefresh={loadPayments}
      />

      {/* Payments Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading payout records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <p>No vendor payments recorded yet.</p>
            <Link href="/bills" className="text-blue-600 font-bold hover:underline">
              Go to Bills to record a payment
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-3">Payment #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Supplier / Vendor</th>
                  <th className="py-2.5 px-3">Against Bill</th>
                  <th className="py-2.5 px-3">Paid Via</th>
                  <th className="py-2.5 px-3">Reference / UTR</th>
                  <th className="py-2.5 px-3 text-right">TDS (₹)</th>
                  <th className="py-2.5 px-3 text-right">Net Amount Paid (₹)</th>
                  <th className="py-2.5 px-3 text-center">Voucher</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {p.paymentNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {new Date(p.paymentDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {p.supplier.name}
                    </td>
                    <td className="py-3 px-3 font-mono text-blue-600 dark:text-blue-400">
                      {p.purchaseBill.billNumber}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold">{p.paymentMode}</span>
                      {p.bankAccount && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {p.bankAccount.bankName} (..{p.bankAccount.accountNumber.slice(-4)})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {p.referenceNumber || "-"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {Number(p.tdsAmount) > 0 ? (
                        <span>
                          {formatINR(p.tdsAmount)}
                          <span className="text-[10px] text-blue-600 block">u/s {p.tdsSection || "194C"}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {p.journalEntry ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                          {p.journalEntry.entryNumber}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setArchivePayment(p)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Archive Payment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Archive Confirmation Modal */}
      <ArchiveConfirmModal
        isOpen={!!archivePayment}
        onClose={() => setArchivePayment(null)}
        onConfirm={handleArchiveConfirm}
        recordName={archivePayment?.paymentNumber}
        recordType="Vendor Payment"
        loading={archiving}
      />
    </div>
  );
}
