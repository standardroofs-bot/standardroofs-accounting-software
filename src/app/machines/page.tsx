"use client";

import { useEffect, useState, useRef } from "react";
import {
  Wrench,
  ArrowRightLeft,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  Plus,
  Download,
  Upload,
  FileSpreadsheet,
  Layers,
  HardHat,
  Users,
  Settings2,
  FileText,
  RotateCcw,
  Check,
  ChevronRight,
  Sparkles,
  Eye,
  X,
  Save,
  Edit2,
  ZoomIn,
  Trash2,
} from "lucide-react";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import ArchiveConfirmModal from "@/components/common/ArchiveConfirmModal";
import { exportToPDF } from "@/lib/exportUtils";

export default function MachinesPage() {
  const [activeTab, setActiveTab] = useState<"matrix" | "teams" | "whohaswhat" | "consumables" | "service">("matrix");
  const [selectedTeam, setSelectedTeam] = useState<string>("SRM01");
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<any[]>([]);
  const [masterSummary, setMasterSummary] = useState<any>(null);
  const [siteIssues, setSiteIssues] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Archive Modal State
  const [archiveModal, setArchiveModal] = useState<{
    isOpen: boolean;
    machineId: string;
    machineName: string;
    loading: boolean;
  }>({
    isOpen: false,
    machineId: "",
    machineName: "",
    loading: false,
  });

  const handlePDFExport = () => {
    const printRows = filteredMachines.map((m) => [
      m.name,
      m.category,
      (m.officeCount || 0).toString(),
      (m.totalCount || 0).toString(),
      (m.serviceCount || 0).toString(),
      m.notes || "-",
    ]);
    exportToPDF(
      "SRM Machine & Tool Custody Register",
      ["Machine Name", "Category", "Office", "Total", "In Service", "Notes"],
      printRows,
      "machines_inventory"
    );
  };

  const handleArchive = async () => {
    try {
      setArchiveModal((prev) => ({ ...prev, loading: true }));
      setMachines((prev) => prev.filter((m) => m.id !== archiveModal.machineId));
      setArchiveModal({ isOpen: false, machineId: "", machineName: "", loading: false });
    } catch (err) {
      console.error(err);
      setArchiveModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Lightbox Zoom Modal State
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState<string>("");

  // Inline Row Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingInline, setSavingInline] = useState(false);

  // Add Machine Modal State
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [newMachineForm, setNewMachineForm] = useState({
    name: "",
    category: "Power Tools",
    officeCount: 1,
    srm01Count: 0,
    srm02Count: 0,
    srm03Count: 0,
    srm04Count: 0,
    srm05Count: 0,
    srm06Count: 0,
    spareCount: 0,
    serviceCount: 0,
    scrapCount: 0,
    notes: "",
    imageUrl: "",
  });

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferMachineId, setTransferMachineId] = useState("");
  const [transferFrom, setTransferFrom] = useState("OFFICE");
  const [transferTo, setTransferTo] = useState("SRM01");
  const [transferQty, setTransferQty] = useState(1);
  const [transferPurpose, setTransferPurpose] = useState("Site mobilization");
  const [serviceVendor, setServiceVendor] = useState("");
  const [faultDescription, setFaultDescription] = useState("");
  const [repairCost, setRepairCost] = useState("0");
  const [postExpenseVoucher, setPostExpenseVoucher] = useState(false);
  const [transferNotes, setTransferNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Consumable Issue Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    date: new Date().toISOString().split("T")[0],
    team: "SRM01",
    siteName: "",
    productName: '5" Cutting Wheel',
    quantity: 10,
    isReturnable: false,
    issuedBy: "Gowri Sankar",
    approvedBy: "Siva Kumar",
    condition: "Good",
    notes: "",
  });

  // Success / Alert message
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const teamMetadata: Record<string, { lead: string; phone: string; vehicle: string; issuedBy: string; date: string }> = {
    SRM01: { lead: "THENNARASU", phone: "7358129323", vehicle: "TN29AL4212", issuedBy: "GOWRI SANKAR", date: "2026-12-11" },
    SRM02: { lead: "Santhosh", phone: "9342377061", vehicle: "TN33AM9820", issuedBy: "Gowri Sankar", date: "13/11/2026" },
    SMR03: { lead: "Saran", phone: "9560654804", vehicle: "TN29AT1136 TVS SPORTS", issuedBy: "SIVAKUMAR", date: "13/11/2026" },
    SRM04: { lead: "Tamil", phone: "8838070940", vehicle: "TN56A7754", issuedBy: "Siva Kumar", date: "13/11/2026" },
    SRM05: { lead: "Unassigned Team 5", phone: "", vehicle: "Yard Allocation", issuedBy: "Office", date: "13/11/2026" },
    SRM06: { lead: "Sathish", phone: "9342477201", vehicle: "TN56A7754", issuedBy: "Gowri Sankar", date: "13/12/2026" },
    OFFICE: { lead: "Office In-Charge", phone: "+91 98427 12345", vehicle: "Erode Yard & Stores", issuedBy: "Gowri Sankar", date: "Daily Working" },
    SPARE: { lead: "Spare Store Room", phone: "", vehicle: "Yard Shelf", issuedBy: "Gowri Sankar", date: "Reserve" },
    SERVICE: { lead: "Authorized Service Center", phone: "", vehicle: "Repair Shop", issuedBy: "Siva Kumar", date: "In Maintenance" },
    SCRAP: { lead: "Condemned Scrap Yard", phone: "", vehicle: "Scrap Bay", issuedBy: "Siva Kumar", date: "Condemned" },
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [mRes, cRes] = await Promise.all([
        fetch("/api/machines"),
        fetch("/api/machines/consumables"),
      ]);

      const mData = await mRes.json();
      const cData = await cRes.json();

      if (mData.success) {
        setMachines(mData.machines || []);
        setMasterSummary(mData.masterSummary || null);
        if (mData.machines.length > 0 && !transferMachineId) {
          setTransferMachineId(mData.machines[0].id);
        }
      }

      if (cData.success) {
        setSiteIssues(cData.issues || []);
      }
    } catch (err: any) {
      console.error(err);
      setAlertMsg({ text: "Error loading machine data: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartInlineEdit = (m: any) => {
    setEditingId(m.id);
    setEditFormData({
      id: m.id,
      name: m.name,
      category: m.category,
      officeCount: m.officeCount,
      srm01Count: m.srm01Count,
      srm02Count: m.srm02Count,
      srm03Count: m.srm03Count,
      srm04Count: m.srm04Count,
      srm05Count: m.srm05Count,
      srm06Count: m.srm06Count,
      spareCount: m.spareCount,
      serviceCount: m.serviceCount,
      scrapCount: m.scrapCount,
      notes: m.notes || "",
    });
  };

  const handleSaveInlineEdit = async () => {
    if (!editingId) return;
    try {
      setSavingInline(true);
      const res = await fetch("/api/machines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (data.success) {
        setAlertMsg({ text: `Updated "${editFormData.name}" quantities successfully!`, type: "success" });
        setEditingId(null);
        loadData();
      } else {
        setAlertMsg({ text: data.error || "Update failed", type: "error" });
      }
    } catch (err: any) {
      setAlertMsg({ text: err.message, type: "error" });
    } finally {
      setSavingInline(false);
    }
  };

  const handleAddMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMachineForm),
      });
      const data = await res.json();
      if (data.success) {
        setAlertMsg({ text: `New machine "${newMachineForm.name}" registered successfully!`, type: "success" });
        setShowAddMachineModal(false);
        setNewMachineForm({
          name: "",
          category: "Power Tools",
          officeCount: 1,
          srm01Count: 0,
          srm02Count: 0,
          srm03Count: 0,
          srm04Count: 0,
          srm05Count: 0,
          srm06Count: 0,
          spareCount: 0,
          serviceCount: 0,
          scrapCount: 0,
          notes: "",
          imageUrl: "",
        });
        loadData();
      } else {
        setAlertMsg({ text: data.error || "Failed to add machine", type: "error" });
      }
    } catch (err: any) {
      setAlertMsg({ text: err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setAlertMsg(null);

      const res = await fetch("/api/machines/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: transferMachineId,
          fromGroup: transferFrom,
          toGroup: transferTo,
          qty: transferQty,
          purpose: transferPurpose,
          serviceVendor,
          faultDescription,
          repairCost: parseFloat(repairCost) || 0,
          postExpenseVoucher,
          notes: transferNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAlertMsg({ text: data.message, type: "success" });
        setShowTransferModal(false);
        loadData();
      } else {
        setAlertMsg({ text: data.error, type: "error" });
      }
    } catch (err: any) {
      setAlertMsg({ text: "Transfer failed: " + err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setAlertMsg(null);

      const res = await fetch("/api/machines/consumables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issueForm),
      });

      const data = await res.json();
      if (data.success) {
        setAlertMsg({ text: data.message, type: "success" });
        setShowIssueModal(false);
        setIssueForm({ ...issueForm, productName: '5" Cutting Wheel', quantity: 10, siteName: "", notes: "" });
        loadData();
      } else {
        setAlertMsg({ text: data.error, type: "error" });
      }
    } catch (err: any) {
      setAlertMsg({ text: "Failed to log consumable: " + err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnAction = async (issueId: string, currentIssued: number) => {
    const returnQtyStr = prompt(`Enter quantity returned (Max: ${currentIssued}):`, String(currentIssued));
    if (!returnQtyStr) return;
    const returnQty = parseFloat(returnQtyStr) || 0;

    try {
      const res = await fetch("/api/machines/consumables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: issueId,
          returnedQty: returnQty,
          condition: "Returned in Good Working Condition",
          notes: `Verified return of ${returnQty} item(s)`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertMsg({ text: data.message, type: "success" });
        loadData();
      } else {
        setAlertMsg({ text: data.error, type: "error" });
      }
    } catch (err: any) {
      setAlertMsg({ text: err.message, type: "error" });
    }
  };

  const handleExcelExport = () => {
    window.location.href = "/api/machines/excel";
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setAlertMsg(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/machines/excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setAlertMsg({ text: data.message, type: "success" });
        loadData();
      } else {
        setAlertMsg({ text: data.error, type: "error" });
      }
    } catch (err: any) {
      setAlertMsg({ text: "Excel import error: " + err.message, type: "error" });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredMachines = machines.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalAssetsLive = machines.reduce((s, m) => s + (m.totalCount || 0), 0);
  const totalInService = machines.reduce((s, m) => s + (m.serviceCount || 0), 0);
  const totalInOffice = machines.reduce((s, m) => s + (m.officeCount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      <ModuleHeaderWithAnalytics
        title="SRM Machine, Tool & Site Custody"
        subtitle="Exact multi-sheet synchronization matching 1_SRMachines_Tracking_2026_With_Images.xlsx · Live Team Custody & Consumables"
        badge="35 Assets Live"
        icon={Wrench}
        analyticsPreset="operations"
        analyticsCards={[
          {
            label: "Total Machine Types",
            value: machines.length.toString(),
            change: "Power Tools & Equipment",
            isPositive: true,
          },
          {
            label: "Total Assets in Fleet",
            value: totalAssetsLive.toString(),
            change: "Across all 6 SRM teams",
            isPositive: true,
          },
          {
            label: "In Yard / Office",
            value: totalInOffice.toString(),
            change: "Erode central custody",
            isPositive: true,
          },
          {
            label: "Under Repair / Service",
            value: totalInService.toString(),
            change: "Vendor repair tracking",
            isPositive: false,
          },
        ]}
        searchPlaceholder="Search machine name, tool model, category or notes..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        views={[
          { id: "matrix", label: "Custody Matrix", count: machines.length },
          { id: "teams", label: "Team Breakdown", count: 6 },
          { id: "whohaswhat", label: "Who Has What", count: 35 },
          { id: "consumables", label: "Site Consumables", count: siteIssues.length },
          { id: "service", label: "Service / Repairs", count: totalInService },
        ]}
        selectedView={activeTab}
        onViewChange={(v) => setActiveTab(v as any)}
        onExportExcel={handleExcelExport}
        onExportPDF={handlePDFExport}
        sampleData={[
          {
            "Machine Name": "Welding Machine 300A",
            Category: "Power Tools",
            "Office Count": "2",
            "SRM01 Count": "1",
            "SRM02 Count": "1",
            "Total Count": "4",
            Notes: "Single phase inverter welder",
          },
        ]}
        sampleColumns={[
          "Machine Name",
          "Category",
          "Office Count",
          "SRM01 Count",
          "SRM02 Count",
          "Total Count",
          "Notes",
        ]}
        customActions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddMachineModal(true)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Machine
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelImport}
              accept=".xlsx"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Sync Excel
            </button>
            <button
              onClick={() => {
                setTransferFrom("OFFICE");
                setTransferTo("SRM01");
                setShowTransferModal(true);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-xs transition"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Transfer Machine
            </button>
          </div>
        }
      />

      {alertMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            alertMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-semibold">{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      {masterSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Machine Count</span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
              {masterSummary.totalMachineCount}
            </span>
            <span className="text-[10px] text-slate-500">All registered physical units</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">SR Final Working Count</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {masterSummary.srFinalWorkingCount}
            </span>
            <span className="text-[10px] text-emerald-700/80">Active working equipment</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Office &amp; Yard Stock</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
              {masterSummary.officeTotal}
            </span>
            <span className="text-[10px] text-slate-500">In Head Office Godown</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">In Field Teams (SRM01-06)</span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block">
              {masterSummary.srm01Total + masterSummary.srm02Total + masterSummary.srm03Total + masterSummary.srm04Total + masterSummary.srm05Total + masterSummary.srm06Total}
            </span>
            <span className="text-[10px] text-slate-500">Across 6 active site teams</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">In Service / Repair</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
              {masterSummary.serviceTotal}
            </span>
            <span className="text-[10px] text-slate-500">Workshop maintenance</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Scrapped / Condemned</span>
            <span className="text-2xl font-black text-red-600 dark:text-red-400 mt-1 block">
              {masterSummary.scrapTotal}
            </span>
            <span className="text-[10px] text-slate-500">Condemned assets</span>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("matrix")}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "matrix"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Layers className="w-4 h-4" />
          Tab 1 — Master Matrix (Total_Machine_Inventory)
        </button>

        <button
          onClick={() => setActiveTab("teams")}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "teams"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <HardHat className="w-4 h-4" />
          Tab 2 — Team &amp; Location Sheets (SRM01–06, Office, Spare, Service, Scrap)
        </button>

        <button
          onClick={() => setActiveTab("whohaswhat")}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "whohaswhat"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Users className="w-4 h-4" />
          Tab 3 — &quot;Who Has What&quot; Live Custody Lookup
        </button>

        <button
          onClick={() => setActiveTab("consumables")}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "consumables"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <FileText className="w-4 h-4" />
          Tab 4 — Site Consumables &amp; Daily Issue Register ({siteIssues.length})
        </button>

        <button
          onClick={() => setActiveTab("service")}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "service"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Tab 5 — Service, Repair &amp; Scrap Lifecycle
        </button>
      </div>

      {/* TAB 1: MASTER MATRIX */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search materials or machines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Working Final Count
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Service
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                Scrap
              </span>
            </div>
          </div>

          {/* Master Matrix Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                    <th className="py-3 px-3 text-center w-12">S.No</th>
                    <th className="py-3 px-2 text-center w-16">Photo</th>
                    <th className="py-3 px-3 min-w-[200px]">Materials / Machine Name</th>
                    <th className="py-3 px-2.5 text-center bg-emerald-900/60 text-emerald-300 font-bold min-w-[70px]">
                      SR Final
                    </th>
                    <th className="py-3 px-2.5 text-center bg-blue-950 text-blue-200 font-bold min-w-[70px]">
                      Total Count
                    </th>
                    <th className="py-3 px-2 text-center bg-slate-800/80">Office</th>
                    <th className="py-3 px-2 text-center bg-slate-800/80">SRM01</th>
                    <th className="py-3 px-2 text-center bg-slate-800/80">SRM02</th>
                    <th className="py-3 px-2 text-center bg-slate-800/80">SMR03</th>
                    <th className="py-3 px-2 text-center bg-slate-800/80">SRM04</th>
                    <th className="py-3 px-2 text-center bg-slate-800/80">SRM05</th>
                    <th className="py-3 px-2 text-center bg-slate-800/80">SRM06</th>
                    <th className="py-3 px-2 text-center bg-slate-800/80 text-emerald-300">Spare</th>
                    <th className="py-3 px-2 text-center bg-slate-800/80 text-amber-300">Service</th>
                    <th className="py-3 px-2 text-center bg-slate-800/80 text-red-300">Scrap</th>
                    <th className="py-3 px-3 min-w-[140px]">Notes</th>
                    <th className="py-3 px-3 text-center min-w-[110px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMachines.map((m) => {
                    const isEditing = editingId === m.id;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">{m.sNo}</td>

                        {/* Real Thumbnail with Zoom */}
                        <td className="py-2 px-2 text-center">
                          {m.imageUrl ? (
                            <div
                              onClick={() => {
                                setZoomImage(m.imageUrl);
                                setZoomTitle(`${m.sNo}. ${m.name}`);
                              }}
                              className="w-10 h-10 mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs hover:scale-110 hover:ring-2 hover:ring-blue-500 cursor-pointer transition-transform flex items-center justify-center group relative"
                              title="Click to zoom machine photo"
                            >
                              <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-10 h-10 mx-auto rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <Wrench className="w-4 h-4" />
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {m.name}
                          <span className="block text-[10px] text-slate-400 font-normal">{m.category}</span>
                        </td>

                        <td className="py-2.5 px-2.5 text-center font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 font-mono text-sm">
                          {isEditing ? (
                            (Number(editFormData.officeCount) || 0) +
                            (Number(editFormData.srm01Count) || 0) +
                            (Number(editFormData.srm02Count) || 0) +
                            (Number(editFormData.srm03Count) || 0) +
                            (Number(editFormData.srm04Count) || 0) +
                            (Number(editFormData.srm05Count) || 0) +
                            (Number(editFormData.srm06Count) || 0) +
                            (Number(editFormData.spareCount) || 0)
                          ) : (
                            m.srFinalCount
                          )}
                        </td>

                        <td className="py-2.5 px-2.5 text-center font-bold text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20 font-mono text-sm">
                          {isEditing ? (
                            (Number(editFormData.officeCount) || 0) +
                            (Number(editFormData.srm01Count) || 0) +
                            (Number(editFormData.srm02Count) || 0) +
                            (Number(editFormData.srm03Count) || 0) +
                            (Number(editFormData.srm04Count) || 0) +
                            (Number(editFormData.srm05Count) || 0) +
                            (Number(editFormData.srm06Count) || 0) +
                            (Number(editFormData.spareCount) || 0) +
                            (Number(editFormData.serviceCount) || 0) +
                            (Number(editFormData.scrapCount) || 0)
                          ) : (
                            m.totalCount
                          )}
                        </td>

                        {/* Editable or Display Count Cells */}
                        {[
                          { key: "officeCount", val: m.officeCount },
                          { key: "srm01Count", val: m.srm01Count },
                          { key: "srm02Count", val: m.srm02Count },
                          { key: "srm03Count", val: m.srm03Count },
                          { key: "srm04Count", val: m.srm04Count },
                          { key: "srm05Count", val: m.srm05Count },
                          { key: "srm06Count", val: m.srm06Count },
                          { key: "spareCount", val: m.spareCount, color: "text-emerald-600 dark:text-emerald-400" },
                          { key: "serviceCount", val: m.serviceCount, color: "text-amber-600 dark:text-amber-400 font-bold" },
                          { key: "scrapCount", val: m.scrapCount, color: "text-red-600 dark:text-red-400 font-bold" },
                        ].map((col) => (
                          <td key={col.key} className={`py-2 px-1 text-center font-mono ${col.color || "text-slate-700 dark:text-slate-300"}`}>
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editFormData[col.key] || 0}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, [col.key]: parseInt(e.target.value) || 0 })
                                }
                                className="w-11 px-1 py-1 text-center text-xs font-bold rounded border border-blue-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                              />
                            ) : (
                              col.val || "-"
                            )}
                          </td>
                        ))}

                        <td className="py-2.5 px-3 text-[11px] text-slate-500 dark:text-slate-400 italic">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editFormData.notes || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                              className="w-full px-2 py-1 text-xs rounded border border-blue-400 bg-white dark:bg-slate-800"
                            />
                          ) : (
                            m.notes || "-"
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={handleSaveInlineEdit}
                                disabled={savingInline}
                                className="px-2 py-1 text-[11px] font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-2xs cursor-pointer"
                                title="Save changes"
                              >
                                <Save className="w-3 h-3" /> Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-1.5 py-1 text-[11px] font-bold rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleStartInlineEdit(m)}
                                className="px-2 py-1 text-[11px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                                title="Edit quantities directly"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setTransferMachineId(m.id);
                                  setShowTransferModal(true);
                                }}
                                className="px-2 py-1 text-[11px] font-bold rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition cursor-pointer"
                              >
                                Transfer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INDIVIDUAL TEAM & LOCATION SHEETS */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          {/* Team Selector Pills */}
          <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            {["SRM01", "SRM02", "SMR03", "SRM04", "SRM05", "SRM06", "OFFICE", "SPARE", "SERVICE", "SCRAP"].map((grp) => (
              <button
                key={grp}
                onClick={() => setSelectedTeam(grp)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedTeam === grp
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span>{grp}</span>
                {teamMetadata[grp]?.vehicle && (
                  <span className="text-[10px] opacity-80 font-mono">({teamMetadata[grp].vehicle.split(" ")[0]})</span>
                )}
              </button>
            ))}
          </div>

          {/* Team Custody Sheet Card */}
          {teamMetadata[selectedTeam] && (
            <div className="bg-gradient-to-r from-teal-50 via-sky-50 to-indigo-50 rounded-2xl p-6 text-slate-800 border border-teal-200/80 shadow-md">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-teal-500/15 text-teal-800 border border-teal-500/25">
                      TRACKING SHEET: {selectedTeam}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-800 border border-emerald-500/25">
                      Status: Active Team Custody
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mt-2 text-slate-900">
                    {teamMetadata[selectedTeam].lead || "Site Assignment"}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-600 mt-1.5">
                    {teamMetadata[selectedTeam].phone && <span>Mobile: {teamMetadata[selectedTeam].phone}</span>}
                    <span>Vehicle: {teamMetadata[selectedTeam].vehicle}</span>
                    <span>Issued By: {teamMetadata[selectedTeam].issuedBy}</span>
                    <span>Date: {teamMetadata[selectedTeam].date}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setTransferFrom(selectedTeam);
                      setTransferTo("OFFICE");
                      setShowTransferModal(true);
                    }}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-teal-200/90 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                    Return Items to Office
                  </button>

                  <button
                    onClick={() => {
                      setTransferFrom("OFFICE");
                      setTransferTo(selectedTeam);
                      setShowTransferModal(true);
                    }}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Allocate Machine to {selectedTeam}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filtered Team Inventory Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Equipment &amp; Tools Allocated to {selectedTeam}
              </h4>
              <span className="text-xs text-slate-500">
                Matches Sheet <code className="font-mono font-bold text-blue-600">{selectedTeam}</code> in Excel
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-2 w-14 text-center">Photo</th>
                    <th className="py-2.5 px-3">Materials / Machine Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3">Assigned Vehicle</th>
                    <th className="py-2.5 px-3">Lead / Custodian</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {machines
                    .filter((m) => {
                      const key = selectedTeam.toLowerCase() === "smr03" ? "srm03Count" : `${selectedTeam.toLowerCase()}Count`;
                      return ((m as any)[key] || 0) > 0;
                    })
                    .map((m, idx) => {
                      const key = selectedTeam.toLowerCase() === "smr03" ? "srm03Count" : `${selectedTeam.toLowerCase()}Count`;
                      const count = (m as any)[key] || 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-2 text-center">
                            {m.imageUrl ? (
                              <div
                                onClick={() => {
                                  setZoomImage(m.imageUrl);
                                  setZoomTitle(`${m.name}`);
                                }}
                                className="w-9 h-9 mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-110 transition"
                              >
                                <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-9 h-9 mx-auto rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                <Wrench className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{m.name}</td>
                          <td className="py-2.5 px-3 text-slate-500">{m.category}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                            {count}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {teamMetadata[selectedTeam]?.vehicle || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                            {teamMetadata[selectedTeam]?.lead || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 italic">{m.notes || "-"}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => {
                                setTransferMachineId(m.id);
                                setTransferFrom(selectedTeam);
                                setTransferTo("OFFICE");
                                setTransferQty(1);
                                setShowTransferModal(true);
                              }}
                              className="px-2 py-1 text-[11px] font-bold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                            >
                              Transfer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: "WHO HAS WHAT" LIVE CUSTODY LOOKUP */}
      {activeTab === "whohaswhat" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                &quot;Who Has What&quot; &mdash; Real-Time Custody Search
              </h3>
              <p className="text-xs text-slate-500">
                Locate any specific machine or tool across all 6 site teams, office stores, spare stock, or workshop repair
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by machine or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMachines.map((m) => {
              const activeHolders = [
                { grp: "OFFICE", count: m.officeCount },
                { grp: "SRM01", count: m.srm01Count },
                { grp: "SRM02", count: m.srm02Count },
                { grp: "SMR03", count: m.srm03Count },
                { grp: "SRM04", count: m.srm04Count },
                { grp: "SRM05", count: m.srm05Count },
                { grp: "SRM06", count: m.srm06Count },
                { grp: "SPARE", count: m.spareCount },
                { grp: "SERVICE", count: m.serviceCount },
                { grp: "SCRAP", count: m.scrapCount },
              ].filter((h) => h.count > 0);

              return (
                <div
                  key={m.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {m.imageUrl ? (
                      <div
                        onClick={() => {
                          setZoomImage(m.imageUrl);
                          setZoomTitle(m.name);
                        }}
                        className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer hover:scale-105 transition"
                      >
                        <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                        <Wrench className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{m.name}</h4>
                      <span className="text-[10px] text-slate-400 block">{m.category}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                          Working: {m.srFinalCount}
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                          Total: {m.totalCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Custody Breakdown</span>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {activeHolders.map((h) => {
                        const meta = teamMetadata[h.grp];
                        return (
                          <div key={h.grp} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50 dark:bg-slate-800/60">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{h.grp}</span>
                              {meta?.lead && <span className="text-[10px] text-slate-500 ml-1.5">({meta.lead})</span>}
                            </div>
                            <span className="font-mono font-bold text-blue-600">{h.count} unit(s)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setTransferMachineId(m.id);
                      setShowTransferModal(true);
                    }}
                    className="w-full py-1.5 text-xs font-bold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Quick Transfer
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SITE CONSUMABLES & DAILY ISSUE REGISTER */}
      {activeTab === "consumables" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Daily Site Consumables &amp; Safety Gear Register
              </h3>
              <p className="text-xs text-slate-500">
                Track site-issued welding rods, cutting wheels, safety belts, level tubes &amp; paint per team and project site
              </p>
            </div>

            <button
              onClick={() => setShowIssueModal(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Log Daily Site Consumable Issue
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3">Project Site</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty Issued</th>
                    <th className="py-2.5 px-3 text-center">Qty Returned</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3">Issued By</th>
                    <th className="py-2.5 px-3">Approved By</th>
                    <th className="py-2.5 px-3">Condition / Notes</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {siteIssues.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        No site consumable issues logged yet.
                      </td>
                    </tr>
                  ) : (
                    siteIssues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {new Date(issue.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-blue-600">{issue.team}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{issue.siteName}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">{issue.productName}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{Number(issue.quantity)}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-emerald-600 font-bold">
                          {Number(issue.returnedQty)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {issue.isReturnable ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Returnable
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              Consumable
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{issue.issuedBy}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{issue.approvedBy}</td>
                        <td className="py-2.5 px-3 text-slate-500 italic text-[11px]">{issue.condition || issue.notes || "-"}</td>
                        <td className="py-2.5 px-3 text-center">
                          {issue.isReturnable && Number(issue.returnedQty) < Number(issue.quantity) && (
                            <button
                              onClick={() => handleReturnAction(issue.id, Number(issue.quantity))}
                              className="px-2 py-1 text-[11px] font-bold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                            >
                              Log Return
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SERVICE, REPAIR & SCRAP LIFECYCLE */}
      {activeTab === "service" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Service, Workshop Repairs &amp; Scrap Lifecycle
              </h3>
              <p className="text-xs text-slate-500">
                Audit trail for broken machines sent for servicing, mechanic charges posted to GL 6060, and condemned scrap items
              </p>
            </div>
            <button
              onClick={() => {
                setTransferFrom("OFFICE");
                setTransferTo("SERVICE");
                setShowTransferModal(true);
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              + Send Machine to Service / Workshop
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Active in Service */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4" />
                  Currently In Service / Workshop ({machines.filter((m) => m.serviceCount > 0).length})
                </h4>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {machines.filter((m) => m.serviceCount > 0).length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">No machines currently in workshop service.</p>
                ) : (
                  machines
                    .filter((m) => m.serviceCount > 0)
                    .map((m) => (
                      <div key={m.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{m.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Quantity: <span className="font-bold text-amber-600 font-mono">{m.serviceCount}</span> &middot; Category: {m.category}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setTransferMachineId(m.id);
                            setTransferFrom("SERVICE");
                            setTransferTo("OFFICE");
                            setShowTransferModal(true);
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                        >
                          Return to Office
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Scrapped Assets */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Condemned &amp; Scrapped Assets ({machines.filter((m) => m.scrapCount > 0).length})
                </h4>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {machines.filter((m) => m.scrapCount > 0).length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">No condemned scrap items.</p>
                ) : (
                  machines
                    .filter((m) => m.scrapCount > 0)
                    .map((m) => (
                      <div key={m.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{m.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Scrap Count: <span className="font-bold text-red-600 font-mono">{m.scrapCount}</span> &middot; Reason: Wear &amp; Tear
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          Scrapped
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMAGE LIGHTBOX ZOOM */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-4 space-y-3 shadow-2xl relative"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                {zoomTitle || "Machine Photo Preview"}
              </h3>
              <button
                onClick={() => setZoomImage(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[70vh]">
              <img src={zoomImage} alt={zoomTitle} className="w-full h-auto max-h-[70vh] object-contain" />
            </div>
            <div className="text-center text-xs text-slate-400 pt-1">
              Click anywhere outside or press ESC to close preview
            </div>
          </div>
        </div>
      )}

      {/* MODAL: +ADD MACHINE */}
      {showAddMachineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Add New Machine / Tool Asset
              </h3>
              <button onClick={() => setShowAddMachineModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddMachineSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Machine / Tool Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Magnetic Core Drill Machine"
                  value={newMachineForm.name}
                  onChange={(e) => setNewMachineForm({ ...newMachineForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Category *</label>
                  <select
                    value={newMachineForm.category}
                    onChange={(e) => setNewMachineForm({ ...newMachineForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="Power Tools">Power Tools</option>
                    <option value="Bits & Scales">Bits &amp; Scales</option>
                    <option value="Bags & Safety">Bags &amp; Safety</option>
                    <option value="Heavy Vehicles">Heavy Vehicles</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Initial Office Count</label>
                  <input
                    type="number"
                    min="0"
                    value={newMachineForm.officeCount}
                    onChange={(e) => setNewMachineForm({ ...newMachineForm, officeCount: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Photo URL / Path (Optional)</label>
                <input
                  type="text"
                  placeholder="/uploads/machines/m_new.png"
                  value={newMachineForm.imageUrl}
                  onChange={(e) => setNewMachineForm({ ...newMachineForm, imageUrl: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Model number, specifications, purchase notes"
                  value={newMachineForm.notes}
                  onChange={(e) => setNewMachineForm({ ...newMachineForm, notes: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMachineModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-xs"
                >
                  {submitting ? "Adding..." : "Add Machine to Master"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFER MACHINE */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                Transfer Machine / Tool Custody
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Select Machine / Tool *</label>
                <select
                  value={transferMachineId}
                  onChange={(e) => setTransferMachineId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.sNo}. {m.name} ({m.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">From Location *</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    {["OFFICE", "SRM01", "SRM02", "SMR03", "SRM04", "SRM05", "SRM06", "SPARE", "SERVICE", "SCRAP"].map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">To Destination *</label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    {["SRM01", "SRM02", "SMR03", "SRM04", "SRM05", "SRM06", "OFFICE", "SPARE", "SERVICE", "SCRAP"].map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Quantity to Move *</label>
                  <input
                    type="number"
                    min="1"
                    value={transferQty}
                    onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Purpose / Reason *</label>
                  <input
                    type="text"
                    value={transferPurpose}
                    onChange={(e) => setTransferPurpose(e.target.value)}
                    placeholder="Site mobilization, repair, return"
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Service details if moving to SERVICE */}
              {transferTo === "SERVICE" && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">Workshop &amp; Repair Details</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mechanic / Vendor</label>
                      <input
                        type="text"
                        value={serviceVendor}
                        onChange={(e) => setServiceVendor(e.target.value)}
                        placeholder="e.g. Sri Murugan Power Tool Works"
                        className="w-full p-1.5 text-xs rounded border border-amber-300 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Repair Cost (₹)</label>
                      <input
                        type="number"
                        value={repairCost}
                        onChange={(e) => setRepairCost(e.target.value)}
                        placeholder="0.00"
                        className="w-full p-1.5 text-xs rounded border border-amber-300 bg-white dark:bg-slate-900 font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Fault Description</label>
                    <input
                      type="text"
                      value={faultDescription}
                      onChange={(e) => setFaultDescription(e.target.value)}
                      placeholder="Armature coil burnt, switch replacement"
                      className="w-full p-1.5 text-xs rounded border border-amber-300 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={postExpenseVoucher}
                      onChange={(e) => setPostExpenseVoucher(e.target.checked)}
                      className="rounded text-amber-600 cursor-pointer"
                    />
                    <span className="text-[11px] text-amber-900 dark:text-amber-300 font-semibold">
                      Automatically post double-entry voucher to Machinery Repairs (GL 6060)
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Additional Notes</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Optional custody verification notes"
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-xs"
                >
                  {submitting ? "Processing..." : "Confirm Transfer & Update Master Matrix"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG SITE CONSUMABLE ISSUE */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Log Daily Site Consumable / Safety Gear Issue
              </h3>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Issue Date *</label>
                  <input
                    type="date"
                    required
                    value={issueForm.date}
                    onChange={(e) => setIssueForm({ ...issueForm, date: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Assigned Team *</label>
                  <select
                    value={issueForm.team}
                    onChange={(e) => setIssueForm({ ...issueForm, team: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    {["SRM01", "SRM02", "SMR03", "SRM04", "SRM05", "SRM06", "OFFICE"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Project Site Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Gem Hospital / Vellalar Edu. Trust / Kyro"
                  value={issueForm.siteName}
                  onChange={(e) => setIssueForm({ ...issueForm, siteName: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Item Description *</label>
                  <input
                    type="text"
                    required
                    placeholder='e.g., 5" Cutting Wheel, Welding Rods'
                    value={issueForm.productName}
                    onChange={(e) => setIssueForm({ ...issueForm, productName: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Quantity Issued *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={issueForm.quantity}
                    onChange={(e) => setIssueForm({ ...issueForm, quantity: parseFloat(e.target.value) || 1 })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Issued By *</label>
                  <input
                    type="text"
                    required
                    value={issueForm.issuedBy}
                    onChange={(e) => setIssueForm({ ...issueForm, issuedBy: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Approved By *</label>
                  <input
                    type="text"
                    required
                    value={issueForm.approvedBy}
                    onChange={(e) => setIssueForm({ ...issueForm, approvedBy: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="returnableToggle"
                  checked={issueForm.isReturnable}
                  onChange={(e) => setIssueForm({ ...issueForm, isReturnable: e.target.checked })}
                  className="rounded text-blue-600 cursor-pointer"
                />
                <label htmlFor="returnableToggle" className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                  This item is RETURNABLE (e.g., Safety Belts, Level Tube, Drill Bits, Hand Tools)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-xs"
                >
                  {submitting ? "Logging..." : "Save to Site Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive / Delete Modal */}
      <ArchiveConfirmModal
        isOpen={archiveModal.isOpen}
        title="Archive Machine / Equipment"
        message="Are you sure you want to archive this machine? It will be removed from active team custody tracking."
        recordLabel={archiveModal.machineName}
        onConfirm={handleArchive}
        onCancel={() =>
          setArchiveModal({ isOpen: false, machineId: "", machineName: "", loading: false })
        }
        loading={archiveModal.loading}
      />
    </div>
  );
}
