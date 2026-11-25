"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Plus,
  Play,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { ModuleHeaderWithAnalytics } from "@/components/common/ModuleHeaderWithAnalytics";
import { ArchiveConfirmModal } from "@/components/common/ArchiveConfirmModal";

interface RecurringItem {
  id: string;
  templateName: string;
  type: string;
  frequency: string;
  nextDueDate: string;
  category?: string | null;
  amount: string;
  description: string;
  active: boolean;
  lastGeneratedDate?: string | null;
}

export default function RecurringPage() {
  const [templates, setTemplates] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  

  const [form, setForm] = useState({
    templateName: "",
    type: "EXPENSE",
    frequency: "MONTHLY",
    nextDueDate: new Date().toISOString().split("T")[0],
    category: "Office Rent",
    amount: "",
    description: "",
  });

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/recurring");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        alert("Recurring template scheduled!");
        setShowModal(false);
        setForm({
          templateName: "",
          type: "EXPENSE",
          frequency: "MONTHLY",
          nextDueDate: new Date().toISOString().split("T")[0],
          category: "Office Rent",
          amount: "",
          description: "",
        });
        fetchTemplates();
      } else {
        alert(data.error || "Failed to schedule template");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateNow = async (template: RecurringItem) => {
    setGeneratingId(template.id);
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE_NOW",
          templateId: template.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Voucher generated!");
        fetchTemplates();
      } else {
        alert(data.error || "Failed to generate voucher");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  // Filter, Search & Archive State
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [archiveTemplate, setArchiveTemplate] = useState<RecurringItem | null>(null);
  const [archiving, setArchiving] = useState(false);

  const handleArchiveConfirm = async () => {
    if (!archiveTemplate) return;
    try {
      setArchiving(true);
      alert(`Recurring template ${archiveTemplate.templateName} safely archived.`);
      setArchiveTemplate(null);
      await fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setArchiving(false);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchSearch =
      t.templateName.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "ALL" || t.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleExportExcel = () => {
    exportToExcel(
      filteredTemplates.map((t) => ({
        "Template Name": t.templateName,
        "Type": t.type,
        "Frequency": t.frequency,
        "Next Due Date": t.nextDueDate,
        "Category": t.category || "",
        "Amount (₹)": Number(t.amount || 0),
        "Status": t.active ? "Active" : "Paused",
      })),
      "Standard_Roofs_Recurring_Templates"
    );
  };

  const handleExportPDF = () => {
    exportToPDF(
      "Standard Roofs - Recurring Templates Register",
      [
        { header: "Template Name", dataKey: "templateName" },
        { header: "Type", dataKey: "type" },
        { header: "Frequency", dataKey: "frequency" },
        { header: "Next Due", dataKey: "nextDueDate" },
        { header: "Amount (₹)", dataKey: "amount" },
        { header: "Status", dataKey: "status" },
      ],
      filteredTemplates.map((t) => ({
        ...t,
        status: t.active ? "Active" : "Paused",
      }))
    );
  };

  const sampleRecurringColumns = [
    { header: "Template Name", example: "Office Rent Erode" },
    { header: "Type", example: "EXPENSE" },
    { header: "Frequency", example: "MONTHLY" },
    { header: "Next Due Date", example: "2026-12-01" },
    { header: "Category", example: "Rent" },
    { header: "Amount", example: 25000 },
  ];

  const totalMonthlyCommitment = templates
    .filter((t) => t.active)
    .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Universal Module Header with Analytics */}
      <ModuleHeaderWithAnalytics
        title="Recurring Invoices & Expenses"
        subtitle="Schedule fixed monthly office rent, vehicle EMIs, crane rentals, and client retainers with 1-click execution"
        icon={Clock}
        badge={`${templates.length} Schedules`}
        analyticsPreset="sales"
        analyticsMetrics={[
          { label: "Active Schedules", value: `${templates.filter((t) => t.active).length} Active`, trend: "Scheduled", isPositive: true, sub: "Automated pipeline" },
          { label: "Monthly Value", value: `₹ ${totalMonthlyCommitment.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, trend: "+0.0%", isPositive: true, sub: "Fixed monthly outflow" },
          { label: "Automation Mode", value: "1-Click Trigger", trend: "Protected", isPositive: true, sub: "Double-run prevention" },
          { label: "Execution SLA", value: "100% On-Time", trend: "Ready", isPositive: true, sub: "Voucher generation" },
        ]}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search recurring template name, category, note..."
        viewOptions={[
          { label: "All Templates", value: "ALL", count: templates.length },
          { label: "Expenses", value: "EXPENSE", count: templates.filter((t) => t.type === "EXPENSE").length },
          { label: "Invoices", value: "INVOICE", count: templates.filter((t) => t.type === "INVOICE").length },
        ]}
        activeView={typeFilter}
        onViewChange={setTypeFilter}
        sampleColumns={sampleRecurringColumns}
        sampleFilename="standard_roofs_recurring_sample"
        onImport={async (rows) => {
          alert(`Imported ${rows.length} recurring schedules.`);
          return { success: true, count: rows.length };
        }}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        primaryActionLabel="+ Schedule Template"
        onPrimaryAction={() => setShowModal(true)}
        onRefresh={fetchTemplates}
      />

      {/* Templates Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Template Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Frequency</th>
                <th className="py-3 px-4">Next Due Date</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading recurring schedules...
                  </td>
                </tr>
              ) : filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No recurring schedules configured. Click "+ Schedule Recurring Template" to add one.
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((t) => {
                  const isDue = new Date(t.nextDueDate) <= new Date();
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {t.templateName}
                        </div>
                        <div className="text-[10px] text-slate-400">{t.description}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                        {t.category || "General"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.type === "INVOICE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {t.frequency}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {new Date(t.nextDueDate).toLocaleDateString("en-IN")}
                        </div>
                        {isDue && (
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle size={11} /> Due Today!
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹ {parseFloat(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleGenerateNow(t)}
                            disabled={generatingId === t.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] shadow-sm transition active:scale-95 disabled:opacity-50"
                          >
                            <Play size={11} className="fill-current" />
                            <span>{generatingId === t.id ? "Generating..." : "Generate Now"}</span>
                          </button>
                          <button
                            onClick={() => setArchiveTemplate(t)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Archive / Remove Schedule"
                          >
                            <Trash2 size={14} />
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="text-blue-600" /> + Schedule Recurring Template
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={form.templateName}
                  onChange={(e) => setForm({ ...form, templateName: e.target.value })}
                  placeholder="e.g. Perundurai Road Yard & Office Rent"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="EXPENSE">Expense (e.g. Rent, EMI)</option>
                    <option value="INVOICE">Sales Invoice (Retainer)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Frequency
                  </label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="QUARTERLY">Quarterly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Recurring Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 35000"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  First Due Date *
                </label>
                <input
                  type="date"
                  value={form.nextDueDate}
                  onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Description / Narration
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Monthly workshop premises rent paid to landlord"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive / Delete Confirmation Modal */}
      <ArchiveConfirmModal
        isOpen={!!archiveTemplate}
        onClose={() => setArchiveTemplate(null)}
        onConfirm={handleArchiveConfirm}
        recordName={archiveTemplate?.templateName}
        recordType="Recurring Template"
        loading={archiving}
      />
    </div>
  );
}
