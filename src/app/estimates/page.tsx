"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  Eye,
  Printer,
  Trash2,
  Building,
  Calendar,
  Layers,
  Sparkles,
  X,
  FileCheck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface EstimateItem {
  id?: string;
  description: string;
  hsnCode: string;
  quantity: number | string;
  unit: string;
  unitRate: number | string;
  discount: number | string;
  gstRate: number | string;
  cgstAmount?: string;
  sgstAmount?: string;
  igstAmount?: string;
  totalAmount?: string;
}

interface Estimate {
  id: string;
  estimateNumber: string;
  date: string;
  expiryDate?: string;
  customerId: string;
  projectId?: string;
  status: "DRAFT" | "SENT" | "APPROVED" | "CONVERTED" | "REJECTED";
  roofType: string;
  totalSqFt: string;
  subTotal: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  totalAmount: string;
  terms?: string;
  notes?: string;
  convertedInvoiceId?: string;
  customer: {
    id: string;
    name: string;
    companyName?: string;
    mobile?: string;
    email?: string;
    gstNumber?: string;
    stateCode: string;
  };
  project?: {
    id: string;
    code: string;
    name: string;
    roofType: string;
  };
  items: EstimateItem[];
}

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // New Estimate Form State
  const [newEstimate, setNewEstimate] = useState({
    customerId: "",
    projectId: "",
    roofType: "PEB",
    date: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    terms: "1. Validity: 30 days from date of issue.\n2. Payment: 50% Advance, 40% on Material Delivery, 10% on Completion.\n3. GST 18% extra as applicable.",
    notes: "Roofing fabrication and erection quotation with structural warranty.",
    items: [
      {
        description: "PEB Roofing Structure Fabrication & Erection (Heavy Section)",
        hsnCode: "9954",
        quantity: 1200,
        unit: "Sq.Ft",
        unitRate: 350,
        discount: 0,
        gstRate: 18,
      },
      {
        description: "Galvalume Colour Coated Roofing Sheets (0.50mm TCT)",
        hsnCode: "7210",
        quantity: 1200,
        unit: "Sq.Ft",
        unitRate: 180,
        discount: 0,
        gstRate: 18,
      },
    ],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [estRes, custRes, prjRes] = await Promise.all([
        fetch("/api/estimates"),
        fetch("/api/customers"),
        fetch("/api/projects"),
      ]);

      const [estData, custData, prjData] = await Promise.all([
        estRes.json(),
        custRes.json(),
        prjRes.json(),
      ]);

      if (estData.success) setEstimates(estData.estimates);
      if (custData.success) setCustomers(custData.customers || []);
      if (prjData.success) setProjects(prjData.projects || []);
    } catch (err) {
      console.error("Error loading estimates data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEstimate.customerId) {
      alert("Please select a customer.");
      return;
    }

    try {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEstimate),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewModal(false);
        fetchData();
        setSelectedEstimate(data.estimate);
      } else {
        alert(data.error || "Failed to create estimate");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleConvert = async (estimate: Estimate) => {
    if (!confirm(`Convert Quotation ${estimate.estimateNumber} to an official Tax Invoice? This will automatically allocate the next sequential invoice number and post double-entry ledger entries.`)) {
      return;
    }

    setConvertingId(estimate.id);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/convert`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert(`Success! ${data.message}`);
        fetchData();
        if (selectedEstimate?.id === estimate.id) {
          setSelectedEstimate({
            ...selectedEstimate,
            status: "CONVERTED",
            convertedInvoiceId: data.invoice?.id,
          });
        }
      } else {
        alert(data.error || "Failed to convert estimate");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setConvertingId(null);
    }
  };

  const handleAddItem = () => {
    setNewEstimate({
      ...newEstimate,
      items: [
        ...newEstimate.items,
        {
          description: "Roofing Installation & Accessories",
          hsnCode: "9954",
          quantity: 1,
          unit: "Job",
          unitRate: 15000,
          discount: 0,
          gstRate: 18,
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (newEstimate.items.length === 1) return;
    const newItems = newEstimate.items.filter((_, i) => i !== index);
    setNewEstimate({ ...newEstimate, items: newItems });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...newEstimate.items];
    updated[index] = { ...updated[index], [field]: value };
    setNewEstimate({ ...newEstimate, items: updated });
  };

  // Calculations for modal preview
  const calculateModalTotals = () => {
    let sub = 0;
    let tax = 0;
    let totalSq = 0;

    newEstimate.items.forEach((it) => {
      const q = parseFloat(String(it.quantity)) || 0;
      const r = parseFloat(String(it.unitRate)) || 0;
      const d = parseFloat(String(it.discount)) || 0;
      const taxable = Math.max(0, q * r - d);
      const gst = taxable * ((parseFloat(String(it.gstRate)) || 18) / 100);
      sub += taxable;
      tax += gst;
      if (it.unit.toLowerCase().includes("sq")) {
        totalSq += q;
      }
    });

    return {
      subTotal: sub,
      taxTotal: tax,
      grandTotal: sub + tax,
      totalSqFt: totalSq,
    };
  };

  const modalTotals = calculateModalTotals();

  // Metrics
  const totalValue = estimates.reduce((acc, e) => acc + parseFloat(e.totalAmount || "0"), 0);
  const convertedValue = estimates
    .filter((e) => e.status === "CONVERTED")
    .reduce((acc, e) => acc + parseFloat(e.totalAmount || "0"), 0);
  const conversionRate = estimates.length > 0
    ? Math.round((estimates.filter((e) => e.status === "CONVERTED").length / estimates.length) * 100)
    : 0;

  const filteredEstimates = estimates.filter((e) => {
    const matchesSearch =
      e.estimateNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.project?.name && e.project.name.toLowerCase().includes(search.toLowerCase())) ||
      e.roofType.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
              Zoho Books Inspired
            </span>
            <span className="text-xs text-slate-400 font-medium">1-Click Invoice Conversion</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            Quotes & Roofing Estimates
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Professional quotations with Sq.Ft roofing breakdown, GST computation, and instant Tax Invoice generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95"
          >
            <Plus size={16} />
            <span>+ New Quotation</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Quotations</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {estimates.length}
          </div>
          <span className="text-[11px] text-slate-400">Active Pipeline</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Quote Value</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
            ₹ {totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400">Estimated Project Revenue</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Converted to Invoices</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            ₹ {convertedValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Billed into Real AR</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Win / Conversion Rate</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {conversionRate}%
          </div>
          <span className="text-[11px] text-slate-400">Quote-to-Invoice Ratio</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search Quote #, Customer, Roof Type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["ALL", "SENT", "APPROVED", "CONVERTED", "DRAFT"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                statusFilter === st
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Estimates Table / Zoho Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`${selectedEstimate ? "lg:col-span-7" : "lg:col-span-12"} transition-all duration-300`}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Quote #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Roof Type & Area</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Loading quotations...
                      </td>
                    </tr>
                  ) : filteredEstimates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No quotations found. Click "+ New Quotation" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredEstimates.map((est) => {
                      const isSelected = selectedEstimate?.id === est.id;
                      return (
                        <tr
                          key={est.id}
                          onClick={() => setSelectedEstimate(est)}
                          className={`cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                            isSelected ? "bg-blue-50/60 dark:bg-blue-950/20" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {est.estimateNumber}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(est.date).toLocaleDateString("en-IN")}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {est.customer.name}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                              {est.project?.name || "Direct Quotation"}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              {est.roofType} Roof
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {parseFloat(est.totalSqFt).toLocaleString()} Sq.Ft
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            ₹ {parseFloat(est.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                est.status === "CONVERTED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20"
                                  : est.status === "APPROVED"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-500/20"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {est.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {est.status !== "CONVERTED" ? (
                                <button
                                  onClick={() => handleConvert(est)}
                                  disabled={convertingId === est.id}
                                  title="1-Click Convert to Sequential Tax Invoice"
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-sm transition active:scale-95 disabled:opacity-50"
                                >
                                  <Sparkles size={12} />
                                  <span>{convertingId === est.id ? "Converting..." : "Convert"}</span>
                                </button>
                              ) : (
                                <Link
                                  href={`/invoices`}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] hover:underline"
                                >
                                  <CheckCircle2 size={12} />
                                  <span>Invoiced</span>
                                </Link>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedEstimate(est);
                                  setShowPrintModal(true);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                title="Print / A4 Preview"
                              >
                                <Printer size={14} />
                              </button>
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
        </div>

        {/* Master-Detail Zoho Split View Drawer */}
        {selectedEstimate && (
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 flex flex-col justify-between animate-in fade-in slide-in-from-right-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                      {selectedEstimate.estimateNumber}
                    </span>
                    <div className="text-[11px] text-slate-400">
                      Date: {new Date(selectedEstimate.date).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedEstimate.status === "CONVERTED"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                    }`}
                  >
                    {selectedEstimate.status}
                  </span>
                  <button
                    onClick={() => setSelectedEstimate(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Customer Box */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Customer Information</div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedEstimate.customer.name}
                </div>
                {selectedEstimate.customer.companyName && (
                  <div className="text-slate-500">{selectedEstimate.customer.companyName}</div>
                )}
                <div className="text-slate-500">
                  GSTIN: {selectedEstimate.customer.gstNumber || "Unregistered"} • State Code: {selectedEstimate.customer.stateCode}
                </div>
              </div>

              {/* Roofing Project Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] font-semibold text-slate-400">Roofing Profile</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedEstimate.roofType} Roof
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] font-semibold text-slate-400">Roof Area</span>
                  <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                    {parseFloat(selectedEstimate.totalSqFt).toLocaleString()} Sq.Ft
                  </div>
                </div>
              </div>

              {/* Line Items List */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Itemized Bill of Quantities
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedEstimate.items?.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-start"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {it.description}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {it.quantity} {it.unit} × ₹ {it.unitRate} • GST {it.gstRate}%
                        </div>
                      </div>
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-right">
                        ₹ {parseFloat(String(it.totalAmount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5 text-xs font-medium">
                <div className="flex justify-between text-slate-500">
                  <span>Sub Total (Taxable):</span>
                  <span className="font-mono">₹ {parseFloat(selectedEstimate.subTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {parseFloat(selectedEstimate.cgstTotal) > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>CGST (9%):</span>
                    <span className="font-mono">₹ {parseFloat(selectedEstimate.cgstTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {parseFloat(selectedEstimate.sgstTotal) > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>SGST (9%):</span>
                    <span className="font-mono">₹ {parseFloat(selectedEstimate.sgstTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {parseFloat(selectedEstimate.igstTotal) > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>IGST (18%):</span>
                    <span className="font-mono">₹ {parseFloat(selectedEstimate.igstTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 pt-1.5">
                  <span>Quotation Grand Total:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    ₹ {parseFloat(selectedEstimate.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
              >
                <Printer size={14} />
                <span>Print Quotation</span>
              </button>

              {selectedEstimate.status !== "CONVERTED" ? (
                <button
                  onClick={() => handleConvert(selectedEstimate)}
                  disabled={convertingId === selectedEstimate.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  <span>{convertingId === selectedEstimate.id ? "Converting..." : "1-Click Convert to Tax Invoice"}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={16} />
                  <span>Converted to Tax Invoice</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create New Quotation */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 space-y-6 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  + Create Roofing Quotation / Estimate
                </h2>
                <p className="text-xs text-slate-500">
                  Prepare detailed Sq.Ft estimate for roofing fabrication and installation.
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEstimate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Customer *
                  </label>
                  <select
                    value={newEstimate.customerId}
                    onChange={(e) => setNewEstimate({ ...newEstimate, customerId: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.companyName ? `(${c.companyName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Link Project (Optional)
                  </label>
                  <select
                    value={newEstimate.projectId}
                    onChange={(e) => setNewEstimate({ ...newEstimate, projectId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                  >
                    <option value="">-- None (Standalone Quote) --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Roof Type
                  </label>
                  <select
                    value={newEstimate.roofType}
                    onChange={(e) => setNewEstimate({ ...newEstimate, roofType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                  >
                    <option value="PEB">PEB Structural Roofing</option>
                    <option value="Clay Tile">Kerala Clay Tile Roofing</option>
                    <option value="Tensile">Tensile Fabric Roofing</option>
                    <option value="UPVC">UPVC Industrial Sheet</option>
                    <option value="Solar">Solar Rooftop Structure</option>
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Quotation Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {newEstimate.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-12 sm:col-span-4">
                        <label className="text-[10px] text-slate-400 block">Description</label>
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block">Qty (Sq.Ft)</label>
                        <input
                          type="number"
                          step="any"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                          required
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block">Unit Rate (₹)</label>
                        <input
                          type="number"
                          step="any"
                          value={it.unitRate}
                          onChange={(e) => handleItemChange(idx, "unitRate", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                          required
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block">GST %</label>
                        <select
                          value={it.gstRate}
                          onChange={(e) => handleItemChange(idx, "gstRate", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                          <option value="18">18%</option>
                          <option value="12">12%</option>
                          <option value="5">5%</option>
                          <option value="0">0%</option>
                        </select>
                      </div>
                      <div className="col-span-12 sm:col-span-2 flex items-center justify-between pt-3 sm:pt-0">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                          ₹ {((parseFloat(String(it.quantity)) || 0) * (parseFloat(String(it.unitRate)) || 0)).toLocaleString("en-IN")}
                        </span>
                        {newEstimate.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Estimated Area: <span className="font-bold text-slate-900 dark:text-slate-100">{modalTotals.totalSqFt} Sq.Ft</span>
                </span>
                <div className="flex items-center gap-4">
                  <span>Sub Total: <strong className="font-mono">₹ {modalTotals.subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
                  <span>GST: <strong className="font-mono">₹ {modalTotals.taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
                  <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                    Total: <strong className="font-mono">₹ {modalTotals.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
                >
                  Create Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: A4 Print Preview for Quotation */}
      {showPrintModal && selectedEstimate && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full p-8 space-y-6 my-8 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Standard Roofs</h3>
                <p className="text-xs text-slate-500">Perundurai Road, Erode, Tamil Nadu 638011 • GSTIN: 33AAAAA0000A1Z5</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black font-mono text-blue-600">QUOTATION</span>
                <div className="text-xs font-mono font-bold text-slate-700">{selectedEstimate.estimateNumber}</div>
                <div className="text-[11px] text-slate-400">Date: {new Date(selectedEstimate.date).toLocaleDateString("en-IN")}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <span className="font-bold uppercase text-[10px] text-slate-400">Quotation For:</span>
                <div className="font-black text-slate-900 text-sm mt-0.5">{selectedEstimate.customer.name}</div>
                {selectedEstimate.customer.companyName && (
                  <div>{selectedEstimate.customer.companyName}</div>
                )}
                <div>GSTIN: {selectedEstimate.customer.gstNumber || "Unregistered"}</div>
                <div>State: Tamil Nadu (Code: {selectedEstimate.customer.stateCode})</div>
              </div>
              <div className="text-right">
                <span className="font-bold uppercase text-[10px] text-slate-400">Roofing Specifications:</span>
                <div className="font-bold text-slate-800 mt-0.5">{selectedEstimate.roofType} Roofing System</div>
                <div>Total Calculated Area: <strong className="font-mono">{parseFloat(selectedEstimate.totalSqFt).toLocaleString()} Sq.Ft</strong></div>
                <div>Valid Until: {selectedEstimate.expiryDate ? new Date(selectedEstimate.expiryDate).toLocaleDateString("en-IN") : "30 Days"}</div>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead className="bg-slate-100 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">Description & Specs</th>
                  <th className="p-2 border text-center">HSN</th>
                  <th className="p-2 border text-right">Qty</th>
                  <th className="p-2 border text-right">Unit Rate (₹)</th>
                  <th className="p-2 border text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {selectedEstimate.items?.map((it, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 border text-center">{idx + 1}</td>
                    <td className="p-2 border font-medium">{it.description}</td>
                    <td className="p-2 border text-center font-mono">{it.hsnCode || "9954"}</td>
                    <td className="p-2 border text-right font-mono">{it.quantity} {it.unit}</td>
                    <td className="p-2 border text-right font-mono">₹ {parseFloat(String(it.unitRate)).toFixed(2)}</td>
                    <td className="p-2 border text-right font-mono font-bold">₹ {parseFloat(String(it.totalAmount || 0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-start text-xs pt-2">
              <div className="max-w-xs space-y-1">
                <span className="font-bold text-[10px] uppercase text-slate-400">Terms & Conditions:</span>
                <p className="text-[11px] text-slate-600 whitespace-pre-line">{selectedEstimate.terms}</p>
              </div>

              <div className="w-64 space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Sub Total:</span>
                  <span>₹ {parseFloat(selectedEstimate.subTotal).toFixed(2)}</span>
                </div>
                {parseFloat(selectedEstimate.cgstTotal) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (9%):</span>
                    <span>₹ {parseFloat(selectedEstimate.cgstTotal).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(selectedEstimate.sgstTotal) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (9%):</span>
                    <span>₹ {parseFloat(selectedEstimate.sgstTotal).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(selectedEstimate.igstTotal) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST (18%):</span>
                    <span>₹ {parseFloat(selectedEstimate.igstTotal).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm border-t border-slate-300 pt-1 text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-blue-700">₹ {parseFloat(selectedEstimate.totalAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-between items-center text-xs">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Print to A4 / PDF
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
