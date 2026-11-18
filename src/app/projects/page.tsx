"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Search,
  Building,
  TrendingUp,
  TrendingDown,
  Layers,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Users,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

interface ProjectItem {
  id: string;
  code: string;
  name: string;
  customer: { id: string; name: string; companyName: string | null };
  siteLocation: string;
  city: string;
  state: string;
  roofType: string;
  totalSqFt: string;
  contractValue: string;
  status: string;
  description: string | null;
  assignedTeams: string[];
  financials: {
    contractValue: string;
    totalInvoiced: string;
    totalReceived: string;
    unbilledContractAmount: string;
    pendingBalance: string;
    materialCost: string;
    labourCost: string;
    contractorCost: string;
    transportCost: string;
    foodAndMiscCost: string;
    totalProjectCost: string;
    netProfitOrLoss: string;
    profitMarginPct: number;
    isProfitable: boolean;
  };
}

const AVAILABLE_TEAMS = [
  "SRM01",
  "SRM02",
  "SRM03",
  "SRM04",
  "SRM05",
  "SRM06",
  "Team Thenarrusu",
  "Team Saran",
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [city, setCity] = useState("Erode");
  const [roofType, setRoofType] = useState("PEB");
  const [totalSqFt, setTotalSqFt] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTeams, setAssignedTeams] = useState<string[]>(["SRM01"]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
        if (data.customers.length > 0 && !customerId) {
          setCustomerId(data.customers[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchCustomers();
  }, []);

  const toggleTeamSelection = (t: string) => {
    if (assignedTeams.includes(t)) {
      setAssignedTeams(assignedTeams.filter((item) => item !== t));
    } else {
      setAssignedTeams([...assignedTeams, t]);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          name,
          siteLocation,
          city,
          roofType,
          totalSqFt: Number(totalSqFt) || 0,
          contractValue: Number(contractValue) || 0,
          description,
          assignedTeams,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setName("");
        setSiteLocation("");
        setTotalSqFt("");
        setContractValue("");
        setDescription("");
        setAssignedTeams(["SRM01"]);
        fetchProjects();
      } else {
        setErrorMsg(data.error || "Failed to create project");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.siteLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.assignedTeams || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="text-blue-600" size={26} />
            Projects & Multi-Team Site Profitability
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time site cost centers: track multi-team assignments (SRM01–SRM06), materials, labour muster, and contractor milestones with exact net margin per site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition"
          >
            <Plus size={16} /> New Project Site
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search by project name, code (SR-PRJ-2026-...), customer, location, or assigned team..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 bg-white"
        />
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm animate-pulse">Loading Project Sites...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <Briefcase className="mx-auto text-slate-400" size={36} />
            <h3 className="font-bold text-slate-800 text-sm">No Project Sites Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create a new roofing site or upload an existing Accounts Excel file in the Importer to populate your project roster automatically.
            </p>
          </div>
        ) : (
          filteredProjects.map((prj) => (
            <div
              key={prj.id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 transition space-y-4 shadow-sm"
            >
              {/* Row 1: Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {prj.code}
                    </span>
                    <h3 className="text-base font-black text-slate-900">{prj.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        prj.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {prj.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Building size={13} className="text-slate-400" />
                      {prj.customer.name}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-slate-400" />
                      {prj.siteLocation}, {prj.city}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Layers size={13} className="text-slate-400" />
                      {prj.roofType} {prj.totalSqFt ? `(${prj.totalSqFt} Sq.Ft)` : ""}
                    </span>
                  </div>
                </div>

                {/* Team Badges & Open Command Center */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    {prj.assignedTeams?.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/projects/${prj.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg transition"
                  >
                    Site Command Center & Passbook
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Row 2: Financial P&L Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Contract Value</span>
                  <p className="font-bold text-slate-900 font-mono mt-0.5">
                    {formatINR(prj.financials.contractValue)}
                  </p>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-[10px] text-blue-700 uppercase font-bold">Total Invoiced</span>
                  <p className="font-bold text-blue-900 font-mono mt-0.5">
                    {formatINR(prj.financials.totalInvoiced)}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold">Total Received</span>
                  <p className="font-bold text-emerald-900 font-mono mt-0.5">
                    {formatINR(prj.financials.totalReceived)}
                  </p>
                </div>
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-[10px] text-rose-700 uppercase font-bold">Total Site Costs</span>
                  <p className="font-bold text-rose-900 font-mono mt-0.5">
                    {formatINR(prj.financials.totalProjectCost)}
                  </p>
                </div>
                <div
                  className={`p-2.5 rounded-lg border ${
                    prj.financials.isProfitable
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-rose-50 border-rose-300"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-600">
                    Net Site {prj.financials.isProfitable ? "Profit" : "Loss"}
                  </span>
                  <p
                    className={`font-black font-mono mt-0.5 text-sm ${
                      prj.financials.isProfitable ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {formatINR(prj.financials.netProfitOrLoss)} ({prj.financials.profitMarginPct}%)
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: New Project Site */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Briefcase className="text-blue-600" /> Register Roofing Project Site
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Creates a dedicated project cost center for multi-team billing and site expenditure tracking
            </p>

            {errorMsg && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Select Customer / Client *</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Project / Site Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Texvalley Factory Shed 4"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Site Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SIPCOT Phase 2"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Roof Type</label>
                  <select
                    value={roofType}
                    onChange={(e) => setRoofType(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                  >
                    <option value="PEB">PEB Structural</option>
                    <option value="Clay Tile">Kerala Clay Tile</option>
                    <option value="UPVC Sheet">UPVC Roofing Sheet</option>
                    <option value="Tensile Fabric">Tensile Fabric</option>
                    <option value="Solar Roof">Solar Rooftop</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Total Sq.Ft</label>
                  <input
                    type="number"
                    placeholder="12,500"
                    value={totalSqFt}
                    onChange={(e) => setTotalSqFt(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Contract Value (₹)</label>
                  <input
                    type="number"
                    placeholder="15,00,000"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Working Teams Assignment */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Assign Working Teams to this Site:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {AVAILABLE_TEAMS.map((t) => {
                    const active = assignedTeams.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTeamSelection(t)}
                        className={`px-2 py-1.5 rounded text-[11px] font-bold border transition text-center truncate ${
                          active
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Description / Scope</label>
                <textarea
                  rows={2}
                  placeholder="Structural truss fabrication, purlins, sheeting & gutters..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow"
                >
                  {submitting ? "Creating..." : "Save Project Site"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
