"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  HardHat,
  Plus,
  Edit3,
  Trash2,
  Search,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  X,
  Wrench,
  Wallet,
  Building2,
  AlertCircle,
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

interface SubContractorEntry {
  id: string;
  subContractorId: string;
  entryDate: string;
  siteName: string | null;
  particulars: string;
  entryType: "WORK_BILL" | "EXTRA_LABOUR" | "MATERIAL_DEDUCTION" | "PAYMENT" | "ADJUSTMENT";
  sqft: number;
  ratePerSqft: number;
  otherAllowance: number;
  materialReduction: number;
  amountToGive: number;
  givenAmount: number;
  runningBalance: number;
  walletUsed: string | null;
  notes: string | null;
}

interface SubContractorTeam {
  id: string;
  name: string;
  teamLead: string | null;
  phone: string | null;
  tradeCategory: string;
  openingBalance: number;
  currentBalance: number;
  notes: string | null;
  entries: SubContractorEntry[];
}

const WALLETS = [
  "Office Cash",
  "ICICI",
  "Office Gpay",
  "Ravi Gpay",
  "Prabha Gpay",
  "RBL",
  "Periyasamy Gpay",
  "Suji Cash",
];

function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export default function StandardSubContractorsPage() {
  const [teams, setTeams] = useState<SubContractorTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Team Modal (Add / Edit)
  const [teamModal, setTeamModal] = useState<{
    mode: "ADD" | "EDIT";
    id?: string;
    name: string;
    teamLead: string;
    phone: string;
    tradeCategory: string;
    openingBalance: string;
    notes: string;
  } | null>(null);

  // Entry Modal (Add / Edit)
  const [entryModal, setEntryModal] = useState<{
    mode: "ADD" | "EDIT";
    entryId?: string;
    entryDate: string;
    siteName: string;
    particulars: string;
    entryType: "WORK_BILL" | "EXTRA_LABOUR" | "MATERIAL_DEDUCTION" | "PAYMENT" | "ADJUSTMENT";
    sqft: string;
    ratePerSqft: string;
    otherAllowance: string;
    materialReduction: string;
    givenAmount: string;
    walletUsed: string;
    postToCashBook: boolean;
    notes: string;
  } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contractors", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setTeams(data.teams || []);
        if (!selectedTeamId && data.teams?.length > 0) {
          setSelectedTeamId(data.teams[0].id);
        }
      }
    } catch {
      showToast("Failed to load sub-contractors", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const activeTeam = teams.find((t) => t.id === selectedTeamId) || teams[0] || null;

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamModal || !teamModal.name.trim()) return;
    const payload = {
      name: teamModal.name.trim(),
      teamLead: teamModal.teamLead.trim() || null,
      phone: teamModal.phone.trim() || null,
      tradeCategory: teamModal.tradeCategory.trim() || "Roofing & Fabrication",
      openingBalance: Number(teamModal.openingBalance) || 0,
      notes: teamModal.notes.trim() || null,
    };
    const url = teamModal.mode === "ADD" ? "/api/contractors" : `/api/contractors/${teamModal.id}`;
    const method = teamModal.mode === "ADD" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      setTeamModal(null);
      showToast(teamModal.mode === "ADD" ? `Created ${data.team.name}` : `Updated ${data.team.name}`);
      await loadTeams();
      if (data.team?.id) setSelectedTeamId(data.team.id);
    } else {
      showToast(data.error || "Failed to save team", "error");
    }
  };

  const handleDeleteTeam = () => {
    if (!activeTeam) return;
    setConfirmDelete({
      title: `Delete ${activeTeam.name}?`,
      message: `This will delete ${activeTeam.name} and all ${activeTeam.entries.length} ledger rows. This action cannot be undone.`,
      onConfirm: async () => {
        const res = await fetch(`/api/contractors/${activeTeam.id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          setSelectedTeamId("");
          showToast(`Deleted ${activeTeam.name}`);
          await loadTeams();
        } else {
          showToast(data.error || "Delete failed", "error");
        }
        setConfirmDelete(null);
      },
    });
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryModal || !activeTeam) return;
    const payload = {
      entryDate: entryModal.entryDate,
      siteName: entryModal.siteName.trim() || null,
      particulars: entryModal.particulars.trim() || entryModal.entryType,
      entryType: entryModal.entryType,
      sqft: Number(entryModal.sqft) || 0,
      ratePerSqft: Number(entryModal.ratePerSqft) || 0,
      otherAllowance: Number(entryModal.otherAllowance) || 0,
      materialReduction: Number(entryModal.materialReduction) || 0,
      givenAmount: Number(entryModal.givenAmount) || 0,
      walletUsed: entryModal.walletUsed,
      postToCashBook: entryModal.postToCashBook,
      notes: entryModal.notes.trim() || null,
    };
    const url =
      entryModal.mode === "ADD"
        ? `/api/contractors/${activeTeam.id}/entries`
        : `/api/contractors/entries/${entryModal.entryId}`;
    const method = entryModal.mode === "ADD" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      setEntryModal(null);
      showToast("Ledger updated & running balance recalculated");
      await loadTeams();
    } else {
      showToast(data.error || "Failed to save entry", "error");
    }
  };

  const handleDeleteEntry = (entry: SubContractorEntry) => {
    setConfirmDelete({
      title: "Delete Ledger Entry?",
      message: `Remove "${entry.particulars}"? All subsequent running balances will recalculate automatically.`,
      onConfirm: async () => {
        const res = await fetch(`/api/contractors/entries/${entry.id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          showToast("Entry deleted & running balance recalculated");
          await loadTeams();
        } else {
          showToast(data.error || "Delete failed", "error");
        }
        setConfirmDelete(null);
      },
    });
  };

  const handleExportTeamStatement = () => {
    if (!activeTeam) return;
    const rows = activeTeam.entries.map((e, i) => ({
      "#": i + 1,
      Date: new Date(e.entryDate).toISOString().slice(0, 10),
      Site: e.siteName || "",
      Particulars: e.particulars,
      Type: e.entryType,
      "Sq.Ft": e.sqft,
      "Rate (₹)": e.ratePerSqft,
      "Allowance (₹)": e.otherAllowance,
      "Tool/Mat Deduction (₹)": e.materialReduction,
      "Amount to Give (₹)": e.amountToGive,
      "Paid / Given (₹)": e.givenAmount,
      "Running Balance (₹)": e.runningBalance,
      Wallet: e.walletUsed || "",
      Notes: e.notes || "",
    }));
    exportToExcel(rows, `SR_Contractor_${activeTeam.name.replace(/\s+/g, "_")}`, "Statement");
  };

  const openQuickEntry = (type: "WORK_BILL" | "MATERIAL_DEDUCTION" | "PAYMENT") => {
    setEntryModal({
      mode: "ADD",
      entryDate: new Date().toISOString().slice(0, 10),
      siteName: "",
      particulars:
        type === "WORK_BILL"
          ? ""
          : type === "MATERIAL_DEDUCTION"
          ? "Welding Rod / Cutting Wheel Deduction"
          : "Payment",
      entryType: type,
      sqft: "",
      ratePerSqft: "",
      otherAllowance: "",
      materialReduction: "",
      givenAmount: "",
      walletUsed: "Office Cash",
      postToCashBook: type === "PAYMENT",
      notes: "",
    });
  };

  const entries = activeTeam?.entries || [];
  const filteredEntries = entries.filter((e) => {
    if (typeFilter === "WORK" && e.entryType !== "WORK_BILL" && e.entryType !== "EXTRA_LABOUR") return false;
    if (typeFilter === "DEDUCTION" && e.entryType !== "MATERIAL_DEDUCTION") return false;
    if (typeFilter === "PAYMENT" && e.entryType !== "PAYMENT") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.particulars.toLowerCase().includes(q) ||
        (e.siteName || "").toLowerCase().includes(q) ||
        (e.notes || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalWorkBilled = entries
    .filter((e) => e.amountToGive > 0)
    .reduce((s, e) => s + e.amountToGive, 0);
  const totalDeductions = entries.reduce((s, e) => s + (e.materialReduction || 0), 0);
  const totalPaid = entries.reduce((s, e) => s + (e.givenAmount || 0), 0);

  return (
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-2 space-y-5 font-sans pb-16 text-slate-800">
      {/* 1. HEADER */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <HardHat size={20} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
              Standard Sub-Contractors & Running Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Sq.Ft roofing billing, tool & consumable deductions, and running contractor balances across all teams
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setTeamModal({
                mode: "ADD",
                name: "",
                teamLead: "",
                phone: "",
                tradeCategory: "Roofing & Fabrication",
                openingBalance: "0",
                notes: "",
              })
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus size={14} />
            <span>+ Add Team</span>
          </button>

          {activeTeam && (
            <>
              <button
                type="button"
                onClick={() =>
                  setTeamModal({
                    mode: "EDIT",
                    id: activeTeam.id,
                    name: activeTeam.name,
                    teamLead: activeTeam.teamLead || "",
                    phone: activeTeam.phone || "",
                    tradeCategory: activeTeam.tradeCategory,
                    openingBalance: String(activeTeam.openingBalance),
                    notes: activeTeam.notes || "",
                  })
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                <Edit3 size={13} />
                <span>Edit Team</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteTeam}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete Team</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. TEAM DIRECTORY PILLS */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
          Contracting Teams ({teams.length})
        </div>
        {loading ? (
          <div className="text-xs text-slate-500 p-2">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-xs text-slate-500 p-2">No sub-contractor teams found. Click &ldquo;+ Add Team&rdquo; to create one.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => {
              const isSelected = activeTeam?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <span>{t.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : t.currentBalance > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {formatINR(t.currentBalance)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 4 KPI CARDS FOR ACTIVE TEAM */}
      {activeTeam && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Opening + Work Billed
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
                {formatINR(activeTeam.openingBalance + totalWorkBilled)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Opening: {formatINR(activeTeam.openingBalance)}
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tool & Material Deductions
              </div>
              <div className="text-2xl font-extrabold text-rose-600 mt-2 tabular-nums">
                -{formatINR(totalDeductions)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Welding rods, cutting wheels, food, etc.</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Payments Given
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-2 tabular-nums">
                {formatINR(totalPaid)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{entries.length} total ledger entries</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Live Net Balance
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    activeTeam.currentBalance > 0
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {activeTeam.currentBalance > 0 ? "Payable" : "Advance / Settled"}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-indigo-700 mt-2 tabular-nums">
                {formatINR(activeTeam.currentBalance)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{activeTeam.tradeCategory}</p>
            </div>
          </div>

          {/* 4. QUICK-ENTRY ACTION BAR & FILTERS */}
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openQuickEntry("WORK_BILL")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Add Sq.Ft Work Bill</span>
              </button>
              <button
                type="button"
                onClick={() => openQuickEntry("MATERIAL_DEDUCTION")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
              >
                <Wrench size={13} />
                <span>+ Add Tool/Material Deduction</span>
              </button>
              <button
                type="button"
                onClick={() => openQuickEntry("PAYMENT")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition cursor-pointer"
              >
                <Wallet size={13} />
                <span>+ Record Payment</span>
              </button>
              <button
                type="button"
                onClick={handleExportTeamStatement}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                <FileSpreadsheet size={13} className="text-emerald-600" />
                <span>Export Statement</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                <Printer size={13} className="text-slate-600" />
                <span>Print</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                {[
                  { id: "ALL", label: "All" },
                  { id: "WORK", label: "Work Bills" },
                  { id: "DEDUCTION", label: "Tool Deductions" },
                  { id: "PAYMENT", label: "Payments" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTypeFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      typeFilter === tab.id ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search site / particulars..."
                  className="pl-7 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* 5. LEDGER TABLE */}
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-2px_rgba(16,24,40,0.04)] overflow-hidden">
            {filteredEntries.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                <AlertCircle size={26} className="mx-auto text-slate-400 mb-2" />
                No ledger entries match the current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    <tr>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Particulars / Site</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2 text-right">Sq.Ft</th>
                      <th className="py-3 px-2 text-right">Rate (₹)</th>
                      <th className="py-3 px-2 text-right">Other / Ded</th>
                      <th className="py-3 px-2 text-right">To Give (₹)</th>
                      <th className="py-3 px-2 text-right">Given (₹)</th>
                      <th className="py-3 px-3 text-right text-indigo-700">Running Bal</th>
                      <th className="py-3 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(entry.entryDate).toISOString().slice(0, 10)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{entry.particulars}</div>
                          {entry.siteName && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building2 size={10} /> {entry.siteName}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              entry.entryType === "PAYMENT"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : entry.entryType === "MATERIAL_DEDUCTION"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            }`}
                          >
                            {entry.entryType.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums">{entry.sqft || "—"}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums">{entry.ratePerSqft || "—"}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums">
                          {entry.otherAllowance > 0 && (
                            <span className="text-emerald-700">+{formatINR(entry.otherAllowance)}</span>
                          )}
                          {entry.materialReduction > 0 && (
                            <span className="text-rose-600">-{formatINR(entry.materialReduction)}</span>
                          )}
                          {entry.otherAllowance === 0 && entry.materialReduction === 0 && "—"}
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold tabular-nums">
                          {entry.amountToGive !== 0 ? formatINR(entry.amountToGive) : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold text-emerald-700 tabular-nums">
                          {entry.givenAmount > 0 ? formatINR(entry.givenAmount) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-indigo-700 tabular-nums">
                          {formatINR(entry.runningBalance)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setEntryModal({
                                  mode: "EDIT",
                                  entryId: entry.id,
                                  entryDate: new Date(entry.entryDate).toISOString().slice(0, 10),
                                  siteName: entry.siteName || "",
                                  particulars: entry.particulars,
                                  entryType: entry.entryType,
                                  sqft: String(entry.sqft),
                                  ratePerSqft: String(entry.ratePerSqft),
                                  otherAllowance: String(entry.otherAllowance),
                                  materialReduction: String(entry.materialReduction),
                                  givenAmount: String(entry.givenAmount),
                                  walletUsed: entry.walletUsed || "Office Cash",
                                  postToCashBook: false,
                                  notes: entry.notes || "",
                                })
                              }
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                              title="Edit Entry"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Delete Entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TEAM MODAL */}
      {teamModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveTeam} className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-bold text-sm text-slate-900">
                {teamModal.mode === "ADD" ? "Add Sub-Contractor Team" : "Edit Sub-Contractor Team"}
              </div>
              <button type="button" onClick={() => setTeamModal(null)} className="text-slate-500 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Team Name *</label>
                <input
                  required
                  type="text"
                  value={teamModal.name}
                  onChange={(e) => setTeamModal({ ...teamModal, name: e.target.value })}
                  placeholder="e.g. Sakthi Team"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Team Lead</label>
                  <input
                    type="text"
                    value={teamModal.teamLead}
                    onChange={(e) => setTeamModal({ ...teamModal, teamLead: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={teamModal.phone}
                    onChange={(e) => setTeamModal({ ...teamModal, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trade Category</label>
                  <input
                    type="text"
                    value={teamModal.tradeCategory}
                    onChange={(e) => setTeamModal({ ...teamModal, tradeCategory: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={teamModal.openingBalance}
                    onChange={(e) => setTeamModal({ ...teamModal, openingBalance: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setTeamModal(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer">
                Save Team
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ENTRY MODAL */}
      {entryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveEntry} className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-bold text-sm text-slate-900">
                {entryModal.mode === "ADD" ? "Add Contractor Ledger Entry" : "Edit Ledger Entry"}
              </div>
              <button type="button" onClick={() => setEntryModal(null)} className="text-slate-500 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Entry Date</label>
                  <input
                    type="date"
                    value={entryModal.entryDate}
                    onChange={(e) => setEntryModal({ ...entryModal, entryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Entry Type</label>
                  <select
                    value={entryModal.entryType}
                    onChange={(e) => setEntryModal({ ...entryModal, entryType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="WORK_BILL">Sq.Ft Work Bill</option>
                    <option value="EXTRA_LABOUR">Extra Labour / Food</option>
                    <option value="MATERIAL_DEDUCTION">Tool / Material Deduction</option>
                    <option value="PAYMENT">Payment Given</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Particulars *</label>
                  <input
                    required
                    type="text"
                    value={entryModal.particulars}
                    onChange={(e) => setEntryModal({ ...entryModal, particulars: e.target.value })}
                    placeholder="Site work / welding rod / payment..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Site Name</label>
                  <input
                    type="text"
                    value={entryModal.siteName}
                    onChange={(e) => setEntryModal({ ...entryModal, siteName: e.target.value })}
                    placeholder="e.g. SSM School / Chennai"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sq.Ft</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryModal.sqft}
                    onChange={(e) => setEntryModal({ ...entryModal, sqft: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate / Sq.Ft (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryModal.ratePerSqft}
                    onChange={(e) => setEntryModal({ ...entryModal, ratePerSqft: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Other Allowance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryModal.otherAllowance}
                    onChange={(e) => setEntryModal({ ...entryModal, otherAllowance: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tool Deduction (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryModal.materialReduction}
                    onChange={(e) => setEntryModal({ ...entryModal, materialReduction: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Given (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryModal.givenAmount}
                    onChange={(e) => setEntryModal({ ...entryModal, givenAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wallet Used</label>
                  <select
                    value={entryModal.walletUsed}
                    onChange={(e) => setEntryModal({ ...entryModal, walletUsed: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    {WALLETS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>
              {entryModal.mode === "ADD" && entryModal.entryType === "PAYMENT" && (
                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium pt-1">
                  <input
                    type="checkbox"
                    checked={entryModal.postToCashBook}
                    onChange={(e) => setEntryModal({ ...entryModal, postToCashBook: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Also record outflow in Standard Daily Cash Book ({entryModal.walletUsed})</span>
                </label>
              )}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setEntryModal(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer">
                Save & Recalculate
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-3">
            <div className="text-sm font-extrabold text-slate-900">{confirmDelete.title}</div>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmDelete.message}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete.onConfirm} className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold text-white flex items-center gap-2 ${toast.type === "error" ? "bg-rose-600" : "bg-indigo-600"}`}>
          <CheckCircle2 size={15} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
