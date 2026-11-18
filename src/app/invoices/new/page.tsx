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
} from "lucide-react";
import Link from "next/link";
import { formatINR, numberToWordsINR } from "@/lib/decimal";
import { COMMON_ROOFING_HSN_SAC, COMPANY_GST_STATE_CODE } from "@/lib/gst";

interface CustomerOption {
  id: string;
  name: string;
  companyName: string | null;
  gstNumber: string | null;
  state: string;
  stateCode: string;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
  customerId: string;
}

interface InvoiceLineItem {
  description: string;
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

  // Form Fields
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [invoiceType, setInvoiceType] = useState("TAX_INVOICE");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    "1. Payment due within agreed credit days. 2. Goods once sold cannot be taken back. 3. Subject to Erode Jurisdiction."
  );

  const [lines, setLines] = useState<InvoiceLineItem[]>([
    {
      description: "Supply and fixing of Pre-Engineered Building (PEB) Structural Roofing Shed",
      hsnSacCode: "9954",
      unit: "SQFT",
      quantity: 1000,
      unitPrice: 180,
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
        const [cRes, pRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/projects"),
        ]);
        const cData = await cRes.json();
        const pData = await pRes.json();

        if (cData.success) {
          setCustomers(cData.customers);
          if (cData.customers.length > 0) {
            setCustomerId(cData.customers[0].id);
          }
        }
        if (pData.success) {
          setProjects(pData.projects);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const isInterState = selectedCustomer ? selectedCustomer.stateCode !== COMPANY_GST_STATE_CODE : false;

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

  const grandTotal = subTotal + cgstTotal + sgstTotal + igstTotal;

  const addLine = () => {
    setLines([
      ...lines,
      {
        description: "",
        hsnSacCode: "9954",
        unit: "SQFT",
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

  const handleSelectHsn = (idx: number, hsn: string) => {
    const found = COMMON_ROOFING_HSN_SAC.find((h) => h.code === hsn);
    const updated = [...lines];
    updated[idx] = {
      ...updated[idx],
      hsnSacCode: hsn,
      gstRate: found ? found.rate : 18,
      unit: found ? found.defaultUnit : "SQFT",
      description: updated[idx].description || (found ? found.description : ""),
    };
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setErrorMsg("Please select a customer.");
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
          notes,
          terms,
          items: lines,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/invoices/${data.invoice.id}/print`);
      } else {
        setErrorMsg(data.error || "Failed to create invoice");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="text-blue-600" /> Create GST Tax Invoice
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Sequence #33 (Next continuous numbering after existing 32 physical invoices)
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Document Metadata Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Document Type</label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-blue-600"
              >
                <option value="TAX_INVOICE">Tax Invoice (Standard)</option>
                <option value="PROFORMA_INVOICE">Proforma Invoice</option>
                <option value="ADVANCE_INVOICE">Advance Invoice</option>
                <option value="FINAL_INVOICE">Final Completion Invoice</option>
                <option value="CREDIT_NOTE">Credit Note</option>
                <option value="DEBIT_NOTE">Debit Note</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Customer *</label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName ? `(${c.companyName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Link Project (Optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">None (General Billing)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Invoice Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {selectedCustomer && (
            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-[11px]">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedCustomer.name}</span>
                <span className="text-slate-500 ml-2">
                  GSTIN: <strong className="font-mono">{selectedCustomer.gstNumber || "Unregistered"}</strong>
                </span>
                <span className="text-slate-500 ml-2">
                  State: <strong>{selectedCustomer.state} ({selectedCustomer.stateCode})</strong>
                </span>
              </div>
              <span className="font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                {isInterState ? "Inter-State (IGST 18%)" : "Intra-State (CGST 9% + SGST 9%)"}
              </span>
            </div>
          )}
        </div>

        {/* Line Items Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Works Contract & Roofing Line Items
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="text-xs text-blue-600 font-bold hover:text-blue-700 flex items-center gap-1"
            >
              <Plus size={14} /> + Add Line Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Item / Service Description</th>
                  <th className="py-2.5 px-3 w-32">HSN/SAC</th>
                  <th className="py-2.5 px-3 w-20">Unit</th>
                  <th className="py-2.5 px-3 w-24">Qty</th>
                  <th className="py-2.5 px-3 w-28">Rate (₹)</th>
                  <th className="py-2.5 px-3 w-24">Disc (₹)</th>
                  <th className="py-2.5 px-3 w-20">GST %</th>
                  <th className="py-2.5 px-3 text-right w-28">Taxable (₹)</th>
                  <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                  <th className="py-2.5 px-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lines.map((line, idx) => {
                  const calc = calculatedLines[idx];
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          required
                          placeholder="Description of roofing work, sheets, structure..."
                          value={line.description}
                          onChange={(e) => updateLine(idx, "description", e.target.value)}
                          className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={line.hsnSacCode}
                          onChange={(e) => handleSelectHsn(idx, e.target.value)}
                          className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                        >
                          {COMMON_ROOFING_HSN_SAC.map((h) => (
                            <option key={h.code} value={h.code}>
                              {h.code} ({h.rate}%)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={line.unit}
                          onChange={(e) => updateLine(idx, "unit", e.target.value)}
                          className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                        >
                          <option value="SQFT">SQFT</option>
                          <option value="RFT">RFT</option>
                          <option value="MT">MT (Ton)</option>
                          <option value="NOS">NOS</option>
                          <option value="LOT">LOT</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 text-right font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={line.unitPrice}
                          onChange={(e) => updateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 text-right font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={line.discount}
                          onChange={(e) => updateLine(idx, "discount", parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 text-right font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={line.gstRate}
                          onChange={(e) => updateLine(idx, "gstRate", parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatINR(calc?.taxable || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(calc?.total || 0)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Customer Notes</label>
              <textarea
                rows={2}
                placeholder="Thanks for your business..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Terms & Conditions</label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Tax Breakdown & Grand Total Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 font-mono text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal (Taxable Value):</span>
              <span className="font-bold">{formatINR(subTotal)}</span>
            </div>

            {isInterState ? (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Integrated GST (IGST 18%):</span>
                <span className="font-bold">{formatINR(igstTotal)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Central GST (CGST 9%):</span>
                  <span className="font-bold">{formatINR(cgstTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>State GST (SGST 9%):</span>
                  <span className="font-bold">{formatINR(sgstTotal)}</span>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-base font-black text-slate-900 dark:text-slate-100">
              <span>Total Invoice Amount:</span>
              <span className="text-blue-600 dark:text-blue-400">{formatINR(grandTotal)}</span>
            </div>

            <div className="text-[11px] font-sans text-slate-500 pt-1">
              <strong>Amount in Words:</strong> {numberToWordsINR(grandTotal)}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link
            href="/invoices"
            className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-bold"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <FileCheck size={16} />
            {submitting ? "Posting to General Ledger..." : "Save & Post Tax Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
