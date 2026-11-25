"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  Edit2,
  Trash2,
  RotateCcw,
  Archive,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { validateGSTIN, getStateCodeFromGSTIN, INDIAN_STATES_LIST } from "@/lib/gst";
import { exportToExcel, exportToPDF, downloadSampleExcel } from "@/lib/exportUtils";
import { ExcelImportModal } from "@/components/common/ExcelImportModal";
import { ModuleHeaderWithAnalytics } from "@/components/common/ModuleHeaderWithAnalytics";
import { ArchiveConfirmModal } from "@/components/common/ArchiveConfirmModal";
import { InitialsAvatar, BalanceBadge } from "@/components/ui/ErpPrimitives";
import { Download, Upload, Loader2 } from "lucide-react";

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
  isArchived?: boolean;
  projects?: Array<{ id: string; code: string; name: string }>;
  ageing?: {
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
  const [tabFilter, setTabFilter] = useState<"ALL" | "DUE" | "ZERO" | "ARCHIVED">("ALL");

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CustomerItem | null>(null);
  const [archiving, setArchiving] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formGstin, setFormGstin] = useState("");
  const [formPan, setFormPan] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formState, setFormState] = useState("Tamil Nadu");
  const [formStateCode, setFormStateCode] = useState("33");
  const [formBilling, setFormBilling] = useState("");
  const [formShipping, setFormShipping] = useState("");
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [formCreditDays, setFormCreditDays] = useState("30");
  const [formOpeningBal, setFormOpeningBal] = useState("0");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Statement Modal
  const [statementCustomer, setStatementCustomer] = useState<CustomerItem | null>(null);
  const [ledgerEvents, setLedgerEvents] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const fetchCustomers = async (showArchived = tabFilter === "ARCHIVED") => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers?archived=${showArchived ? "true" : "false"}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(tabFilter === "ARCHIVED");
  }, [tabFilter]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormName("");
    setFormCompanyName("");
    setFormGstin("");
    setFormPan("");
    setFormPhone("");
    setFormEmail("");
    setFormState("Tamil Nadu");
    setFormStateCode("33");
    setFormBilling("");
    setFormShipping("");
    setSameAsBilling(true);
    setFormCreditDays("30");
    setFormOpeningBal("0");
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (c: CustomerItem) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormCompanyName(c.companyName || "");
    setFormGstin(c.gstNumber || "");
    setFormPan(c.panNumber || "");
    setFormPhone(c.phone || "");
    setFormEmail(c.email || "");
    setFormState(c.state || "Tamil Nadu");
    setFormStateCode(c.stateCode || "33");
    setFormBilling(c.billingAddress || "");
    setFormShipping(c.shippingAddress || c.billingAddress || "");
    setSameAsBilling(c.shippingAddress === c.billingAddress || !c.shippingAddress);
    setFormCreditDays(String(c.creditDays || 30));
    setFormOpeningBal(String(c.openingBalance || 0));
    setFormError("");
    setShowModal(true);
  };

  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase();
    setFormGstin(upper);
    if (upper.length >= 2) {
      const code = upper.slice(0, 2);
      const found = INDIAN_STATES_LIST.find((s) => s.code === code);
      if (found) {
        setFormStateCode(code);
        setFormState(found.name);
      }
    }
    if (upper.length >= 12 && !formPan) {
      setFormPan(upper.slice(2, 12));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBilling.trim()) {
      setFormError("Customer Name and Billing Address are mandatory.");
      return;
    }
    if (formGstin && !validateGSTIN(formGstin)) {
      setFormError("Invalid GSTIN! Please enter a valid 15-character GST format (e.g. 33AEWFS5187G1ZD).");
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError("");

      const payload = {
        name: formName.trim(),
        companyName: formCompanyName.trim() || null,
        gstNumber: formGstin.trim() || null,
        panNumber: formPan.trim() || null,
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        state: formState,
        stateCode: formStateCode,
        billingAddress: formBilling.trim(),
        shippingAddress: sameAsBilling ? formBilling.trim() : formShipping.trim(),
        creditDays: Number(formCreditDays) || 30,
        openingBalance: Number(formOpeningBal) || 0,
      };

      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchCustomers(tabFilter === "ARCHIVED");
      } else {
        setFormError(data.error || "Failed to save customer");
      }
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      setArchiving(true);
      const res = await fetch(`/api/customers/${archiveTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setArchiveTarget(null);
        fetchCustomers(tabFilter === "ARCHIVED");
      } else {
        alert(data.error || "Failed to archive customer");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setArchiving(false);
    }
  };

  const handleRestore = async (c: CustomerItem) => {
    try {
      const res = await fetch(`/api/customers/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCustomers(tabFilter === "ARCHIVED");
      } else {
        alert(data.error || "Failed to restore customer");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const viewStatement = async (c: CustomerItem) => {
    setStatementCustomer(c);
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/customers/${c.id}`);
      const data = await res.json();
      if (data.success) {
        setLedgerEvents(data.ledgerStatement || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Metrics calculations
  const totalOutstanding = customers.reduce((s, c) => s + Number(c.outstandingBalance || 0), 0);
  const bucket0_15Total = customers.reduce((s, c) => s + Number(c.ageing?.bucket0_15 || 0), 0);
  const bucket16_30Total = customers.reduce((s, c) => s + Number(c.ageing?.bucket16_30 || 0), 0);
  const bucket31_60Total = customers.reduce((s, c) => s + Number(c.ageing?.bucket31_60 || 0), 0);
  const bucket60_plusTotal = customers.reduce((s, c) => s + Number(c.ageing?.bucket60_plus || 0), 0);

  const handleImportCustomers = async (rows: any[]) => {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: true, items: rows }),
    });
    const json = await res.json();
    if (json.success) {
      fetchCustomers();
    }
    return json;
  };

  const handleExportExcel = () => {
    exportToExcel(
      customers.map((c) => ({
        "Customer Name": c.name,
        "Company Name": c.companyName || "",
        "GSTIN": c.gstNumber || "",
        "Phone": c.phone || "",
        "Email": c.email || "",
        "Billing Address": c.billingAddress,
        "State": c.state,
        "Outstanding Due (₹)": Number(c.outstandingBalance || 0),
      })),
      "Standard_Roofs_Customers"
    );
  };

  const handleExportPDF = () => {
    exportToPDF(
      "Standard Roofs - Customers Directory",
      [
        { header: "Customer Name", dataKey: "name" },
        { header: "Company", dataKey: "companyName" },
        { header: "GSTIN", dataKey: "gstNumber" },
        { header: "Phone", dataKey: "phone" },
        { header: "State", dataKey: "state" },
        { header: "Outstanding (₹)", dataKey: "outstandingBalance" },
      ],
      customers
    );
  };

  const filteredCustomers = customers.filter((c) => {
    const bal = Number(c.outstandingBalance || 0);
    if (tabFilter === "DUE" && bal <= 0) return false;
    if (tabFilter === "ZERO" && bal > 0) return false;

    const query = searchQuery.toLowerCase();
    const match =
      c.name.toLowerCase().includes(query) ||
      (c.companyName && c.companyName.toLowerCase().includes(query)) ||
      (c.gstNumber && c.gstNumber.toLowerCase().includes(query)) ||
      (c.phone && c.phone.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.billingAddress && c.billingAddress.toLowerCase().includes(query));
    return match;
  });

  const sampleCustomerColumns = [
    { header: "Customer Name", example: "Sabari & Co" },
    { header: "Company Name", example: "Sabari Industrial Steels" },
    { header: "GSTIN", example: "33AAACH7409R1Z8" },
    { header: "Phone", example: "9876543210" },
    { header: "Email", example: "sabari@gmail.com" },
    { header: "Billing Address", example: "SIDCO Industrial Estate, Erode" },
    { header: "State", example: "Tamil Nadu" },
    { header: "Opening Balance", example: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Universal Module Header with Analytics */}
      <ModuleHeaderWithAnalytics
        title="Customers & Accounts Receivable (AR)"
        subtitle="Clients master, GSTIN validation, credit limits, AR ageing & double-entry ledger statements"
        icon={Users}
        badge={`${customers.length} Clients`}
        analyticsPreset="parties"
        analyticsMetrics={[
          { label: "Total Outstanding AR", value: formatINR(totalOutstanding), trend: "+5.1%", isPositive: true, sub: "All clients" },
          { label: "0-15 Days (Current)", value: formatINR(bucket0_15Total), trend: "Healthy", isPositive: true, sub: "Normal terms" },
          { label: "16-30 Days (Due)", value: formatINR(bucket16_30Total), trend: "On Time", isPositive: true, sub: "Collection cycle" },
          { label: "Critical Overdue (60d+)", value: formatINR(bucket60_plusTotal), trend: "Zero Critical", isPositive: true, sub: "Strict compliance" },
        ]}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search customer, GSTIN, phone..."
        viewOptions={[
          { label: "All Customers", value: "ALL", count: customers.length },
          { label: "With Balance Due", value: "DUE", count: customers.filter((c) => Number(c.outstandingBalance || 0) > 0).length },
          { label: "Zero Balance", value: "ZERO", count: customers.filter((c) => Number(c.outstandingBalance || 0) <= 0).length },
          { label: "Archived", value: "ARCHIVED", count: customers.filter((c) => c.isArchived).length },
        ]}
        activeView={tabFilter}
        onViewChange={(v) => setTabFilter(v as any)}
        sampleColumns={sampleCustomerColumns}
        sampleFilename="standard_roofs_customers_sample"
        onImport={handleImportCustomers}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        primaryActionLabel="+ New Customer"
        onPrimaryAction={openAddModal}
        onRefresh={fetchCustomers}
      />

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
                <th className="py-3 px-4 text-center">Actions</th>
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
                    {tabFilter === "ARCHIVED" ? "No archived customers found." : "No customers found matching criteria."}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const bal = Number(c.outstandingBalance || 0);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => openEditModal(c)}
                      className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={c.name} />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{c.name}</div>
                            {c.companyName && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                <Building size={11} className="text-slate-500" /> {c.companyName}
                              </div>
                            )}
                            <p className="text-[10.5px] text-slate-600 truncate max-w-xs mt-0.5">
                              {c.billingAddress}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {c.gstNumber ? (
                          <div>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {c.gstNumber}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {c.state} (Code: {c.stateCode})
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Unregistered Consumer</span>
                        )}
                      </td>
                      <td className="py-3 px-4 space-y-0.5 text-slate-500">
                        {c.phone && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Phone size={11} className="text-slate-400" /> {c.phone}
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Mail size={11} className="text-slate-400" /> {c.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {c.creditDays} Days Credit
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold">
                        <BalanceBadge amount={bal} />
                      </td>
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {!c.isArchived ? (
                            <>
                              <button
                                onClick={() => viewStatement(c)}
                                className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 transition cursor-pointer"
                                title="View Double-Entry Ledger Statement"
                              >
                                View Statement
                              </button>
                              <Link
                                href={`/invoices/new?customerId=${c.id}`}
                                className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition"
                                title="Create Tax Invoice for this Customer"
                              >
                                + Invoice
                              </Link>
                              <button
                                onClick={() => openEditModal(c)}
                                className="p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Edit Customer"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => setArchiveTarget(c)}
                                className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="Archive Customer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRestore(c)}
                              className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 transition cursor-pointer flex items-center gap-1"
                            >
                              <RotateCcw size={12} /> Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building className="text-blue-600" />
              {editingCustomer ? `Edit Customer: ${editingCustomer.name}` : "New Customer (Zoho Books Format)"}
            </h2>

            {formError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Customer Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Sabari or K.P.E Ravindran"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Company / Trade Name
                  </label>
                  <input
                    type="text"
                    value={formCompanyName}
                    onChange={(e) => setFormCompanyName(e.target.value)}
                    placeholder="e.g. Sabari & Co"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    GSTIN (15-digit GST Number)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formGstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="e.g. 33AEWFS5187G1ZD"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formPan}
                    onChange={(e) => setFormPan(e.target.value.toUpperCase())}
                    placeholder="e.g. AEWFS5187G"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +91 98427 00000"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. client@standardroofs.in"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Place of Supply (State)
                  </label>
                  <select
                    value={formStateCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setFormStateCode(code);
                      const f = INDIAN_STATES_LIST.find((s) => s.code === code);
                      if (f) setFormState(f.name);
                    }}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    {INDIAN_STATES_LIST.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Credit Terms (Days)
                  </label>
                  <select
                    value={formCreditDays}
                    onChange={(e) => setFormCreditDays(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="0">Due on Receipt (0 Days)</option>
                    <option value="15">Net 15 Days</option>
                    <option value="30">Net 30 Days</option>
                    <option value="45">Net 45 Days</option>
                    <option value="60">Net 60 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Billing Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={formBilling}
                  onChange={(e) => setFormBilling(e.target.value)}
                  placeholder="Street, Area, City, Pincode"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sameAsBilling"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sameAsBilling" className="text-slate-700 dark:text-slate-300 font-medium">
                  Shipping Address is same as Billing Address
                </label>
              </div>

              {!sameAsBilling && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Shipping / Project Site Address
                  </label>
                  <textarea
                    rows={2}
                    value={formShipping}
                    onChange={(e) => setFormShipping(e.target.value)}
                    placeholder="Project Site, Street, City, Pincode"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? "Saving..." : editingCustomer ? "Update Customer" : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirm Modal */}
      <ArchiveConfirmModal
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        recordName={archiveTarget?.name}
        recordType="Customer"
        loading={archiving}
      />

      {/* Statement Modal */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet className="text-blue-600" /> Customer Account Statement
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client: <strong>{statementCustomer.name}</strong> • GSTIN: {statementCustomer.gstNumber || "Unregistered"}
                </p>
              </div>
              <button
                onClick={() => setStatementCustomer(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingLedger ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading ledger events...</div>
            ) : ledgerEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No transactions recorded for this customer yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Voucher #</th>
                      <th className="py-2.5 px-3">Transaction Narration</th>
                      <th className="py-2.5 px-3 text-right">Debit (Dr) ₹</th>
                      <th className="py-2.5 px-3 text-right">Credit (Cr) ₹</th>
                      <th className="py-2.5 px-3 text-right">Running Balance ₹</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ledgerEvents.map((ev, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(ev.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-600">{ev.voucherNumber}</td>
                        <td className="py-2 px-3">{ev.narration}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {Number(ev.debit) > 0 ? formatINR(ev.debit) : "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {Number(ev.credit) > 0 ? formatINR(ev.credit) : "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                          {formatINR(ev.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Universal Zoho Excel Import Modal */}
      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Customers & Clients"
        sampleColumns={[
          { header: "Customer Name", example: "Sri Murugan Steels" },
          { header: "Billing Address", example: "12, Sathy Road, Erode, Tamil Nadu 638003" },
          { header: "GSTIN", example: "33AAAAA0000A1Z5" },
          { header: "Phone", example: "9842712345" },
          { header: "Email", example: "accounts@murugansteels.in" },
          { header: "State", example: "Tamil Nadu" },
        ]}
        sampleFilename="standard_roofs_customers_sample"
        onImport={handleImportCustomers}
      />
    </div>
  );
}
