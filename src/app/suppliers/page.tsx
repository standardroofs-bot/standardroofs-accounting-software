"use client";

import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Plus,
  Search,
  Building,
  Phone,
  Paperclip,
  Calendar,
  AlertCircle,
  FileCheck,
  CreditCard,
  Layers,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { validateGSTIN, COMMON_ROOFING_HSN_SAC } from "@/lib/gst";

interface SupplierItem {
  id: string;
  name: string;
  companyName: string | null;
  gstNumber: string | null;
  phone: string | null;
  paymentTerms: string | null;
  totalPayable: string;
}

interface PurchaseBillItem {
  id: string;
  billNumber: string;
  vendorInvoiceNumber: string | null;
  date: string;
  supplier: { id: string; name: string };
  project: { id: string; code: string; name: string } | null;
  subTotal: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  totalAmount: string;
  status: string;
  receiptUrl: string | null;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"BILLS" | "SUPPLIERS">("BILLS");

  // Supplier Form State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supName, setSupName] = useState("");
  const [supCompany, setSupCompany] = useState("");
  const [supGstin, setSupGstin] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supTerms, setSupTerms] = useState("30 Days");
  const [supBank, setSupBank] = useState("");
  const [supAccountNo, setSupAccountNo] = useState("");
  const [supIfsc, setSupIfsc] = useState("");
  const [submittingSup, setSubmittingSup] = useState(false);
  const [supError, setSupError] = useState("");

  // Purchase Bill Form State
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [billItems, setBillItems] = useState([
    { description: "Primary Steel Structural Beams / Channels", hsnSacCode: "7308", quantity: 2.5, unit: "MT", unitPrice: 65000, gstRate: 18 },
  ]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submittingBill, setSubmittingBill] = useState(false);
  const [billError, setBillError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [supRes, billRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/purchases"),
      ]);
      const supData = await supRes.json();
      const billData = await billRes.json();

      if (supData.success) {
        setSuppliers(supData.suppliers);
        if (supData.suppliers.length > 0 && !selectedSupplierId) {
          setSelectedSupplierId(supData.suppliers[0].id);
        }
      }
      if (billData.success) {
        setPurchaseBills(billData.purchaseBills);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supGstin && !validateGSTIN(supGstin)) {
      setSupError("Invalid GSTIN format (15 characters required).");
      return;
    }
    setSubmittingSup(true);
    setSupError("");

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: supName,
          companyName: supCompany,
          gstNumber: supGstin,
          phone: supPhone,
          paymentTerms: supTerms,
          bankName: supBank,
          accountNumber: supAccountNo,
          ifscCode: supIfsc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSupplierModal(false);
        setSupName("");
        setSupCompany("");
        setSupGstin("");
        setSupPhone("");
        fetchData();
      } else {
        setSupError(data.error || "Failed to create supplier");
      }
    } catch (err: any) {
      setSupError(err.message);
    } finally {
      setSubmittingSup(false);
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setBillError("Please select a supplier.");
      return;
    }
    setSubmittingBill(true);
    setBillError("");

    try {
      const formData = new FormData();
      formData.append("supplierId", selectedSupplierId);
      formData.append("vendorInvoiceNumber", vendorInvoiceNo);
      formData.append("date", billDate);
      if (dueDate) formData.append("dueDate", dueDate);
      formData.append("items", JSON.stringify(billItems));
      if (receiptFile) formData.append("receipt", receiptFile);

      const res = await fetch("/api/purchases", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setShowBillModal(false);
        setVendorInvoiceNo("");
        setReceiptFile(null);
        fetchData();
      } else {
        setBillError(data.error || "Failed to post purchase bill");
      }
    } catch (err: any) {
      setBillError(err.message);
    } finally {
      setSubmittingBill(false);
    }
  };

  const totalAP = suppliers.reduce((sum, s) => sum + parseFloat(s.totalPayable || "0"), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShoppingCart className="text-blue-600" /> Suppliers & Material Purchases
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Raw steel, galvalume sheets, fasteners & consumable vendor bills with GST Input Tax Credit (ITC)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow transition active:scale-95"
          >
            <Plus size={16} /> + New Supplier
          </button>
          <button
            onClick={() => setShowBillModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition active:scale-95"
          >
            <Plus size={16} /> + Record Purchase Bill
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("BILLS")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === "BILLS"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Purchase Bills Register ({purchaseBills.length})
        </button>
        <button
          onClick={() => setActiveTab("SUPPLIERS")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === "SUPPLIERS"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Suppliers Directory ({suppliers.length})
        </button>
        <div className="ml-auto text-xs font-bold text-slate-600 dark:text-slate-400 pr-2">
          Total Accounts Payable: <span className="text-rose-600 font-mono font-black">{formatINR(totalAP)}</span>
        </div>
      </div>

      {activeTab === "BILLS" ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Bill No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Vendor Inv #</th>
                  <th className="py-3 px-4 text-right">Taxable (₹)</th>
                  <th className="py-3 px-4 text-right">Input GST (ITC)</th>
                  <th className="py-3 px-4 text-right">Total Bill (₹)</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {purchaseBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No purchase bills recorded. Click <strong>+ Record Purchase Bill</strong> to record vendor materials.
                    </td>
                  </tr>
                ) : (
                  purchaseBills.map((pb) => (
                    <tr key={pb.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">{pb.billNumber}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(pb.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{pb.supplier.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{pb.vendorInvoiceNumber || "—"}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">{formatINR(pb.subTotal)}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-bold">
                        {formatINR(parseFloat(pb.cgstTotal) + parseFloat(pb.sgstTotal) + parseFloat(pb.igstTotal))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">{formatINR(pb.totalAmount)}</td>
                      <td className="py-3 px-4 text-center">
                        {pb.receiptUrl ? (
                          <a href={pb.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-bold">
                            <Paperclip size={12} /> Bill
                          </a>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                          {pb.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-right">Outstanding Payable (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">No suppliers registered yet.</td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{s.name}</div>
                        {s.companyName && <div className="text-[11px] text-slate-500">{s.companyName}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{s.gstNumber || "Unregistered"}</td>
                      <td className="py-3 px-4 text-slate-600">{s.phone || "—"}</td>
                      <td className="py-3 px-4">{s.paymentTerms || "30 Days"}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">{formatINR(s.totalPayable)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building className="text-blue-600" /> Register Material Supplier
            </h2>
            {supError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} /> <span>{supError}</span>
              </div>
            )}
            <form onSubmit={handleCreateSupplier} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata BlueScope Steel Distributor"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="33AAAAA0000A1Z5"
                    value={supGstin}
                    onChange={(e) => setSupGstin(e.target.value.toUpperCase())}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Mobile Phone</label>
                  <input
                    type="text"
                    placeholder="+91 94433 12345"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSup}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold"
                >
                  {submittingSup ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Purchase Bill Modal */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShoppingCart className="text-blue-600" /> Record Material Purchase Bill
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Posts automatic Double-Entry (Debits Material Expense & GST Input ITC, Credits Accounts Payable)
            </p>

            {billError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} /> <span>{billError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBill} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Select Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Vendor Tax Invoice No</label>
                  <input
                    type="text"
                    placeholder="e.g. TATA/2026/8891"
                    value={vendorInvoiceNo}
                    onChange={(e) => setVendorInvoiceNo(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Bill Date</label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Attach Bill Copy (PDF/Photo)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full mt-1 text-[11px] text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-2 border border-slate-200 dark:border-slate-800 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
                <span className="font-bold text-[11px] text-slate-700 uppercase">Material Items</span>
                {billItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      className="col-span-5 p-1.5 rounded border border-slate-300 bg-white dark:bg-slate-800"
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...billItems];
                        updated[idx].description = e.target.value;
                        setBillItems(updated);
                      }}
                      placeholder="Material description"
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="col-span-2 p-1.5 text-right font-mono font-bold rounded border border-slate-300 bg-white dark:bg-slate-800"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...billItems];
                        updated[idx].quantity = parseFloat(e.target.value) || 0;
                        setBillItems(updated);
                      }}
                      placeholder="Qty"
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="col-span-3 p-1.5 text-right font-mono font-bold rounded border border-slate-300 bg-white dark:bg-slate-800"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const updated = [...billItems];
                        updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                        setBillItems(updated);
                      }}
                      placeholder="Rate (₹)"
                    />
                    <select
                      className="col-span-2 p-1.5 rounded border border-slate-300 bg-white dark:bg-slate-800 font-mono text-[10px]"
                      value={item.gstRate}
                      onChange={(e) => {
                        const updated = [...billItems];
                        updated[idx].gstRate = parseFloat(e.target.value) || 18;
                        setBillItems(updated);
                      }}
                    >
                      <option value="18">18%</option>
                      <option value="12">12%</option>
                      <option value="5">5%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBill}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold"
                >
                  {submittingBill ? "Posting..." : "Confirm & Post Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
