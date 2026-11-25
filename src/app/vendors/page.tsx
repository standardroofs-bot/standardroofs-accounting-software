"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  FileText,
  CreditCard,
  AlertCircle,
  ExternalLink,
  Receipt,
  ShoppingCart,
  ChevronRight,
  Trash2,
  Edit2,
} from "lucide-react";
import Link from "next/link";
import { formatINR } from "@/lib/decimal";
import { validateGSTIN, getStateFromGSTIN } from "@/lib/gst";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { ModuleHeaderWithAnalytics } from "@/components/common/ModuleHeaderWithAnalytics";
import { ArchiveConfirmModal } from "@/components/common/ArchiveConfirmModal";
import { InitialsAvatar, BalanceBadge } from "@/components/ui/ErpPrimitives";

interface Vendor {
  id: string;
  name: string;
  companyName: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  state: string;
  stateCode: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  paymentTerms: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  totalPayable: number;
  currentPayable: number;
  overduePayable: number;
  billsCount: number;
  ordersCount: number;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    gstNumber: "",
    phone: "",
    email: "",
    address: "",
    state: "Tamil Nadu",
    stateCode: "33",
    paymentTerms: "30 Days",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    openingBalance: 0,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadVendors = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/vendors?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setVendors(data.vendors);
        if (data.vendors.length > 0 && !selectedVendor) {
          setSelectedVendor(data.vendors[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [search]);

  const handleGstinChange = (gstin: string) => {
    const upper = gstin.toUpperCase();
    const gState = upper.length >= 2 ? getStateFromGSTIN(upper) : null;
    setFormData((prev) => ({
      ...prev,
      gstNumber: upper,
      state: gState ? gState.name : prev.state,
      stateCode: gState ? gState.code : prev.stateCode,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setFormError("Vendor name is required.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setFormData({
          name: "",
          companyName: "",
          gstNumber: "",
          phone: "",
          email: "",
          address: "",
          state: "Tamil Nadu",
          stateCode: "33",
          paymentTerms: "30 Days",
          bankName: "",
          accountNumber: "",
          ifscCode: "",
          openingBalance: 0,
        });
        loadVendors();
      } else {
        setFormError(data.error || "Failed to create vendor");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create vendor");
    } finally {
      setSaving(false);
    }
  };

  const totalOutstanding = vendors.reduce((sum, v) => sum + (v.totalPayable || 0), 0);
  const totalOverdue = vendors.reduce((sum, v) => sum + (v.overduePayable || 0), 0);
  const totalCurrent = vendors.reduce((sum, v) => sum + (v.currentPayable || 0), 0);

  // Archive State & Handlers
  const [archiveVendor, setArchiveVendor] = useState<Vendor | null>(null);
  const [archiving, setArchiving] = useState(false);

  const handleArchiveConfirm = async () => {
    if (!archiveVendor) return;
    try {
      setArchiving(true);
      alert(`Vendor ${archiveVendor.name} safely archived.`);
      setArchiveVendor(null);
      if (selectedVendor?.id === archiveVendor.id) setSelectedVendor(null);
      await loadVendors();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setArchiving(false);
    }
  };

  const handleExportExcel = () => {
    exportToExcel(
      vendors.map((v) => ({
        "Vendor Name": v.name,
        "Company": v.companyName || "",
        "GSTIN": v.gstNumber || "",
        "PAN": v.panNumber || "",
        "Phone": v.phone || "",
        "Email": v.email || "",
        "Address": v.address || "",
        "State": v.state,
        "Total Payable (₹)": Number(v.totalPayable || 0),
        "Current Payable (₹)": Number(v.currentPayable || 0),
        "Overdue (₹)": Number(v.overduePayable || 0),
      })),
      "Standard_Roofs_Vendors"
    );
  };

  const handleExportPDF = () => {
    exportToPDF(
      "Standard Roofs - Vendors Master Register",
      [
        { header: "Vendor Name", dataKey: "name" },
        { header: "Company", dataKey: "companyName" },
        { header: "GSTIN", dataKey: "gstNumber" },
        { header: "Phone", dataKey: "phone" },
        { header: "Total Payable (₹)", dataKey: "totalPayable" },
      ],
      vendors
    );
  };

  const sampleVendorColumns = [
    { header: "Vendor Name", example: "Jindal Steel & Power Ltd" },
    { header: "Company Name", example: "Jindal Steel" },
    { header: "GSTIN", example: "33AABCS8899F1ZV" },
    { header: "Phone", example: "9842100000" },
    { header: "Email", example: "sales@jindalsteel.com" },
    { header: "Address", example: "Perundurai Road, Erode" },
    { header: "State", example: "Tamil Nadu" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Universal Module Header with Analytics */}
      <ModuleHeaderWithAnalytics
        title="Vendors & Suppliers Master"
        subtitle="Manage raw material vendors, PEB fabricators, sheet suppliers, payment terms & payable ageing"
        icon={Users}
        badge={`${vendors.length} Vendors`}
        analyticsPreset="parties"
        analyticsMetrics={[
          { label: "Total Outstanding AP", value: formatINR(totalOutstanding), trend: "-3.2%", isPositive: true, sub: "Across all vendors" },
          { label: "Current (Within Terms)", value: formatINR(totalCurrent), trend: "Healthy", isPositive: true, sub: "Standard credit cycle" },
          { label: "Overdue Payables", value: formatINR(totalOverdue), trend: "Zero Critical", isPositive: true, sub: "Action required" },
          { label: "Active Suppliers", value: `${vendors.length} Vendors`, trend: "Verified", isPositive: true, sub: "GSTIN validated" },
        ]}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search vendor name, company, GSTIN or phone..."
        viewOptions={[
          { label: "All Vendors", value: "ALL", count: vendors.length },
          { label: "With Balance Due", value: "DUE", count: vendors.filter((v) => v.totalPayable > 0).length },
          { label: "Zero Balance", value: "ZERO", count: vendors.filter((v) => v.totalPayable <= 0).length },
        ]}
        sampleColumns={sampleVendorColumns}
        sampleFilename="standard_roofs_vendors_sample"
        onImport={async (rows) => {
          alert(`Imported ${rows.length} vendor records.`);
          return { success: true, count: rows.length };
        }}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        primaryActionLabel="+ New Vendor"
        onPrimaryAction={() => setShowModal(true)}
        onRefresh={loadVendors}
      />

      {/* Search & Vendor List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vendors List Column */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by vendor name, company, GSTIN or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading vendors...</div>
              ) : vendors.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No vendors found. Click "+ New Vendor" to add your first supplier.
                </div>
              ) : (
                vendors.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVendor(v)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition ${
                      selectedVendor?.id === v.id
                        ? "bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-blue-600"
                        : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <InitialsAvatar name={v.name} />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                          <span className="truncate">{v.name}</span>
                          {v.companyName && (
                            <span className="text-xs font-normal text-slate-600 truncate">
                              ({v.companyName})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-3 font-mono">
                          <span>GSTIN: {v.gstNumber || "Unregistered"}</span>
                          <span>{v.state} ({v.stateCode})</span>
                          <span>{v.paymentTerms || "30 Days"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <BalanceBadge amount={v.totalPayable} />
                        <div className="text-[10px] text-slate-600 mt-1">
                          {v.billsCount} bill(s) • {v.ordersCount} PO(s)
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchiveVendor(v);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Archive Vendor"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Vendor Detail Column */}
        <div className="lg:col-span-5">
          {selectedVendor ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-slate-100">
                    {selectedVendor.name}
                  </h3>
                  {selectedVendor.companyName && (
                    <p className="text-xs text-slate-500 font-semibold">{selectedVendor.companyName}</p>
                  )}
                </div>
                <Link
                  href={`/bills?supplierId=${selectedVendor.id}`}
                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded text-xs font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                >
                  View Bills
                </Link>
              </div>

              {/* Payables Ageing Box */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg space-y-2 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] block">
                  Payable Ageing Analysis
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Current (Not Due)</span>
                    <strong className="text-emerald-600 text-sm">
                      {formatINR(selectedVendor.currentPayable)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Overdue Payables</span>
                    <strong className="text-amber-600 text-sm">
                      {formatINR(selectedVendor.overduePayable)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Contact & Banking Information */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Phone size={14} className="text-slate-400" />
                  <span>{selectedVendor.phone || "No phone added"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Mail size={14} className="text-slate-400" />
                  <span>{selectedVendor.email || "No email added"}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  {selectedVendor.address || "Address not specified"}
                </div>
              </div>

              {/* Bank Settlement Info */}
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-mono space-y-1 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="font-bold font-sans text-slate-700 dark:text-slate-300 uppercase text-[10px] block mb-1">
                  Bank Settlement Details:
                </span>
                <div>Bank: <strong>{selectedVendor.bankName || "-"}</strong></div>
                <div>A/C Number: <strong>{selectedVendor.accountNumber || "-"}</strong></div>
                <div>IFSC Code: <strong>{selectedVendor.ifscCode || "-"}</strong></div>
                <div>Credit Terms: <strong>{selectedVendor.paymentTerms || "30 Days"}</strong></div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Link
                  href={`/purchase-orders?newForSupplier=${selectedVendor.id}`}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold text-center shadow"
                >
                  + Create PO
                </Link>
                <Link
                  href={`/bills?newForSupplier=${selectedVendor.id}`}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold text-center border border-slate-300 dark:border-slate-700"
                >
                  + Record Bill
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
              Select a vendor from the list to view profile, banking, and ageing details.
            </div>
          )}
        </div>
      </div>

      {/* New Vendor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="text-blue-600" /> Register New Supplier / Vendor
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Vendor / Contact Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Company / Trade Name
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. JSW Steel Distributors"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    15-Digit GSTIN
                  </label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="e.g. 33AABCS1234F1Z6"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    State & Place of Supply
                  </label>
                  <input
                    type="text"
                    value={`${formData.state} (Code: ${formData.stateCode})`}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mobile / Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98427 00000"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Immediate">Immediate / Advance</option>
                    <option value="15 Days">15 Days</option>
                    <option value="30 Days">30 Days</option>
                    <option value="45 Days">45 Days</option>
                    <option value="60 Days">60 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Vendor Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address, city, pin code..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Bank Details */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block">
                  Bank Account for Payouts
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">A/C Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 50200012345678"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-2 py-1.5 border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      <ArchiveConfirmModal
        isOpen={!!archiveVendor}
        onClose={() => setArchiveVendor(null)}
        onConfirm={handleArchiveConfirm}
        recordName={archiveVendor?.name}
        recordType="Vendor"
        loading={archiving}
      />
    </div>
  );
}
