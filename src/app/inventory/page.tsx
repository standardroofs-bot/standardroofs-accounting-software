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
} from "lucide-react";

export default function InventoryPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [totalValuation, setTotalValuation] = useState("0.00");
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Modals
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [movementType, setMovementType] = useState<"STOCK_IN" | "SITE_ISSUE">("SITE_ISSUE");

  // Forms
  const [movementForm, setMovementForm] = useState({
    materialId: "",
    quantity: 0,
    unitCost: 0,
    projectId: "",
    supplierId: "",
    referenceNo: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [itemForm, setItemForm] = useState({
    itemCode: "",
    name: "",
    category: "Steel",
    unit: "MT",
    currentStock: 0,
    minAlertStock: 10,
    unitCost: 0,
    yardLocation: "Erode Yard - Bay 1",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [invRes, movRes, prjRes, supRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/inventory/movements"),
        fetch("/api/projects"),
        fetch("/api/suppliers"),
      ]);

      const invData = await invRes.json();
      const movData = await movRes.json();
      const prjData = await prjRes.json();
      const supData = await supRes.json();

      if (invData.success) {
        setMaterials(invData.materials || []);
        setTotalValuation(invData.totalValuation || "0.00");
        setLowStockCount(invData.lowStockCount || 0);
      }
      if (movData.success) {
        setMovements(movData.movements || []);
      }
      if (prjData.success) {
        setProjects(prjData.projects || []);
      }
      if (supData.success) {
        setSuppliers(supData.suppliers || []);
      }
    } catch (e) {
      console.error("Error fetching inventory data:", e);
    } finally {
      setLoading(false);
    }
  }

  function openMovement(type: "STOCK_IN" | "SITE_ISSUE", materialId?: string) {
    setMovementType(type);
    const m = materials.find((item) => item.id === materialId) || materials[0];
    setMovementForm({
      materialId: m ? m.id : "",
      quantity: 0,
      unitCost: m ? Number(m.unitCost) : 0,
      projectId: "",
      supplierId: "",
      referenceNo: "",
      notes: "",
      date: new Date().toISOString().split("T")[0],
    });
    setShowMovementModal(true);
  }

  async function handleMovementSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movementType, ...movementForm }),
      });
      const data = await res.json();
      if (data.success) {
        setShowMovementModal(false);
        fetchData();
      } else {
        alert("Failed to save stock movement: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

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
        setShowItemModal(false);
        setItemForm({
          itemCode: "",
          name: "",
          category: "Steel",
          unit: "MT",
          currentStock: 0,
          minAlertStock: 10,
          unitCost: 0,
          yardLocation: "Erode Yard - Bay 1",
        });
        fetchData();
      } else {
        alert("Failed to create item: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // Filtered Materials
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.itemCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "ALL" ||
      m.category.toUpperCase() === categoryFilter.toUpperCase() ||
      (categoryFilter === "LOW_STOCK" && Number(m.currentStock) <= Number(m.minAlertStock));
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Warehouse className="h-7 w-7 text-amber-500" />
            Material & Yard Stock Inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage roofing raw materials at Erode Yard, site dispatches, stock-ins, and automated double-entry cost transfer
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowItemModal(true)}
            className="px-3 py-2 text-xs font-semibold rounded-md border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Raw Material
          </button>
          <button
            onClick={() => openMovement("STOCK_IN")}
            className="px-3 py-2 text-xs font-semibold rounded-md border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
          >
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" /> Stock In (Receive)
          </button>
          <button
            onClick={() => openMovement("SITE_ISSUE")}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <ArrowUpRight className="h-4 w-4" /> + Issue to Project Site
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-emerald-500" /> Yard Stock Valuation
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">
            ₹ {Number(totalValuation).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Asset Account 1030</div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Package className="h-4 w-4 text-blue-500" /> Tracked Materials
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{materials.length} Items</div>
          <div className="text-xs text-muted-foreground mt-0.5">Steel, Tiles, Sheets, Fasteners</div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-rose-500" /> Low Stock Alerts
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">
            {lowStockCount > 0 ? (
              <span className="text-rose-500">{lowStockCount} Items</span>
            ) : (
              <span className="text-emerald-500">All Optimal</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Below reorder threshold</div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-amber-500" /> Stock Movements
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{movements.length} Logged</div>
          <div className="text-xs text-muted-foreground mt-0.5">Dispatches & Inward entries</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-lg border border-border">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search material or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-border bg-background text-foreground"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {["ALL", "Steel", "Sheets", "Tiles", "Fasteners", "Coatings", "LOW_STOCK"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                categoryFilter === cat
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat === "LOW_STOCK" ? "⚠️ Low Stock" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Materials Inventory Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Roofing Materials Yard Stock Register</h3>
            <p className="text-xs text-muted-foreground">
              Current on-hand quantities, location within Erode Yard, and valuation
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{filteredMaterials.length} of {materials.length} items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Item Code & Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Yard Location</th>
                <th className="py-3 px-4 text-right">Unit Rate</th>
                <th className="py-3 px-4 text-right">Min Alert</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Stock Valuation</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    No materials found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((m) => {
                  const stock = Number(m.currentStock);
                  const min = Number(m.minAlertStock);
                  const isLow = stock <= min;
                  const val = stock * Number(m.unitCost);

                  return (
                    <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground">{m.name}</div>
                        <div className="text-[11px] font-mono text-amber-500">{m.itemCode}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                          {m.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{m.yardLocation}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        ₹ {Number(m.unitCost).toLocaleString("en-IN", { minimumFractionDigits: 2 })} / {m.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {min} {m.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {stock.toLocaleString()} {m.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ₹ {val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 font-semibold border border-rose-500/20">
                            <AlertTriangle className="h-3 w-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openMovement("SITE_ISSUE", m.id)}
                            title="Issue to Site"
                            className="p-1 rounded hover:bg-amber-500/10 text-amber-500 transition-colors"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openMovement("STOCK_IN", m.id)}
                            title="Receive Stock"
                            className="p-1 rounded hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                          >
                            <ArrowDownLeft className="h-4 w-4" />
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

      {/* Stock Movement Register */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Stock Movement Audit Log</h3>
          <p className="text-xs text-muted-foreground">
            Complete trace of Yard Inward Receipts and Site Outward Dispatches with Double-Entry Journal references
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Movement No / Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Material</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Value (₹)</th>
                <th className="py-3 px-4">Destination Project / Source</th>
                <th className="py-3 px-4 text-center">Journal Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No stock movements recorded yet. Issue material to a site or record stock receipt above.
                  </td>
                </tr>
              ) : (
                movements.map((mov) => {
                  const isIssue = mov.movementType === "SITE_ISSUE";
                  return (
                    <tr key={mov.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground">{mov.movementNumber}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(mov.date).toLocaleDateString("en-IN")}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isIssue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">
                            <ArrowUpRight className="h-3 w-3" /> SITE DISPATCH
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                            <ArrowDownLeft className="h-3 w-3" /> STOCK INWARD
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">{mov.material?.name}</td>
                      <td className="py-3 px-4 text-right font-bold">
                        {isIssue ? "-" : "+"}
                        {Number(mov.quantity).toLocaleString()} {mov.material?.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        ₹ {Number(mov.totalValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {mov.project ? (
                          <span className="font-medium text-foreground">
                            {mov.project.code} - {mov.project.name}
                          </span>
                        ) : mov.supplier ? (
                          <span>Vendor: {mov.supplier.name}</span>
                        ) : (
                          "Erode Yard"
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {mov.journalEntry ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">
                            <CheckCircle2 className="h-3 w-3" /> {mov.journalEntry.entryNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Direct Log</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Stock Movement */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                {movementType === "SITE_ISSUE" ? (
                  <>
                    <ArrowUpRight className="h-5 w-5 text-amber-500" /> Issue Material to Roofing Project Site
                  </>
                ) : (
                  <>
                    <ArrowDownLeft className="h-5 w-5 text-emerald-500" /> Record Yard Stock Inward
                  </>
                )}
              </h3>
              <button onClick={() => setShowMovementModal(false)} className="text-muted-foreground text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleMovementSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={movementForm.date}
                    onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Material Item *</label>
                  <select
                    required
                    value={movementForm.materialId}
                    onChange={(e) => {
                      const m = materials.find((item) => item.id === e.target.value);
                      setMovementForm({
                        ...movementForm,
                        materialId: e.target.value,
                        unitCost: m ? Number(m.unitCost) : movementForm.unitCost,
                      });
                    }}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="">-- Select Material --</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.currentStock} {m.unit} in yard)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {movementType === "SITE_ISSUE" ? (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Destination Project Site *</label>
                  <select
                    required
                    value={movementForm.projectId}
                    onChange={(e) => setMovementForm({ ...movementForm, projectId: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="">-- Select Project Site --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name} ({p.siteLocation})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Cost will automatically transfer from Yard Inventory (1030) to Project Cost (5020).
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Source Supplier (Optional)</label>
                  <select
                    value={movementForm.supplierId}
                    onChange={(e) => setMovementForm({ ...movementForm, supplierId: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="">-- Direct Yard Inward / Opening --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.companyName || ""})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={movementForm.unitCost}
                    onChange={(e) => setMovementForm({ ...movementForm, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Reference / Delivery Challan No</label>
                <input
                  type="text"
                  placeholder="e.g., DC-2026-042 or Bill #891"
                  value={movementForm.referenceNo}
                  onChange={(e) => setMovementForm({ ...movementForm, referenceNo: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                />
              </div>

              <div className="p-3 bg-muted/40 rounded border border-border flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold">Total Stock Movement Value:</span>
                <span className="font-bold text-base text-foreground">
                  ₹ {(movementForm.quantity * movementForm.unitCost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-bold rounded text-slate-950 ${
                    movementType === "SITE_ISSUE"
                      ? "bg-amber-500 hover:bg-amber-600"
                      : "bg-emerald-500 hover:bg-emerald-600"
                  }`}
                >
                  {movementType === "SITE_ISSUE" ? "Issue to Project Site" : "Receive into Yard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Material Item */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-500" /> Register Roofing Raw Material
            </h3>

            <form onSubmit={handleItemSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Item Code</label>
                  <input
                    type="text"
                    placeholder="Auto (MAT-009)"
                    value={itemForm.itemCode}
                    onChange={(e) => setItemForm({ ...itemForm, itemCode: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="Steel">Steel (Sections / Purlins)</option>
                    <option value="Sheets">Sheets (Galvalume / UPVC)</option>
                    <option value="Tiles">Clay / Mangalore Tiles</option>
                    <option value="Fasteners">Fasteners & Screws</option>
                    <option value="Coatings">Paint & Primers</option>
                    <option value="Consumables">Site Consumables</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Jindal 0.50mm Galvalume Bare Sheet"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Unit</label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="MT">MT</option>
                    <option value="Kg">Kg</option>
                    <option value="Sq.Ft">Sq.Ft</option>
                    <option value="Nos">Nos</option>
                    <option value="Boxes">Boxes</option>
                    <option value="Liters">Liters</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Initial Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.currentStock}
                    onChange={(e) => setItemForm({ ...itemForm, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Min Alert Level</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.minAlertStock}
                    onChange={(e) => setItemForm({ ...itemForm, minAlertStock: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.unitCost}
                    onChange={(e) => setItemForm({ ...itemForm, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Yard Bay Location</label>
                  <input
                    type="text"
                    value={itemForm.yardLocation}
                    onChange={(e) => setItemForm({ ...itemForm, yardLocation: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
