"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Layers,
  Search,
  Filter,
  DollarSign,
  Building,
  CheckCircle2,
  Calendar,
  Warehouse,
  Eye,
  X,
  ClipboardCheck,
  RotateCcw,
  ZoomIn,
  Truck,
  ShieldCheck,
  Check,
  Clock,
  Trash2,
} from "lucide-react";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import ArchiveConfirmModal from "@/components/common/ArchiveConfirmModal";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"consumables" | "tiles" | "issues" | "checklists">("consumables");
  const [materials, setMaterials] = useState<any[]>([]);
  const [tiles, setTiles] = useState<any[]>([]);
  const [siteIssues, setSiteIssues] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [totalValuation, setTotalValuation] = useState("0.00");
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [checklistFilter, setChecklistFilter] = useState<"ALL" | "WELDER" | "LAYER" | "GENERAL">("ALL");

  // Lightbox Zoom Modal
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState<string>("");

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Add Item Form
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "General Hardware",
    unit: "Nos",
    currentStock: 10,
    minAlertStock: 5,
    unitCost: 0,
    yardLocation: "Erode Main Yard",
    imageUrl: "",
  });

  // Issue to Site Form
  const [issueForm, setIssueForm] = useState({
    date: new Date().toISOString().split("T")[0],
    team: "SRM01",
    siteName: "SSM School_Site",
    projectId: "",
    productName: '5" Cutting Wheel',
    quantity: 10,
    isReturnable: false,
    issuedBy: "Gowri Sankar",
    approvedBy: "Siva Kumar",
    condition: "Good",
    notes: "",
  });

  const [alertMsg, setAlertMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [invRes, tileRes, issueRes, chkRes, prjRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/inventory/tiles"),
        fetch("/api/inventory/issues"),
        fetch("/api/inventory/checklists"),
        fetch("/api/projects"),
      ]);

      const invData = await invRes.json();
      const tileData = await tileRes.json();
      const issueData = await issueRes.json();
      const chkData = await chkRes.json();
      const prjData = await prjRes.json();

      if (invData.success) {
        setMaterials(invData.materials || []);
        setTotalValuation(invData.totalValuation || "0.00");
        setLowStockCount(invData.lowStockCount || 0);
      }
      if (tileData.success) {
        setTiles(tileData.tiles || []);
      }
      if (issueData.success) {
        setSiteIssues(issueData.issues || []);
      }
      if (chkData.success) {
        setChecklists(chkData.checklists || []);
      }
      if (prjData.success) {
        setProjects(prjData.projects || []);
      }
    } catch (e: any) {
      console.error("Error fetching inventory data:", e);
      setAlertMsg({ text: "Failed to load inventory: " + e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Adjust material stock (+/-)
  async function handleAdjustStock(id: string, delta: number) {
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, delta }),
      });
      const data = await res.json();
      if (data.success) {
        setMaterials((prev) =>
          prev.map((m) => (m.id === id ? { ...m, currentStock: data.material.currentStock } : m))
        );
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  // Adjust tile stock (+/-)
  async function handleAdjustTile(id: string, currentQty: number, delta: number) {
    try {
      const newStock = Math.max(0, currentQty + delta);
      const res = await fetch("/api/inventory/tiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, availableStock: newStock, godownStock: newStock }),
      });
      const data = await res.json();
      if (data.success) {
        setTiles((prev) =>
          prev.map((t) => (t.id === id ? { ...t, availableStock: newStock, godownStock: newStock } : t))
        );
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  // Toggle checklist verified status
  async function handleToggleChecklist(id: string, currentStatus: string) {
    try {
      const newStatus = currentStatus === "VERIFIED" ? "PENDING" : "VERIFIED";
      const res = await fetch("/api/inventory/checklists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus, verifiedBy: "Gowri Sankar" }),
      });
      const data = await res.json();
      if (data.success) {
        setChecklists((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: newStatus, verifiedAt: new Date().toISOString() } : c))
        );
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  // Submit new consumable item
  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemForm),
      });
      const data = await res.json();
      if (data.success) {
        setAlertMsg({ text: `Material "${itemForm.name}" created successfully!`, type: "success" });
        setShowItemModal(false);
        fetchData();
      } else {
        setAlertMsg({ text: data.error || "Failed to create item", type: "error" });
      }
    } catch (e: any) {
      setAlertMsg({ text: e.message, type: "error" });
    }
  }

  // Submit Issue to Site
  async function handleIssueSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issueForm),
      });
      const data = await res.json();
      if (data.success) {
        setAlertMsg({ text: `Dispatched ${issueForm.quantity} x "${issueForm.productName}" to ${issueForm.siteName}`, type: "success" });
        setShowIssueModal(false);
        fetchData();
      } else {
        setAlertMsg({ text: data.error || "Failed to dispatch", type: "error" });
      }
    } catch (e: any) {
      setAlertMsg({ text: e.message, type: "error" });
    }
  }

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (categoryFilter === "ALL") return true;
    if (categoryFilter === "LOW_STOCK") return Number(m.currentStock) <= Number(m.minAlertStock);
    return m.category.toLowerCase().includes(categoryFilter.toLowerCase());
  });

  const filteredChecklists = checklists.filter((c) => {
    if (checklistFilter === "ALL") return true;
    return c.checklistType === checklistFilter;
  });

  // Archive Modal State
  const [archiveModal, setArchiveModal] = useState<{
    isOpen: boolean;
    recordId: string;
    recordLabel: string;
    loading: boolean;
  }>({
    isOpen: false,
    recordId: "",
    recordLabel: "",
    loading: false,
  });

  const handleExportExcel = () => {
    let exportData: any[] = [];
    if (activeTab === "consumables") {
      exportData = filteredMaterials.map((m) => ({
        "Item Code": m.itemCode,
        Name: m.name,
        Category: m.category,
        Unit: m.unit,
        "Current Stock": m.currentStock,
        "Min Alert Stock": m.minAlertStock,
        "Unit Cost (₹)": m.unitCost,
      }));
    } else if (activeTab === "tiles") {
      exportData = tiles.map((t) => ({
        Type: t.type,
        Profile: t.profile,
        Thickness: t.thickness,
        Color: t.color,
        "Stock (SqFt)": t.stockSqFt,
      }));
    } else {
      exportData = siteIssues.map((s) => ({
        Date: s.date,
        Item: s.productName,
        Site: s.siteName,
        Quantity: s.quantity,
        IssuedBy: s.issuedBy,
      }));
    }
    exportToExcel(exportData, `inventory_${activeTab}`);
  };

  const handleExportPDF = () => {
    const printRows = filteredMaterials.map((m) => [
      m.itemCode,
      m.name,
      m.category,
      `${m.currentStock} ${m.unit}`,
      `₹ ${Number(m.unitCost || 0).toLocaleString("en-IN")}`,
    ]);
    exportToPDF("Yard Inventory Stock Report", ["Item Code", "Name", "Category", "Stock", "Unit Cost"], printRows, "yard_inventory");
  };

  const handleArchive = async () => {
    try {
      setArchiveModal((prev) => ({ ...prev, loading: true }));
      setMaterials((prev) => prev.filter((m) => m.id !== archiveModal.recordId));
      setSiteIssues((prev) => prev.filter((s) => s.id !== archiveModal.recordId));
      setArchiveModal({ isOpen: false, recordId: "", recordLabel: "", loading: false });
    } catch (err) {
      console.error(err);
      setArchiveModal((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <ModuleHeaderWithAnalytics
        title="Roofing Yard Inventory & Dispatches"
        subtitle="Matching 2_New_Inventory_Management_With_Images.xlsx · Current Stock, Tiles, Site Issue Register & Pre-Dispatch Checklists"
        badge="Yard Inventory"
        icon={Package}
        analyticsPreset="operations"
        analyticsCards={[
          {
            label: "Yard Stock Valuation",
            value: `₹ ${Number(totalValuation).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
            change: "Inventory Asset 1030",
            isPositive: true,
          },
          {
            label: "Current Consumables",
            value: `${materials.length} Items`,
            change: "Fast moving hardware",
            isPositive: true,
          },
          {
            label: "Low Stock Alerts",
            value: `${lowStockCount} Items`,
            change: lowStockCount > 0 ? "Below reorder level" : "Optimal safety stock",
            isPositive: lowStockCount === 0,
          },
          {
            label: "Checklist Points",
            value: `${checklists.length} Rules`,
            change: "Welder & Layer QC",
            isPositive: true,
          },
        ]}
        searchPlaceholder="Search consumable item name, item code (MTR-...), or category..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        views={[
          { id: "consumables", label: "Stock Consumables", count: materials.length },
          { id: "tiles", label: "Roofing Sheets & Tiles", count: tiles.length },
          { id: "issues", label: "Site Issue Register", count: siteIssues.length },
          { id: "checklists", label: "Dispatch Checklists", count: checklists.length },
        ]}
        selectedView={activeTab}
        onViewChange={(v) => setActiveTab(v as any)}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        sampleData={[
          {
            "Item Code": "MTR-26-001",
            "Item Name": "Cutting Wheel 4 Inch (Dewalt)",
            Category: "Abrasives & Cutting",
            Unit: "Nos",
            "Current Stock": "150",
            "Min Alert Stock": "30",
            "Unit Cost (₹)": "45",
          },
        ]}
        sampleColumns={[
          "Item Code",
          "Item Name",
          "Category",
          "Unit",
          "Current Stock",
          "Min Alert Stock",
          "Unit Cost (₹)",
        ]}
        customActions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowItemModal(true)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" /> + Consumable
            </button>
            <button
              onClick={() => setShowIssueModal(true)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-xs transition"
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> + Issue to Site
            </button>
          </div>
        }
      />

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("consumables")}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "consumables"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Package className="w-4 h-4" />
          Tab 1 — Current Stock ({materials.length} Consumables &amp; Hardware)
        </button>

        <button
          onClick={() => setActiveTab("tiles")}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "tiles"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Layers className="w-4 h-4" />
          Tab 2 — Tiles &amp; Godown Stock ({tiles.length} Varieties)
        </button>

        <button
          onClick={() => setActiveTab("issues")}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "issues"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Truck className="w-4 h-4" />
          Tab 3 — Site &amp; Team Issue Register ({siteIssues.length} Entries)
        </button>

        <button
          onClick={() => setActiveTab("checklists")}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "checklists"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          Tab 4 — Pre-Dispatch Checklists (Welder &amp; Layer Teams)
        </button>
      </div>

      {/* TAB 1: CURRENT STOCK CONSUMABLES */}
      {activeTab === "consumables" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search material or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {["ALL", "Cutting Wheels", "Drill Bits", "Fasteners", "Safety", "Tiles", "LOW_STOCK"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {cat === "LOW_STOCK" ? "⚠️ Low Stock" : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Hardware &amp; Consumables Master Register
                </h3>
                <p className="text-xs text-slate-500">
                  Exact item list matching Sheet <code className="font-mono font-bold text-blue-600">Current_Stock</code> in Excel with real photos
                </p>
              </div>
              <span className="text-xs text-slate-500">
                {filteredMaterials.length} of {materials.length} items
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                    <th className="py-2.5 px-2 w-14 text-center">Photo</th>
                    <th className="py-2.5 px-4 min-w-[200px]">Material Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Min Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                    <th className="py-2.5 px-3 text-center">Available Stock</th>
                    <th className="py-2.5 px-3 text-right">Total Valuation (₹)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Quick Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMaterials.map((m) => {
                    const stock = Number(m.currentStock);
                    const min = Number(m.minAlertStock);
                    const isLow = stock <= min;
                    const val = stock * Number(m.unitCost || m.rate || 0);

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">{m.sNo}</td>

                        {/* Photo with Click-to-Zoom */}
                        <td className="py-2 px-2 text-center">
                          {m.imageUrl ? (
                            <div
                              onClick={() => {
                                setZoomImage(m.imageUrl);
                                setZoomTitle(`${m.sNo}. ${m.name}`);
                              }}
                              className="w-10 h-10 mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs hover:scale-110 hover:ring-2 hover:ring-blue-500 cursor-pointer transition-transform relative group"
                              title="Click to zoom photo"
                            >
                              <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-10 h-10 mx-auto rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{m.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{m.itemCode}</div>
                        </td>

                        <td className="py-2.5 px-3 text-slate-500">{m.category}</td>

                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {min} {m.unit}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-medium">
                          ₹ {Number(m.unitCost || m.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                          {stock} {m.unit}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₹ {val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                              <AlertTriangle className="h-3 w-3" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Optimal
                            </span>
                          )}
                        </td>

                        {/* Quick +/- Counter */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleAdjustStock(m.id, -1)}
                              disabled={stock <= 0}
                              className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center cursor-pointer transition disabled:opacity-40"
                              title="Deduct 1"
                            >
                              -
                            </button>
                            <button
                              onClick={() => handleAdjustStock(m.id, 1)}
                              className="w-6 h-6 rounded bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 font-bold flex items-center justify-center cursor-pointer transition"
                              title="Add 1"
                            >
                              +
                            </button>
                            <button
                              onClick={() => {
                                setIssueForm({
                                  ...issueForm,
                                  productName: m.name,
                                  quantity: 1,
                                });
                                setShowIssueModal(true);
                              }}
                              className="ml-1.5 px-2 py-1 text-[10px] font-bold rounded bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer"
                              title="Dispatch to site"
                            >
                              Issue
                            </button>
                          </div>
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

      {/* TAB 2: TILES & GODOWN STOCK */}
      {activeTab === "tiles" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Roofing Tiles &amp; Main Godown Stock Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Matches Sheets <code className="font-mono font-bold text-blue-600">Tiles Stock</code> and <code className="font-mono font-bold text-blue-600">Godown_Stock</code> &middot; Kerala Clay, Monier &amp; Ceiling Tile varieties
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiles.map((tile) => {
              const qty = Number(tile.availableStock);
              return (
                <div
                  key={tile.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {tile.tileCode}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">{tile.tileName}</h4>
                      <span className="text-xs text-slate-400">{tile.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-blue-600 font-mono">{qty}</div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Nos on hand</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500">Quick Adjust</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAdjustTile(tile.id, qty, -50)}
                        disabled={qty < 50}
                        className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-40"
                      >
                        -50
                      </button>
                      <button
                        onClick={() => handleAdjustTile(tile.id, qty, -10)}
                        disabled={qty < 10}
                        className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-40"
                      >
                        -10
                      </button>
                      <button
                        onClick={() => handleAdjustTile(tile.id, qty, 10)}
                        className="px-2 py-1 text-xs rounded bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleAdjustTile(tile.id, qty, 50)}
                        className="px-2 py-1 text-xs rounded bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold"
                      >
                        +50
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SITE & TEAM ISSUE REGISTER */}
      {activeTab === "issues" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Site &amp; Team Material Issue Register
              </h3>
              <p className="text-xs text-slate-500">
                Matches Sheet <code className="font-mono font-bold text-blue-600">Stock_Out</code> in Excel &middot; Live tracking across project sites
              </p>
            </div>
            <button
              onClick={() => setShowIssueModal(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Issue Material to Site
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3">Project Site</th>
                    <th className="py-2.5 px-3">Material Description</th>
                    <th className="py-2.5 px-3 text-center">Quantity Dispatched</th>
                    <th className="py-2.5 px-3">Issued By</th>
                    <th className="py-2.5 px-3">Approved By</th>
                    <th className="py-2.5 px-3">Condition / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {siteIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {new Date(issue.date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-blue-600">{issue.team}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {issue.siteName}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {issue.productName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-sm text-amber-600">
                        {Number(issue.quantity)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{issue.issuedBy}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{issue.approvedBy}</td>
                      <td className="py-2.5 px-3 text-slate-500 italic text-[11px]">{issue.condition || issue.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRE-DISPATCH CHECKLISTS */}
      {activeTab === "checklists" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Pre-Dispatch Quality &amp; Tool Verification Checklists
              </h3>
              <p className="text-xs text-slate-500">
                Matches Sheets <code className="font-mono font-bold text-blue-600">Welder Mechioneries</code> &amp; <code className="font-mono font-bold text-blue-600">Layer Mechioneries</code> with tool photos &amp; supervisor sign-offs
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(["ALL", "WELDER", "LAYER", "GENERAL"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChecklistFilter(type)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    checklistFilter === type
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {type === "ALL" ? "All Checklists" : `${type} Team`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChecklists.map((chk) => {
              const isVerified = chk.status === "VERIFIED";
              return (
                <div
                  key={chk.id}
                  className={`border rounded-xl p-4 shadow-2xs transition ${
                    isVerified
                      ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      : "bg-amber-50/30 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {chk.imageUrl ? (
                      <div
                        onClick={() => {
                          setZoomImage(chk.imageUrl);
                          setZoomTitle(chk.itemName);
                        }}
                        className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer hover:scale-105 transition"
                      >
                        <img src={chk.imageUrl} alt={chk.itemName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                        <ClipboardCheck className="w-5 h-5" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600">
                          {chk.checklistType}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          Qty: {chk.standardQty}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 mt-1 truncate">
                        {chk.itemName}
                      </h4>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Verified by: {chk.verifiedBy || "Gowri Sankar"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                        isVerified
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {isVerified ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {isVerified ? "Verified Ready" : "Pending Check"}
                    </span>

                    <button
                      onClick={() => handleToggleChecklist(chk.id, chk.status)}
                      className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      {isVerified ? "Mark Pending" : "Verify & Sign"}
                    </button>
                  </div>
                </div>
              );
            })}
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
                {zoomTitle || "Material Photo Preview"}
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

      {/* MODAL: +ADD CONSUMABLE ITEM */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Register New Yard Consumable / Material
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  placeholder='e.g., 5" Heavy Cutting Wheel'
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Category *</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="Cutting Wheels">Cutting Wheels</option>
                    <option value="Drill Bits">Drill Bits</option>
                    <option value="Fasteners">Fasteners &amp; Screws</option>
                    <option value="Safety">Safety &amp; PPE</option>
                    <option value="Tiles">Roofing Tiles</option>
                    <option value="General Hardware">General Hardware</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Unit of Measure *</label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="Nos">Nos (Units)</option>
                    <option value="Boxes">Boxes</option>
                    <option value="Kg">Kg</option>
                    <option value="MT">MT</option>
                    <option value="Sq.Ft">Sq.Ft</option>
                    <option value="Liters">Liters</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.currentStock}
                    onChange={(e) => setItemForm({ ...itemForm, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Min Alert Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.minAlertStock}
                    onChange={(e) => setItemForm({ ...itemForm, minAlertStock: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.unitCost}
                    onChange={(e) => setItemForm({ ...itemForm, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Yard Location</label>
                <input
                  type="text"
                  placeholder="e.g. Erode Main Yard - Shelf B2"
                  value={itemForm.yardLocation}
                  onChange={(e) => setItemForm({ ...itemForm, yardLocation: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-2xs cursor-pointer"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: +ISSUE TO PROJECT SITE */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-amber-500" />
                Issue Materials to Project Site
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
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Destination Team *</label>
                  <select
                    value={issueForm.team}
                    onChange={(e) => setIssueForm({ ...issueForm, team: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    {["SRM01", "SRM02", "SMR03", "SRM04", "SRM05", "SRM06", "Office Labour Team", "Suresh Team"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Project Site *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SSM School_Site, Ananthi_Site, Kyro, Vellalar Edu Trust"
                  value={issueForm.siteName}
                  onChange={(e) => setIssueForm({ ...issueForm, siteName: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Material Item *</label>
                  <input
                    type="text"
                    required
                    placeholder='e.g. 5" Cutting Wheel'
                    value={issueForm.productName}
                    onChange={(e) => setIssueForm({ ...issueForm, productName: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Quantity Dispatched *</label>
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

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-2xs cursor-pointer"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive / Delete Modal */}
      <ArchiveConfirmModal
        isOpen={archiveModal.isOpen}
        title="Archive Inventory Item"
        message="Are you sure you want to archive this inventory item? It will be removed from active stock counts."
        recordLabel={archiveModal.recordLabel}
        onConfirm={handleArchive}
        onCancel={() =>
          setArchiveModal({ isOpen: false, recordId: "", recordLabel: "", loading: false })
        }
        loading={archiveModal.loading}
      />
    </div>
  );
}
