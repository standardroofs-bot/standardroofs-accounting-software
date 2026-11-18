"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Receipt,
  HardHat,
  ArrowRight,
  FileSpreadsheet,
  Building,
  User,
  Calendar,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    pendingExpenses: any[];
    pendingMilestones: any[];
    pendingReversals: any[];
    totalPending: number;
  }>({
    pendingExpenses: [],
    pendingMilestones: [],
    pendingReversals: [],
    totalPending: 0,
  });

  const [activeTab, setActiveTab] = useState<"expenses" | "milestones" | "reversals">("expenses");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function loadApprovals() {
    try {
      setLoading(true);
      const res = await fetch("/api/approvals");
      const json = await res.json();
      if (json.success) {
        setData({
          pendingExpenses: json.pendingExpenses || [],
          pendingMilestones: json.pendingMilestones || [],
          pendingReversals: json.pendingReversals || [],
          totalPending: json.totalPending || 0,
        });
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApprovals();
  }, []);

  async function handleAction(type: "EXPENSE" | "MILESTONE" | "REVERSAL", id: string, action: "APPROVE" | "REJECT") {
    try {
      setProcessingId(id);
      setMessage(null);
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, action }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: json.message || `Action ${action} executed successfully.`, type: "success" });
        loadApprovals();
      } else {
        setMessage({ text: json.error || "Failed to process request.", type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: e.message || "Network error occurred.", type: "error" });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Approvals Center</h1>
              <p className="text-sm text-slate-500">
                Authorized queue for site expenses, contractor milestone payouts, and voucher reversals
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            {data.totalPending} Pending Approval
          </span>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("expenses")}
          className={`px-5 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "expenses"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Site & Travel Expenses
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
            {data.pendingExpenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("milestones")}
          className={`px-5 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "milestones"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <HardHat className="w-4 h-4" />
          Contractor Milestones
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
            {data.pendingMilestones.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("reversals")}
          className={`px-5 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "reversals"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Journal Reversals
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
            {data.pendingReversals.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Site Expenses */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading pending expenses...</div>
          ) : data.pendingExpenses.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">All Expenses Clear</h3>
              <p className="text-sm text-slate-500 mt-1">There are no pending site or employee expense claims waiting for approval.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.pendingExpenses.map((exp) => (
                <div key={exp.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
                        {exp.account?.name || "Expense"}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-1.5">{exp.purpose}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">{formatINR(exp.amount)}</span>
                      <div className="text-xs text-slate-400">via {exp.paymentMode}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                    {exp.project && (
                      <div>
                        <span className="text-slate-400">Project:</span> {exp.project.name}
                      </div>
                    )}
                    {exp.employee && (
                      <div>
                        <span className="text-slate-400">Employee:</span> {exp.employee.name}
                      </div>
                    )}
                    {exp.supplier && (
                      <div>
                        <span className="text-slate-400">Vendor:</span> {exp.supplier.name}
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Date:</span> {new Date(exp.date).toLocaleDateString("en-IN")}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleAction("EXPENSE", exp.id, "REJECT")}
                      disabled={processingId === exp.id}
                      className="px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction("EXPENSE", exp.id, "APPROVE")}
                      disabled={processingId === exp.id}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Post Double-Entry
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Contractor Milestones */}
      {activeTab === "milestones" && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading pending milestones...</div>
          ) : data.pendingMilestones.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">All Contractor Milestones Clear</h3>
              <p className="text-sm text-slate-500 mt-1">There are no pending contractor work-stage bills waiting for approval.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.pendingMilestones.map((ms) => (
                <div key={ms.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700">
                        {ms.milestoneType} ({ms.milestonePercentage}%)
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-1.5">{ms.contractor?.name}</h4>
                      <div className="text-xs text-slate-500">{ms.project?.name}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">{formatINR(ms.netPayable)}</span>
                      <div className="text-xs text-slate-400">Gross: {formatINR(ms.milestoneAmount)}</div>
                      <div className="text-xs text-red-500">TDS: {formatINR(ms.tdsAmount)}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">{ms.workStageDescription}</p>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleAction("MILESTONE", ms.id, "REJECT")}
                      disabled={processingId === ms.id}
                      className="px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction("MILESTONE", ms.id, "APPROVE")}
                      disabled={processingId === ms.id}
                      className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Post Bill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Reversals */}
      {activeTab === "reversals" && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading pending reversals...</div>
          ) : data.pendingReversals.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">No Pending Reversals</h3>
              <p className="text-sm text-slate-500 mt-1">There are no draft journal reversals awaiting review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.pendingReversals.map((rev) => (
                <div key={rev.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700">
                        {rev.entryNumber}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-1.5">{rev.narration}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">{formatINR(rev.totalDebit)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleAction("REVERSAL", rev.id, "REJECT")}
                      disabled={processingId === rev.id}
                      className="px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction("REVERSAL", rev.id, "APPROVE")}
                      disabled={processingId === rev.id}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Authorize Reversal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
