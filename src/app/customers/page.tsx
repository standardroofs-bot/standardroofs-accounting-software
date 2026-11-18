"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { validateGSTIN } from "@/lib/gst";

interface CustomerItem {
  id: string;
  name: string;
  companyName: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  state: string;
  stateCode: string;
  billingAddress: string;
  shippingAddress: string | null;
  email: string | null;
  phone: string | null;
  creditDays: number;
  openingBalance: string;
  outstandingBalance: string;
  projects: Array<{ id: string; code: string; name: string }>;
  ageing: {
    bucket0_15: string;
    bucket16_30: string;
    bucket31_60: string;
    bucket60_plus: string;
    totalDue: string;
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("Tamil Nadu");
  const [stateCode, setStateCode] = useState("33");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [creditDays, setCreditDays] = useState("30");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Ledger Statement Modal
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [ledgerStatement, setLedgerStatement] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gstNumber && !validateGSTIN(gstNumber)) {
      setErrorMsg("Invalid GSTIN! Must be a valid 15-character Indian GST format (e.g. 33AABCS1234F1Z5)");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          companyName,
          gstNumber,
          phone,
          email,
          state,
          stateCode,
          billingAddress,
          shippingAddress: shippingAddress || billingAddress,
          creditDays: parseInt(creditDays) || 30,
          openingBalance,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setName("");
        setCompanyName("");
        setGstNumber("");
        setPhone("");
        setEmail("");
        setBillingAddress("");
        setShippingAddress("");
        setOpeningBalance("0");
        fetchCustomers();
      } else {
        setErrorMsg(data.error || "Failed to create customer");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openLedgerStatement = async (cust: CustomerItem) => {
    setSelectedCustomer(cust);
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/customers/${cust.id}`);
      const data = await res.json();
      if (data.success) {
        setLedgerStatement(data.ledgerStatement);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.companyName && c.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.gstNumber && c.gstNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Overall AR Ageing Metrics
  const totalAR = customers.reduce((sum, c) => sum + parseFloat(c.ageing?.totalDue || "0"), 0);
  const total0_15 = customers.reduce((sum, c) => sum + parseFloat(c.ageing?.bucket0_15 || "0"), 0);
  const total16_30 = customers.reduce((sum, c) => sum + parseFloat(c.ageing?.bucket16_30 || "0"), 0);
  const total31_60 = customers.reduce((sum, c) => sum + parseFloat(c.ageing?.bucket31_60 || "0"), 0);
  const total60_plus = customers.reduce((sum, c) => sum + parseFloat(c.ageing?.bucket60_plus || "0"), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="text-blue-600" /> Customers & Accounts Receivable (AR)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Clients master, GSTIN validation, credit limits, AR ageing & double-entry ledger statements
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition active:scale-95"
        >
          <Plus size={16} /> + New Customer
        </button>
      </div>

      {/* AR Ageing Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Outstanding</span>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">{formatINR(totalAR)}</p>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">Total Unpaid Invoices</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">0 – 15 Days</span>
          <p className="text-lg font-black text-emerald-600 mt-1">{formatINR(total0_15)}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Current / On Time</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">16 – 30 Days</span>
          <p className="text-lg font-black text-blue-600 mt-1">{formatINR(total16_30)}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Normal Credit Period</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">31 – 60 Days</span>
          <p className="text-lg font-black text-amber-600 mt-1">{formatINR(total31_60)}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Follow-Up Required</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">60+ Days</span>
          <p className="text-lg font-black text-rose-600 mt-1">{formatINR(total60_plus)}</p>
          <span className="text-[10px] text-rose-500 font-semibold mt-0.5 block">Overdue Critical</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer name, company, GSTIN or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs text-slate-400">Total {filteredCustomers.length} Customers</span>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Customer / Company</th>
                <th className="py-3 px-4">GSTIN & State</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Credit Terms</th>
                <th className="py-3 px-4 text-right">AR Outstanding (₹)</th>
                <th className="py-3 px-4 text-center">Ledger Statement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading customers...</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No customers found. Click <strong>+ New Customer</strong> to add your first client.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{cust.name}</div>
                      {cust.companyName && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building size={12} /> {cust.companyName}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {cust.gstNumber ? (
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{cust.gstNumber}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unregistered</span>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {cust.state} (State Code: {cust.stateCode})
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {cust.phone && <div className="text-[11px] flex items-center gap-1"><Phone size={11} /> {cust.phone}</div>}
                      {cust.email && <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Mail size={11} /> {cust.email}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {cust.creditDays} Days Credit
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(cust.ageing?.totalDue || cust.outstandingBalance)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openLedgerStatement(cust)}
                        className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-[11px] font-bold hover:bg-blue-100 transition inline-flex items-center gap-1"
                      >
                        <FileText size={12} /> View Statement
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="text-blue-600" /> Create Customer Profile
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Add new roofing client with Indian GSTIN & billing details
            </p>

            {errorMsg && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Customer / Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. S. Murugesan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Company / Firm Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Kongu Agro Farms Pvt Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    placeholder="33AAAAA0000A1Z5"
                    maxLength={15}
                    value={gstNumber}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setGstNumber(val);
                      if (val.length >= 2) {
                        setStateCode(val.substring(0, 2));
                      }
                    }}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">State & GST Code *</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Tamil Nadu"
                      className="w-3/4 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                      placeholder="33"
                      className="w-1/4 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Mobile Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98427 12345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    placeholder="accounts@client.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Billing Address *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Street, City, PIN Code, Tamil Nadu"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Credit Period (Days)</label>
                  <input
                    type="number"
                    value={creditDays}
                    onChange={(e) => setCreditDays(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Opening Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Ledger Statement Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="text-blue-600" /> Customer Ledger Statement
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedCustomer.name} {selectedCustomer.companyName ? `(${selectedCustomer.companyName})` : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-4 max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Voucher / Narration</th>
                    <th className="py-2 px-3 text-right">Debit (₹)</th>
                    <th className="py-2 px-3 text-right">Credit (₹)</th>
                    <th className="py-2 px-3 text-right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {loadingLedger ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">Loading statement...</td>
                    </tr>
                  ) : ledgerStatement.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                        No transactions recorded for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerStatement.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(ev.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-2 px-3 font-sans">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{ev.voucherNumber}</div>
                          <div className="text-[10px] text-slate-400">{ev.narration}</div>
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-bold">
                          {parseFloat(ev.debit) > 0 ? formatINR(ev.debit) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right text-blue-600 font-bold">
                          {parseFloat(ev.credit) > 0 ? formatINR(ev.credit) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatINR(ev.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
