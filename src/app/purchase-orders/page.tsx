"use client";

import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Plus,
  Search,
  Building,
  Calendar,
  AlertCircle,
  FileCheck,
  CreditCard,
  Printer,
  ChevronRight,
  ArrowRight,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/decimal";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  sequenceNumber: number;
  date: string;
  expectedDate: string | null;
  supplier: { id: string; name: string; companyName: string | null; state: string; stateCode: string };
  project: { id: string; code: string; name: string } | null;
  subTotal: number | string;
  cgstTotal: number | string;
  sgstTotal: number | string;
  igstTotal: number | string;
  totalAmount: number | string;
  status: string;
  convertedBillId: string | null;
  items: Array<{
    id: string;
    description: string;
    hsnSacCode: string;
    quantity: number | string;
    unit: string;
    unitPrice: number | string;
    taxableAmount: number | string;
    gstRate: number | string;
    totalAmount: number | string;
  }>;
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<any[]>([
    {
      description: "MS Hollow Pipe (50x50x2.5mm) - Primary Trusses",
      hsnSacCode: "7210",
      quantity: 5,
      unit: "TON",
      unitPrice: 68000,
      gstRate: 18,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [oRes, sRes, pRes] = await Promise.all([
        fetch(`/api/purchase-orders?status=${filterStatus}`),
        fetch("/api/vendors"),
        fetch("/api/projects"),
      ]);
      const oData = await oRes.json();
      const sData = await sRes.json();
      const pData = await pRes.json();

      if (oData.success) setOrders(oData.purchaseOrders);
      if (sData.success) {
        setSuppliers(sData.vendors);
        if (sData.vendors.length > 0 && !supplierId) setSupplierId(sData.vendors[0].id);
      }
      if (pData.success) setProjects(pData.projects);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setErrorMsg("Please select a supplier.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          projectId: projectId || null,
          date,
          expectedDate: expectedDate || null,
          notes,
          items: lines,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        loadData();
      } else {
        setErrorMsg(data.error || "Failed to create Purchase Order");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create PO");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToBill = async (poId: string) => {
    if (!confirm("Convert this Purchase Order into a Vendor Bill and post double-entry vouchers?")) {
      return;
    }
    setConvertingId(poId);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/convert`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Purchase Order successfully converted to Bill: " + data.bill.billNumber);
        router.push("/bills");
      } else {
        alert(data.error || "Conversion failed");
      }
    } catch (err: any) {
      alert(err.message || "Conversion failed");
    } finally {
      setConvertingId(null);
    }
  };

  // Live calculations for modal
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
            <ShoppingCart className="text-blue-600" /> Purchase Orders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Procurement orders for steel trusses, roofing sheets, fasteners, tiles & 1-Click Bill Conversion
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/vendors"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition"
          >
            Vendors
          </Link>
          <Link
            href="/bills"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition"
          >
            Vendor Bills
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Plus size={15} /> + New Purchase Order
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
            All Purchase Orders ({orders.length})
          </span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 border rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          >
            <option value="ALL">All Status</option>
            <option value="ISSUED">Issued</option>
            <option value="BILLED">Billed</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading purchase orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <p>No purchase orders recorded yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              + Create your first PO
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-3">PO Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Vendor / Supplier</th>
                  <th className="py-2.5 px-3">Project Site</th>
                  <th className="py-2.5 px-3 text-right">Items</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {po.poNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {new Date(po.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {po.supplier.name}
                      {po.supplier.companyName && (
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {po.supplier.companyName}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {po.project ? `${po.project.code} - ${po.project.name}` : "Main Yard Inventory"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {po.items.length} item(s)
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                      {formatINR(po.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          po.status === "BILLED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {po.status !== "BILLED" ? (
                        <button
                          onClick={() => handleConvertToBill(po.id)}
                          disabled={convertingId === po.id}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow flex items-center gap-1 ml-auto cursor-pointer disabled:opacity-50"
                        >
                          <FileCheck size={12} /> Convert to Bill
                        </button>
                      ) : (
                        <Link
                          href="/bills"
                          className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center justify-end gap-1"
                        >
                          View Bill <ChevronRight size={12} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Purchase Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShoppingCart className="text-blue-600" /> Create New Purchase Order
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Supplier / Vendor *
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
                    Destination Project Site (Optional)
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Main Yard / Warehouse Stock</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    PO Order Date
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
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden p-3 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                    Procurement Line Items
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
                          placeholder="Item description (Steel, Tiles, Sheets...)"
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
                          <option value="TON">TON</option>
                          <option value="KG">KG</option>
                          <option value="SQFT">SQFT</option>
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

                {/* Live PO Totals */}
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
                      <span>Total Amount:</span>
                      <span>{formatINR(calcTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Order Notes & Instructions
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery address, un-loading instructions, vehicle clearance..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
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
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Issuing PO..." : "Issue Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
