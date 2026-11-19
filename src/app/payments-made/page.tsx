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
} from "lucide-react";
import Link from "next/link";
import { formatINR } from "@/lib/decimal";

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="text-emerald-600" /> Payments Made (Vendor Payouts)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Outgoing bank payouts via ICICI Bank (155205003161) or Cash, with Section 194C / 194Q TDS deductions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/bills"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition active:scale-95"
          >
            <Plus size={15} /> + Pay Open Bill
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Payouts Made
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(totalPayout)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{payments.length} payout transactions posted</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total TDS Withheld (194C / 194Q)
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {formatINR(totalTds)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Credited to TDS Payable (Account 2040)</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Primary Payout Facility
          </span>
          <div className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1">
            ICICI Bank (155205003161)
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Kagam Branch, Erode • IFSC: ICIC0001552</p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search payment #, vendor, bill #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Showing {filtered.length} of {payments.length} records
          </span>
        </div>

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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
