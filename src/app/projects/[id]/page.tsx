"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Briefcase,
  ArrowLeft,
  Building,
  Users,
  Download,
  Calendar,
  Layers,
  MapPin,
  TrendingUp,
  TrendingDown,
  Receipt,
  Truck,
  Wrench,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

const AVAILABLE_TEAMS = [
  "SRM01",
  "SRM02",
  "SRM03",
  "SRM04",
  "SRM05",
  "SRM06",
  "Team Thenarrusu",
  "Team Saran",
  "Office Store",
];

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [savingTeams, setSavingTeams] = useState(false);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.project);
        setSelectedTeams(data.project.assignedTeams || ["SRM01"]);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const handleSaveTeams = async () => {
    try {
      setSavingTeams(true);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTeams: selectedTeams }),
      });
      const data = await res.json();
      if (data.success) {
        setShowTeamModal(false);
        fetchProject();
      } else {
        alert("Error saving teams: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingTeams(false);
    }
  };

  const toggleTeam = (t: string) => {
    if (selectedTeams.includes(t)) {
      setSelectedTeams(selectedTeams.filter((item) => item !== t));
    } else {
      setSelectedTeams([...selectedTeams, t]);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm animate-pulse">
        Loading Site P&L Command Center...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-rose-600 font-bold">Error loading project site: {error}</div>
        <Link href="/projects" className="inline-flex items-center gap-2 text-xs font-bold text-blue-600">
          <ArrowLeft size={16} /> Back to Projects
        </Link>
      </div>
    );
  }

  const fin = project.financials;

  // Filter passbook
  const filteredPassbook = (project.passbook || []).filter((item: any) => {
    const matchTeam = teamFilter === "ALL" || item.team === teamFilter;
    const matchCat = categoryFilter === "ALL" || item.category === categoryFilter;
    return matchTeam && matchCat;
  });

  const costRatio = Number(fin.totalReceived) > 0
    ? Math.min(100, Math.round((Number(fin.totalProjectCost) / Number(fin.totalReceived)) * 100))
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 mb-2 transition"
          >
            <ArrowLeft size={14} /> Back to Projects & Site Costing
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
              {project.code}
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{project.name}</h1>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                project.status === "COMPLETED"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {project.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <Building size={13} className="text-slate-400" />
              Client: <strong className="text-slate-700">{project.customer.name}</strong>
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-slate-400" />
              {project.siteLocation}, {project.city}
            </span>
            <span className="flex items-center gap-1">
              <Layers size={13} className="text-slate-400" />
              {project.roofType} &bull; {project.totalSqFt ? `${project.totalSqFt} Sq.Ft` : "Custom"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={`/api/projects/${project.id}/export`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-lg transition shadow-sm"
          >
            <Download size={14} />
            Export Site P&L (.xlsx)
          </a>
          <Link
            href={`/expenses?projectId=${project.id}`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition"
          >
            <Plus size={14} />
            Log Site Expense
          </Link>
          <Link
            href={`/invoices/new?projectId=${project.id}`}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow"
          >
            <Receipt size={14} />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Multi-Team Badges Bar */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Users size={14} className="text-blue-600" />
            Assigned Site Teams:
          </span>
          {project.assignedTeams?.map((t: string) => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white text-slate-800 border border-slate-300 shadow-2xs"
            >
              {t}
            </span>
          ))}
        </div>
        <button
          onClick={() => setShowTeamModal(true)}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
        >
          + Manage Teams
        </button>
      </div>

      {/* MASTER SITE P&L CARD */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} />
              Live Site Profit & Loss Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time contract revenues vs. categorized direct site disbursements. General office overheads are strictly excluded.
            </p>
          </div>

          {/* Big Profit/Loss Badge */}
          <div
            className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${
              fin.isProfitable
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {fin.isProfitable ? (
              <TrendingUp size={24} className="text-emerald-600" />
            ) : (
              <TrendingDown size={24} className="text-rose-600" />
            )}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Net Site {fin.isProfitable ? "Profit" : "Loss"}
              </div>
              <div className="text-xl font-black font-mono">
                {formatINR(fin.netSiteProfit)}{" "}
                <span className="text-xs font-bold">({fin.marginPct}% Margin)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Revenue & AR Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total Contract Value</div>
            <div className="text-lg font-black text-slate-900 mt-1">{formatINR(fin.contractValue)}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Agreed Site Scope</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-[10px] font-bold text-blue-700 uppercase">Total Billed (Invoices)</div>
            <div className="text-lg font-black text-blue-900 mt-1">{formatINR(fin.totalBilled)}</div>
            <div className="text-[10px] text-blue-600 mt-0.5">GST Invoices Raised</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="text-[10px] font-bold text-emerald-700 uppercase">Money Received</div>
            <div className="text-lg font-black text-emerald-900 mt-1">{formatINR(fin.totalReceived)}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Cash + Bank Collections</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="text-[10px] font-bold text-amber-700 uppercase">Balance Pending from Client</div>
            <div className="text-lg font-black text-amber-900 mt-1">{formatINR(fin.pendingBalance)}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Accounts Receivable</div>
          </div>
        </div>

        {/* Visual Cost Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700">Cost to Revenue Utilization: {costRatio}%</span>
            <span className="text-slate-500">
              Total Costs: {formatINR(fin.totalProjectCost)} of {formatINR(fin.totalReceived)} Received
            </span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-500 ${
                costRatio > 85 ? "bg-rose-500" : costRatio > 65 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, costRatio)}%` }}
            />
          </div>
        </div>

        {/* 5-Category Direct Site Costs Grid */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Direct Site Costs by Category:
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">1. Materials</span>
              <div className="font-mono font-bold text-slate-900">{formatINR(fin.materialCost)}</div>
              <span className="text-[10px] text-slate-400 block truncate">Steel, Sheets & Fasteners</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">2. Labour Wages</span>
              <div className="font-mono font-bold text-slate-900">{formatINR(fin.labourCost)}</div>
              <span className="text-[10px] text-slate-400 block truncate">15-Day Muster & Advances</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">3. Contractors</span>
              <div className="font-mono font-bold text-slate-900">{formatINR(fin.contractorCost)}</div>
              <span className="text-[10px] text-slate-400 block truncate">Milestone Subcontractors</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">4. Transport & Crane</span>
              <div className="font-mono font-bold text-slate-900">{formatINR(fin.transportCost)}</div>
              <span className="text-[10px] text-slate-400 block truncate">Fleet Bolero, Fuel & Crane</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">5. Food & Stay</span>
              <div className="font-mono font-bold text-slate-900">{formatINR(fin.foodAndMiscCost)}</div>
              <span className="text-[10px] text-slate-400 block truncate">Site Meals, Tea & Misc</span>
            </div>
          </div>
        </div>

        {/* Team-Wise Cost Allocation */}
        {Object.keys(project.teamBreakdown || {}).length > 0 && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Cost Disbursed by Team on this Site:</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(project.teamBreakdown).map(([tm, amt]: any) => (
                <div key={tm} className="p-2.5 bg-white border border-slate-200 rounded-md flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{tm}</span>
                  <span className="font-mono font-bold text-blue-700">{formatINR(amt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CHRONOLOGICAL SITE PASSBOOK LEDGER */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-3 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Site Transaction Passbook (Chronological Ledger)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete chronological audit passbook of every rupee received from client and every rupee disbursed for materials, wages, and transport on this site.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Team:</span>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white"
              >
                <option value="ALL">All Teams</option>
                {AVAILABLE_TEAMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Voucher / Ref</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Team</th>
                <th className="px-3 py-2.5">Particulars / Narration</th>
                <th className="px-3 py-2.5 text-right">Inflow (₹)</th>
                <th className="px-3 py-2.5 text-right">Outflow (₹)</th>
                <th className="px-3 py-2.5 text-right">Running Net (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPassbook.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No transactions recorded for this site yet.
                  </td>
                </tr>
              ) : (
                filteredPassbook.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{e.dateFormatted}</td>
                    <td className="px-3 py-2 font-mono font-bold text-blue-700">{e.voucherNo}</td>
                    <td className="px-3 py-2 text-slate-700">{e.category}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {e.team}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-800 max-w-sm truncate">{e.particulars}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">
                      {e.inflow > 0 ? formatINR(e.inflow) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-rose-600">
                      {e.outflow > 0 ? formatINR(e.outflow) : "-"}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono font-bold ${
                        e.runningBalance >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {formatINR(e.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Manage Assigned Teams */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Assign Working Teams to this Site</h3>
            <p className="text-xs text-slate-500">
              Select all teams and contractor groups working on <strong>{project.name}</strong>:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {AVAILABLE_TEAMS.map((t) => {
                const isSelected = selectedTeams.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTeam(t)}
                    className={`p-2.5 rounded-lg border text-left font-bold transition flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-50 border-blue-600 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{t}</span>
                    {isSelected && <CheckCircle2 size={15} className="text-blue-600" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTeamModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTeams}
                disabled={savingTeams}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow"
              >
                {savingTeams ? "Saving..." : "Save Assigned Teams"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
