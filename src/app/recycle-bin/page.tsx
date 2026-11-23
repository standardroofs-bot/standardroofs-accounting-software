"use client";

import React, { useState, useEffect } from "react";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  Filter,
  Users,
  Calendar,
  Clock,
  Palmtree,
  FileText,
  DollarSign,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
} from "lucide-react";

interface RecycleItem {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  subtitle: string | null;
  payloadJson: string;
  deletedBy: string | null;
  deletedAt: string;
}

export default function RecycleBinPage() {
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewPayload, setPreviewPayload] = useState<any | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [purgingId, setPurgingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const url =
        activeCategory === "ALL"
          ? "/api/recycle-bin"
          : `/api/recycle-bin?entityType=${activeCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching recycle bin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeCategory]);

  const handleRestore = async (item: RecycleItem) => {
    if (!confirm(`Are you sure you want to restore "${item.title}" back to its original location?`)) {
      return;
    }
    setRestoringId(item.id);
    try {
      const res = await fetch("/api/recycle-bin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Item successfully restored!");
        fetchItems();
      } else {
        alert(data.error || "Failed to restore item.");
      }
    } catch (err: any) {
      alert("Error restoring item: " + err.message);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteForever = async (item: RecycleItem) => {
    if (
      !confirm(
        `PERMANENT PURGE WARNING:\n"${item.title}" will be permanently erased. This cannot be undone. Continue?`
      )
    ) {
      return;
    }
    setPurgingId(item.id);
    try {
      const res = await fetch(`/api/recycle-bin?id=${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Item permanently deleted.");
        fetchItems();
      } else {
        alert(data.error || "Failed to delete item.");
      }
    } catch (err: any) {
      alert("Error deleting item: " + err.message);
    } finally {
      setPurgingId(null);
    }
  };

  const handlePurgeAll = async () => {
    if (
      !confirm(
        "CAUTION: Are you sure you want to permanently empty the ENTIRE Recycle Bin? All deleted items will be lost forever."
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/recycle-bin?all=true", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Recycle bin emptied successfully.");
        fetchItems();
      } else {
        alert(data.error || "Failed to empty recycle bin.");
      }
    } catch (err: any) {
      alert("Error emptying recycle bin: " + err.message);
    }
  };

  const getEntityBadge = (type: string) => {
    switch (type) {
      case "LEAVE_REQUEST":
        return {
          label: "Leave Request",
          color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
          icon: Calendar,
        };
      case "EMPLOYEE_LABOUR":
        return {
          label: "Personnel / Labour",
          color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200",
          icon: Users,
        };
      case "ATTENDANCE_RECORD":
        return {
          label: "Attendance Record",
          color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
          icon: Clock,
        };
      case "COMPANY_HOLIDAY":
        return {
          label: "Company Holiday",
          color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
          icon: Palmtree,
        };
      case "INVOICE":
        return {
          label: "Invoice",
          color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200",
          icon: FileText,
        };
      case "EXPENSE":
        return {
          label: "Expense",
          color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200",
          icon: DollarSign,
        };
      default:
        return {
          label: type,
          color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
          icon: Trash2,
        };
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      (item.deletedBy && item.deletedBy.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <RotateCcw className="text-emerald-400" size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shadow-xs">
              <Trash2 size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Recycle Bin & Safe Restore Hub
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold font-mono">
                  {items.length} Items
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Non-destructive safeguard: Restore deleted leaves, attendance, personnel, and records back to their exact original location with 1 click.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchItems}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handlePurgeAll}
              className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Trash2 size={13} />
              <span>Empty Recycle Bin</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Category Pills + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
          {[
            { id: "ALL", label: "All Items" },
            { id: "LEAVE_REQUEST", label: "Leave Requests" },
            { id: "EMPLOYEE_LABOUR", label: "Employees & Labours" },
            { id: "ATTENDANCE_RECORD", label: "Attendance Records" },
            { id: "COMPANY_HOLIDAY", label: "Holidays" },
            { id: "INVOICE", label: "Invoices" },
            { id: "EXPENSE", label: "Expenses" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-xs ${
                activeCategory === cat.id
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deleted items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Main Content List / Table */}
      {loading ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading deleted items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Trash2 size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
              Recycle Bin is Clean
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-0.5">
              No deleted items in this category. Any soft-deleted personnel, leaves, or records will appear here safely for 1-click restore.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
          {filteredItems.map((item) => {
            const badge = getEntityBadge(item.entityType);
            const BadgeIcon = badge.icon;
            const isRestoring = restoringId === item.id;
            const isPurging = purgingId === item.id;

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                    <BadgeIcon size={18} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </strong>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {item.subtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {item.subtitle}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>Deleted: {new Date(item.deletedAt).toLocaleString()}</span>
                      {item.deletedBy && <span>&middot; By: {item.deletedBy}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setPreviewPayload(JSON.parse(item.payloadJson));
                      } catch {
                        setPreviewPayload({ raw: item.payloadJson });
                      }
                    }}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs transition cursor-pointer"
                    title="Inspect original JSON"
                  >
                    <Eye size={14} />
                  </button>

                  <button
                    type="button"
                    disabled={isRestoring || isPurging}
                    onClick={() => handleRestore(item)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RotateCcw size={13} className={isRestoring ? "animate-spin" : ""} />
                    <span>{isRestoring ? "Restoring..." : "Restore"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isRestoring || isPurging}
                    onClick={() => handleDeleteForever(item)}
                    className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isPurging ? "Purging..." : "Delete Forever"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: JSON Payload Inspection */}
      {previewPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Eye size={16} className="text-blue-600" />
                Original Record Data Payload
              </h3>
              <button
                type="button"
                onClick={() => setPreviewPayload(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
                title="Close"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[50vh]">
              {JSON.stringify(previewPayload, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPayload(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
