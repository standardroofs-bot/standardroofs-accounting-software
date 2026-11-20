"use client";

import { useEffect, useState } from "react";
import {
  HardHat,
  Plus,
  CheckCircle2,
  Calendar,
  Building,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Trash2,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import ArchiveConfirmModal from "@/components/common/ArchiveConfirmModal";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

interface ContractorItem {
  id: string;
  code: string | null;
  name: string;
  specialty: string;
  panNumber: string | null;
  phone: string | null;
  contractValue: string;
  milestones: Array<{
    id: string;
    milestoneType: string;
    milestonePercentage: string;
    milestoneAmount: string;
    tdsRate: string;
    tdsAmount: string;
    netPayable: string;
    status: string;
    workStageDescription: string;
    project: { code: string; name: string };
  }>;
}

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<ContractorItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Contractor Form State
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [contName, setContName] = useState("");
  const [contCode, setContCode] = useState("");
  const [contSpecialty, setContSpecialty] = useState("PEB Truss & Structural Steel Erection");
  const [contPan, setContPan] = useState("");
  const [contPhone, setContPhone] = useState("");
  const [contContractVal, setContContractVal] = useState("");
  const [submittingCont, setSubmittingCont] = useState(false);
  const [contError, setContError] = useState("");

  // Milestone Form State
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedContId, setSelectedContId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [milestoneType, setMilestoneType] = useState("STAGE_10_ADVANCE");
  const [milestonePercentage, setMilestonePercentage] = useState("10");
  const [milestoneAmount, setMilestoneAmount] = useState("");
  const [tdsRate, setTdsRate] = useState("1"); // 1% Individual / 2% Company u/s 194C
  const [workStageDesc, setWorkStageDesc] = useState("");
  const [submittingMilestone, setSubmittingMilestone] = useState(false);
  const [milestoneError, setMilestoneError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contRes, prjRes] = await Promise.all([
        fetch("/api/contractors"),
        fetch("/api/projects"),
      ]);
      const contData = await contRes.json();
      const prjData = await prjRes.json();

      if (contData.success) {
        setContractors(contData.contractors);
        if (contData.contractors.length > 0 && !selectedContId) {
          setSelectedContId(contData.contractors[0].id);
        }
      }
      if (prjData.success) {
        setProjects(prjData.projects);
        if (prjData.projects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(prjData.projects[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCont(true);
    setContError("");

    try {
      const res = await fetch("/api/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contName,
          code: contCode || null,
          specialty: contSpecialty,
          panNumber: contPan,
          phone: contPhone,
          contractValue: parseFloat(contContractVal) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowContractorModal(false);
        setContName("");
        setContCode("");
        setContPan("");
        setContPhone("");
        setContContractVal("");
        fetchData();
      } else {
        setContError(data.error || "Failed to add contractor");
      }
    } catch (err: any) {
      setContError(err.message);
    } finally {
      setSubmittingCont(false);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingMilestone(true);
    setMilestoneError("");

    try {
      const res = await fetch("/api/contractors/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId: selectedContId,
          projectId: selectedProjectId,
          milestoneType,
          milestonePercentage: parseFloat(milestonePercentage) || 10,
          milestoneAmount: parseFloat(milestoneAmount) || 0,
          tdsRate: parseFloat(tdsRate) || 1,
          workStageDescription: workStageDesc,
          autoApprove: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowMilestoneModal(false);
        setMilestoneAmount("");
        setWorkStageDesc("");
        fetchData();
      } else {
        setMilestoneError(data.error || "Failed to post milestone bill");
      }
    } catch (err: any) {
      setMilestoneError(err.message);
    } finally {
      setSubmittingMilestone(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [archiveModal, setArchiveModal] = useState<{
    isOpen: boolean;
    contractorId: string;
    contractorName: string;
    loading: boolean;
  }>({
    isOpen: false,
    contractorId: "",
    contractorName: "",
    loading: false,
  });

  const handleExportExcel = () => {
    const exportData = filteredContractors.map((c) => ({
      Code: c.code || "-",
      Name: c.name,
      Specialty: c.specialty,
      PAN: c.panNumber || "-",
      Phone: c.phone || "-",
      "Contract Value (₹)": c.contractValue,
      "Milestones Raised": c.milestones.length,
    }));
    exportToExcel(exportData, "contractors_billing");
  };

  const handleExportPDF = () => {
    const printRows = filteredContractors.map((c) => [
      c.code || "-",
      c.name,
      c.specialty,
      c.phone || "-",
      formatINR(c.contractValue),
      c.milestones.length.toString(),
    ]);
    exportToPDF("Milestone Contractors Register", ["Code", "Name", "Specialty", "Phone", "Contract Value", "Milestones"], printRows, "contractors_register");
  };

  const handleArchive = async () => {
    try {
      setArchiveModal((prev) => ({ ...prev, loading: true }));
      setContractors((prev) => prev.filter((item) => item.id !== archiveModal.contractorId));
      setArchiveModal({ isOpen: false, contractorId: "", contractorName: "", loading: false });
    } catch (err) {
      console.error(err);
      setArchiveModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const filteredContractors = contractors.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      c.specialty.toLowerCase().includes(q)
    );
  });

  const totalContractVal = contractors.reduce((s, c) => s + parseFloat(c.contractValue || "0"), 0);
  const totalMilestonesCount = contractors.reduce((s, c) => s + c.milestones.length, 0);

  return (
    <div className="space-y-6">
      <ModuleHeaderWithAnalytics
        title="Milestone Contractor Billing"
        subtitle="Site erection teams, work-stage payouts (10% advance, 40% structure, 75% sheeting, 100% handover) & 1%/2% TDS u/s 194C"
        badge="Works Contract"
        icon={HardHat}
        analyticsPreset="hr"
        analyticsCards={[
          {
            label: "Total Contractors",
            value: contractors.length.toString(),
            change: "Registered erection teams",
            isPositive: true,
          },
          {
            label: "Contract Commitments",
            value: formatINR(totalContractVal),
            change: "Across all active sites",
            isPositive: true,
          },
          {
            label: "Milestone Claims",
            value: totalMilestonesCount.toString(),
            change: "Stages verified on site",
            isPositive: true,
          },
          {
            label: "Statutory TDS Compliance",
            value: "194C Ready",
            change: "1% Indiv / 2% Corp",
            isPositive: true,
          },
        ]}
        searchPlaceholder="Search contractor name, code, specialty..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        sampleData={[
          {
            "Contractor Code": "CONT-001",
            "Contractor Name": "Team Thenarrusu",
            Specialty: "PEB Truss & Structural Steel Erection",
            PAN: "ABCDE1234F",
            Phone: "9876543210",
            "Contract Value (₹)": "500000",
          },
        ]}
        sampleColumns={[
          "Contractor Code",
          "Contractor Name",
          "Specialty",
          "PAN",
          "Phone",
          "Contract Value (₹)",
        ]}
        customActions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowContractorModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Plus size={14} /> + Contractor
            </button>
            <button
              onClick={() => setShowMilestoneModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
            >
              <Plus size={14} /> + Raise Milestone
            </button>
          </div>
        }
      />

      {/* Contractors & Work Milestones */}
      <div className="space-y-4">
        {filteredContractors.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No contractors found matching filter. Click <strong>+ Register Contractor</strong> to onboard erection teams.
          </div>
        ) : (
          filteredContractors.map((cont) => (
            <div
              key={cont.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">{cont.name}</h2>
                    {cont.code && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                        {cont.code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Specialty: <strong>{cont.specialty}</strong> • PAN: <span className="font-mono">{cont.panNumber || "None"}</span> • Phone: {cont.phone || "—"}
                  </p>
                </div>
                <div className="text-right flex items-center justify-end gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Contract Value</span>
                    <span className="text-base font-black font-mono text-slate-900 dark:text-slate-100">
                      {formatINR(cont.contractValue)}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setArchiveModal({
                        isOpen: true,
                        contractorId: cont.id,
                        contractorName: cont.name,
                        loading: false,
                      })
                    }
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                    title="Archive Contractor"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Milestones Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2 px-3">Project Site</th>
                      <th className="py-2 px-3">Work Stage</th>
                      <th className="py-2 px-3">Stage Description</th>
                      <th className="py-2 px-3 text-right">Gross Amount (₹)</th>
                      <th className="py-2 px-3 text-right">TDS u/s 194C (₹)</th>
                      <th className="py-2 px-3 text-right">Net Payable (₹)</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {cont.milestones.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400 font-sans">
                          No milestone bills recorded for this contractor yet.
                        </td>
                      </tr>
                    ) : (
                      cont.milestones.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-sans font-bold text-blue-600">{m.project.name}</td>
                          <td className="py-2 px-3 font-sans">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                              {m.milestoneType.replace("_", " ")} ({m.milestonePercentage}%)
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {m.workStageDescription}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">{formatINR(m.milestoneAmount)}</td>
                          <td className="py-2 px-3 text-right text-rose-600 font-bold">{formatINR(m.tdsAmount)} ({m.tdsRate}%)</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">{formatINR(m.netPayable)}</td>
                          <td className="py-2 px-3 text-center font-sans">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Contractor Modal */}
      {showContractorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 text-xs">
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <HardHat className="text-amber-600" /> Register Erection Contractor Team
            </h2>
            {contError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 text-rose-700 flex items-center gap-2">
                <AlertCircle size={16} /> <span>{contError}</span>
              </div>
            )}
            <form onSubmit={handleCreateContractor} className="space-y-3 mt-4">
              <div>
                <label className="font-bold text-slate-700">Contractor / Team Lead Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SRM01-Cont / Team Thenarrusu"
                  value={contName}
                  onChange={(e) => setContName(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-slate-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Contractor Code</label>
                  <input
                    type="text"
                    placeholder="CON-001"
                    value={contCode}
                    onChange={(e) => setContCode(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">PAN Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={contPan}
                    onChange={(e) => setContPan(e.target.value.toUpperCase())}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-slate-50 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Work Specialty *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Structural Steel Trusses, Purlins & Galvalume Sheeting"
                  value={contSpecialty}
                  onChange={(e) => setContSpecialty(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-slate-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 94433 11223"
                    value={contPhone}
                    onChange={(e) => setContPhone(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Contract Value (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="250000"
                    value={contContractVal}
                    onChange={(e) => setContContractVal(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-slate-50 font-mono font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContractorModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCont}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold"
                >
                  {submittingCont ? "Saving..." : "Save Contractor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise Milestone Bill Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 text-xs">
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <HardHat className="text-blue-600" /> Raise Work-Stage Milestone Bill
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Posts automatic Double-Entry (Labour Expense, TDS u/s 194C, Contractor Payable)
            </p>

            {milestoneError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 text-rose-700 flex items-center gap-2">
                <AlertCircle size={16} /> <span>{milestoneError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMilestone} className="space-y-3 mt-4">
              <div>
                <label className="font-bold text-slate-700">Contractor *</label>
                <select
                  value={selectedContId}
                  onChange={(e) => setSelectedContId(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                >
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700">Project Site *</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-slate-50"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Milestone Stage</label>
                  <select
                    value={milestoneType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMilestoneType(val);
                      if (val === "STAGE_10_ADVANCE") setMilestonePercentage("10");
                      else if (val === "STAGE_40_PROGRESS") setMilestonePercentage("40");
                      else if (val === "STAGE_75_STRUCTURE") setMilestonePercentage("75");
                      else if (val === "STAGE_100_COMPLETION") setMilestonePercentage("100");
                    }}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-slate-50 font-bold text-blue-600"
                  >
                    <option value="STAGE_10_ADVANCE">10% Advance</option>
                    <option value="STAGE_40_PROGRESS">40% Fabrication</option>
                    <option value="STAGE_75_STRUCTURE">75% Structure</option>
                    <option value="STAGE_100_COMPLETION">100% Handover</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">TDS u/s 194C Rate</label>
                  <select
                    value={tdsRate}
                    onChange={(e) => setTdsRate(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-slate-50 font-bold"
                  >
                    <option value="1">1% (Individual/HUF)</option>
                    <option value="2">2% (Company/Firm)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Gross Milestone Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 50000"
                  value={milestoneAmount}
                  onChange={(e) => setMilestoneAmount(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-slate-50 font-mono font-bold text-sm"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Work Stage Verification Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trusses and purlins erection certified on site by PM"
                  value={workStageDesc}
                  onChange={(e) => setWorkStageDesc(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-slate-50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMilestone}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold"
                >
                  {submittingMilestone ? "Posting..." : "Approve & Post Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive / Delete Modal */}
      <ArchiveConfirmModal
        isOpen={archiveModal.isOpen}
        title="Archive Contractor"
        message="Are you sure you want to archive this contractor? Any further milestone claims will be halted."
        recordLabel={archiveModal.contractorName}
        onConfirm={handleArchive}
        onCancel={() =>
          setArchiveModal({ isOpen: false, contractorId: "", contractorName: "", loading: false })
        }
        loading={archiveModal.loading}
      />
    </div>
  );
}
