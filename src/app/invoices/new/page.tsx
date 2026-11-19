"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Plus,
  Trash2,
  Building,
  Calendar,
  AlertCircle,
  FileCheck,
  ArrowLeft,
  Truck,
  Sparkles,
  MapPin,
  Clock,
  CheckSquare,
  Square,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { formatINR, numberToWordsINR } from "@/lib/decimal";
import {
  COMMON_ROOFING_HSN_SAC,
  COMPANY_GST_STATE_CODE,
  INDIAN_STATES_LIST,
  INVOICE_PAYMENT_TERMS,
} from "@/lib/gst";
import ItemAutocompletePicker, { CatalogItemOption } from "@/components/common/ItemAutocompletePicker";

interface CustomerOption {
  id: string;
  name: string;
  companyName: string | null;
  gstNumber: string | null;
  state: string;
  stateCode: string;
  billingAddress: string;
  shippingAddress: string | null;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
  customerId: string;
}

interface InvoiceLineItem {
  description: string;
  subDescription: string;
  hsnSacCode: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
}

export default function NewInvoicePage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextInvoiceNo, setNextInvoiceNo] = useState<number>(33);

  // Form Fields
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [invoiceType, setInvoiceType] = useState("TAX_INVOICE");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [terms, setTerms] = useState("Due on Receipt");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState("33");
  const [placeOfSupplyState, setPlaceOfSupplyState] = useState("Tamil Nadu");

  // Address fields
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Notes & terms
  const [notes, setNotes] = useState("");
  const [customTerms, setCustomTerms] = useState(
    "E.& O.E.\n1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if the payment is not made with in the stipulated time.\n3. Subject to 'Tamilnadu' Jurisdiction only."
  );

  // Round-off adjustment
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [manualAdjustment, setManualAdjustment] = useState<string>("0.00");

  const [lines, setLines] = useState<InvoiceLineItem[]>([
    {
      description: "5x4\"G.I.(B.P)B/W REDUCER-E.R.W-C-CLASS",
      subDescription: "",
      hsnSacCode: "730793",
      unit: "nos",
      quantity: 5,
      unitPrice: 485.3,
      discount: 0,
      gstRate: 18,
    },
    {
      description: "WELDED LINK CHAIN",
      subDescription: "40ft-Chain Length",
      hsnSacCode: "73158200",
      unit: "ft",
      quantity: 40,
      unitPrice: 89.3,
      discount: 0,
      gstRate: 18,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cRes, pRes, sRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/projects"),
          fetch("/api/settings"),
        ]);
        const cData = await cRes.json();
        const pData = await pRes.json();
        const sData = await sRes.json();

        if (cData.success && cData.customers) {
          setCustomers(cData.customers);
          if (cData.customers.length > 0) {
            const first = cData.customers[0];
            setCustomerId(first.id);
            setBillingAddress(first.billingAddress || "");
            setShippingAddress(first.shippingAddress || first.billingAddress || "");
            setPlaceOfSupplyStateCode(first.stateCode || "33");
            const foundState = INDIAN_STATES_LIST.find((s) => s.code === (first.stateCode || "33"));
            setPlaceOfSupplyState(foundState ? foundState.name : "Tamil Nadu");
          }
        }
        if (pData.success && pData.projects) {
          setProjects(pData.projects);
        }
        if (sData.success && sData.settings) {
          const lastNum = sData.settings.lastInvoiceNumber || 32;
          setNextInvoiceNo(lastNum + 1);
        }
      } catch (err) {
        console.error("Failed to load invoice dependencies:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update customer details when customer selection changes
  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const selected = customers.find((c) => c.id === id);
    if (selected) {
      setBillingAddress(selected.billingAddress || "");
      if (sameAsBilling) {
        setShippingAddress(selected.shippingAddress || selected.billingAddress || "");
      }
      setPlaceOfSupplyStateCode(selected.stateCode || "33");
      const foundState = INDIAN_STATES_LIST.find((s) => s.code === (selected.stateCode || "33"));
      setPlaceOfSupplyState(foundState ? foundState.name : "Tamil Nadu");
    }
  };

  // Recalculate Due Date when Invoice Date or Terms changes
  useEffect(() => {
    if (!date) return;
    const baseDate = new Date(date);
    let daysToAdd = 0;
    if (terms === "Due on Receipt") daysToAdd = 0;
    else if (terms === "Net 15") daysToAdd = 15;
    else if (terms === "Net 30") daysToAdd = 30;
    else if (terms === "Net 45") daysToAdd = 45;
    else if (terms === "Net 60") daysToAdd = 60;

    const due = new Date(baseDate.getTime() + daysToAdd * 86400000);
    setDueDate(due.toISOString().split("T")[0]);
  }, [date, terms]);

  // Handle Place of Supply change
  const handlePlaceOfSupplyChange = (code: string) => {
    setPlaceOfSupplyStateCode(code);
    const found = INDIAN_STATES_LIST.find((s) => s.code === code);
    if (found) {
      setPlaceOfSupplyState(found.name);
    }
  };

  const isInterState = placeOfSupplyStateCode !== COMPANY_GST_STATE_CODE;

  // Real-time calculations
  let subTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const calculatedLines = lines.map((l) => {
    const gross = (l.quantity || 0) * (l.unitPrice || 0);
    const taxable = Math.max(0, gross - (l.discount || 0));
    const rate = l.gstRate || 0;
    const taxAmount = (taxable * rate) / 100;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = taxAmount;
    } else {
      cgst = taxAmount / 2;
      sgst = taxAmount / 2;
    }

    const total = taxable + taxAmount;
    subTotal += taxable;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;

    return {
      ...l,
      taxable,
      cgst,
      sgst,
      igst,
      total,
    };
  });

  const unadjustedTotal = subTotal + cgstTotal + sgstTotal + igstTotal;

  // Auto round-off calculation
  let adjustment = 0;
  if (autoRoundOff) {
    const rounded = Math.round(unadjustedTotal);
    adjustment = Number((rounded - unadjustedTotal).toFixed(2));
  } else {
    adjustment = parseFloat(manualAdjustment) || 0;
  }

  const grandTotal = Number((unadjustedTotal + adjustment).toFixed(2));

  const addLine = () => {
    setLines([
      ...lines,
      {
        description: "",
        subDescription: "",
        hsnSacCode: "7306",
        unit: "nos",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        gstRate: 18,
      },
    ]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof InvoiceLineItem, val: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };
    setLines(updated);
  };

  const handleSelectItemFromPicker = (idx: number, item: CatalogItemOption) => {
    const updated = [...lines];
    const rate = typeof item.defaultRate === "number" ? item.defaultRate : parseFloat(item.defaultRate) || 0;
    const gst = typeof item.gstRate === "number" ? item.gstRate : parseFloat(item.gstRate) || 18;

    updated[idx] = {
      ...updated[idx],
      description: item.name,
      hsnSacCode: item.hsnSacCode || "7306",
      unit: item.unit || "nos",
      unitPrice: rate,
      gstRate: gst,
    };
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setErrorMsg("Please select a customer.");
      return;
    }
    if (lines.some((l) => !l.description.trim())) {
      setErrorMsg("All line items must have a valid item description.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          projectId: projectId || null,
          invoiceType,
          date,
          dueDate: dueDate || null,
          terms,
          notes,
          shippingAddress: sameAsBilling ? billingAddress : shippingAddress,
          placeOfSupply: placeOfSupplyState,
          placeOfSupplyStateCode: placeOfSupplyStateCode,
          adjustment,
          items: lines,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/invoices/${data.invoice.id}`);
      } else {
        setErrorMsg(data.error || "Failed to create invoice");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error while saving invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/invoices"
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Back to Invoices"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="text-blue-600" />
              New Tax Invoice
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Exact Zoho Books Tax Invoice format continuing seamlessly from Invoice #32.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-mono text-blue-700 dark:text-blue-300">
            Next Invoice: <strong className="font-bold">#{nextInvoiceNo}</strong> (SR/26-27/{String(nextInvoiceNo).padStart(4, "0")})
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Document Master Box */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Customer Dropdown */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building size={14} className="text-blue-600" />
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                required
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold focus:ring-1 focus:ring-blue-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName ? `(${c.companyName})` : ""} — {c.state}
                  </option>
                ))}
              </select>
            </div>

            {/* Project/Site Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-600" />
                Linked Project / Site (Optional)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- General Billing (No Project) --</option>
                {projects
                  .filter((p) => !customerId || p.customerId === customerId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Invoice Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Invoice #
              </label>
              <input
                type="text"
                disabled
                value={`SR/26-27/${String(nextInvoiceNo).padStart(4, "0")} (#${nextInvoiceNo})`}
                className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 px-3 py-2 text-slate-700 dark:text-slate-300 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Metadata Split Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {/* Invoice Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                Invoice Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            {/* Terms */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                Terms
              </label>
              <select
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold"
              >
                {INVOICE_PAYMENT_TERMS.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            {/* Place of Supply */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Place Of Supply</span>
                <span className="text-[10px] text-blue-600 font-mono">
                  {isInterState ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)"}
                </span>
              </label>
              <select
                value={placeOfSupplyStateCode}
                onChange={(e) => handlePlaceOfSupplyChange(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold"
              >
                {INDIAN_STATES_LIST.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Separate Bill To & Ship To Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {/* Bill To */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                  Bill To (Customer Address)
                </label>
                {selectedCustomer?.gstNumber && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    GSTIN: {selectedCustomer.gstNumber}
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={billingAddress}
                onChange={(e) => {
                  setBillingAddress(e.target.value);
                  if (sameAsBilling) setShippingAddress(e.target.value);
                }}
                placeholder="Customer Billing Address..."
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-slate-100 leading-relaxed font-sans focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Ship To */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Ship To (Delivery / Site Address)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !sameAsBilling;
                    setSameAsBilling(nextVal);
                    if (nextVal) setShippingAddress(billingAddress);
                  }}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  {sameAsBilling ? (
                    <CheckSquare size={14} className="text-blue-600" />
                  ) : (
                    <Square size={14} className="text-slate-400" />
                  )}
                  <span>Same as Billing Address</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={sameAsBilling ? billingAddress : shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                disabled={sameAsBilling}
                placeholder="Site delivery address..."
                className={`w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 leading-relaxed font-sans ${
                  sameAsBilling
                    ? "bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed"
                    : "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Line Items Table with 290-Item Autocomplete */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Item & Works Details (290-Item Smart Picker)
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold text-xs transition"
            >
              <Plus size={14} /> Add Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/40">
                  <th className="py-2.5 px-2 w-8 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[320px]">Item & Description (Searchable)</th>
                  <th className="py-2.5 px-2 w-24 text-center">HSN/SAC</th>
                  <th className="py-2.5 px-2 w-24 text-right">Qty</th>
                  <th className="py-2.5 px-2 w-20 text-center">Unit</th>
                  <th className="py-2.5 px-2 w-28 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-2 w-20 text-center">GST %</th>
                  <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-2 w-8 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {calculatedLines.map((line, idx) => (
                  <tr key={idx} className="align-top group hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                    <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>

                    {/* Autocomplete Picker */}
                    <td className="py-2 px-3">
                      <ItemAutocompletePicker
                        value={line.description}
                        onChange={(val) => updateLine(idx, "description", val)}
                        subDescriptionValue={line.subDescription}
                        onChangeSubDescription={(val) => updateLine(idx, "subDescription", val)}
                        onSelectItem={(item) => handleSelectItemFromPicker(idx, item)}
                        placeholder="Search items (e.g., TATA SDS, MS PIPE, REDUCER, TILES, CHAIN)..."
                      />
                    </td>

                    {/* HSN/SAC */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={line.hsnSacCode}
                        onChange={(e) => updateLine(idx, "hsnSacCode", e.target.value)}
                        className="w-full text-center text-xs font-mono font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 text-slate-800 dark:text-slate-200"
                      />
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-full text-right text-xs font-mono font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 px-2 text-slate-800 dark:text-slate-200"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={line.unit}
                        onChange={(e) => updateLine(idx, "unit", e.target.value)}
                        className="w-full text-center text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 text-slate-800 dark:text-slate-200"
                      />
                    </td>

                    {/* Rate */}
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-full text-right text-xs font-mono font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 px-2 text-slate-800 dark:text-slate-200"
                      />
                    </td>

                    {/* GST Rate */}
                    <td className="py-2 px-2">
                      <select
                        value={line.gstRate}
                        onChange={(e) => updateLine(idx, "gstRate", parseFloat(e.target.value))}
                        className="w-full text-center text-xs font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 text-slate-800 dark:text-slate-200"
                      >
                        <option value="18">18%</option>
                        <option value="12">12%</option>
                        <option value="5">5%</option>
                        <option value="0">0%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>

                    {/* Total Amount */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ₹{line.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Remove Row */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length <= 1}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Split Grid: Terms/Bank vs Totals & Round-Off */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          {/* Left: Terms & Conditions */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Terms & Conditions (Printed on Invoice)
              </label>
              <textarea
                rows={5}
                value={customTerms}
                onChange={(e) => setCustomTerms(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-200 font-sans leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Customer Notes / Special Instructions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Thanks for your business..."
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg text-xs space-y-1">
              <span className="font-bold text-blue-900 dark:text-blue-300 block">
                Standard Roofs ICICI Bank Details:
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                A/C No: <strong className="font-mono text-slate-900 dark:text-slate-200">155205003161</strong> | IFSC: <strong className="font-mono text-slate-900 dark:text-slate-200">ICIC0001552</strong>
                <br />
                Branch: Erode, Tamil Nadu | Account Name: Standard Roofs
              </p>
            </div>
          </div>

          {/* Right: Totals with Auto Round-Off Adjustment */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
            <div className="flex justify-between py-2 px-3 text-slate-600 dark:text-slate-400">
              <span className="font-sans">Sub Total:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                ₹{subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between py-2 px-3 text-slate-600 dark:text-slate-400">
              <span className="font-sans">Total Taxable Amount:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                ₹{subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {isInterState ? (
              <div className="flex justify-between py-2 px-3 text-slate-600 dark:text-slate-400">
                <span className="font-sans">IGST18 (18%):</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  ₹{igstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between py-2 px-3 text-slate-600 dark:text-slate-400">
                  <span className="font-sans">CGST9 (9%):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    ₹{cgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2 px-3 text-slate-600 dark:text-slate-400">
                  <span className="font-sans">SGST9 (9%):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    ₹{sgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}

            {/* Round-Off Adjustment Row */}
            <div className="py-2.5 px-3 bg-slate-50 dark:bg-slate-950/50 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-sans font-semibold text-slate-700 dark:text-slate-300">
                    Adjustment (+/-):
                  </span>
                  <label className="flex items-center gap-1 text-[11px] font-sans text-blue-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRoundOff}
                      onChange={(e) => setAutoRoundOff(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Auto Round-Off</span>
                  </label>
                </div>

                {autoRoundOff ? (
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {adjustment < 0 ? `(-) ₹${Math.abs(adjustment).toFixed(2)}` : adjustment > 0 ? `(+) ₹${adjustment.toFixed(2)}` : "₹0.00"}
                  </span>
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    value={manualAdjustment}
                    onChange={(e) => setManualAdjustment(e.target.value)}
                    className="w-24 text-right text-xs font-mono font-bold border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 bg-white dark:bg-slate-900"
                  />
                )}
              </div>
            </div>

            {/* Final Grand Total */}
            <div className="flex justify-between py-3 px-3 bg-slate-100 dark:bg-slate-800 text-base font-black text-slate-900 dark:text-white">
              <span className="font-sans">Total ₹:</span>
              <span className="text-blue-700 dark:text-blue-400">
                ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Balance Due */}
            <div className="flex justify-between py-2.5 px-3 bg-blue-50/50 dark:bg-blue-950/20 text-sm font-bold text-slate-900 dark:text-slate-100">
              <span className="font-sans">Balance Due:</span>
              <span className="text-slate-900 dark:text-slate-100">
                ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Amount in words */}
            <div className="p-3 bg-white dark:bg-slate-900 text-[11px] font-sans italic text-slate-600 dark:text-slate-400">
              <strong className="not-italic text-slate-800 dark:text-slate-200">Total In Words:</strong>
              <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Indian Rupee {numberToWordsINR(grandTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/invoices"
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
          >
            <FileCheck size={16} />
            {submitting ? "Generating Invoice..." : "Save & View Tax Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
