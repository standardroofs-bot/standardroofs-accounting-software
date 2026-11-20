"use client";

import { useState } from "react";
import { ShieldCheck, History, User } from "lucide-react";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

interface AuditLogItem {
  id: string;
  createdAt: Date | string;
  action: string;
  entityType: string;
  performedBy: {
    name: string;
    role: string;
  };
  newValues: string | null;
}

export default function AuditClient({ initialLogs }: { initialLogs: any[] }) {
  const [logs] = useState<AuditLogItem[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const handleExportExcel = () => {
    const exportData = filteredLogs.map((l) => ({
      Timestamp: new Date(l.createdAt).toLocaleString("en-IN"),
      Action: l.action,
      Entity: l.entityType,
      "Performed By": `${l.performedBy.name} (${l.performedBy.role})`,
      Details: l.newValues || "-",
    }));
    exportToExcel(exportData, "audit_trail");
  };

  const handleExportPDF = () => {
    const printRows = filteredLogs.map((l) => [
      new Date(l.createdAt).toLocaleString("en-IN"),
      l.action,
      l.entityType,
      l.performedBy.name,
      (l.newValues || "-").slice(0, 40),
    ]);
    exportToPDF("Statutory Audit Trail & Compliance", ["Timestamp", "Action", "Entity", "User", "Details"], printRows, "audit_trail");
  };

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q) ||
      log.performedBy.name.toLowerCase().includes(q) ||
      (log.newValues && log.newValues.toLowerCase().includes(q));
    return matchesAction && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <ModuleHeaderWithAnalytics
        title="Audit Trail & Statutory Compliance"
        subtitle="Immutable event tracking for Indian Accounting Standards & statutory audit readiness"
        badge="Zero-Tamper Log"
        icon={ShieldCheck}
        analyticsPreset="parties"
        analyticsCards={[
          {
            label: "Total Events Logged",
            value: logs.length.toString(),
            change: "All audit records",
            isPositive: true,
          },
          {
            label: "Double-Entry Posts",
            value: logs.filter((l) => l.action === "POST").length.toString(),
            change: "General ledger entries",
            isPositive: true,
          },
          {
            label: "Entity Reversals",
            value: logs.filter((l) => l.action === "REVERSAL").length.toString(),
            change: "Audited ledger rollbacks",
            isPositive: false,
          },
          {
            label: "Compliance Status",
            value: "100% Locked",
            change: "Statutory verified",
            isPositive: true,
          },
        ]}
        searchPlaceholder="Search action, entity, user, or change details..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        views={[
          { id: "ALL", label: "All Events", count: logs.length },
          { id: "POST", label: "Posts", count: logs.filter((l) => l.action === "POST").length },
          { id: "UPDATE", label: "Updates", count: logs.filter((l) => l.action === "UPDATE").length },
          { id: "REVERSAL", label: "Reversals", count: logs.filter((l) => l.action === "REVERSAL").length },
        ]}
        selectedView={actionFilter}
        onViewChange={setActionFilter}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Performed By</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No audit records found matching filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.action === "POST"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : log.action === "REVERSAL"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      {log.entityType}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold">{log.performedBy.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.performedBy.role}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-md truncate font-mono text-[11px] text-slate-500">
                      {log.newValues || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
