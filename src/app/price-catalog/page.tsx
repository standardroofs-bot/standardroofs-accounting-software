"use client";

import { useState, useEffect } from "react";
import {
  Tags,
  Plus,
  Search,
  Filter,
  Layers,
  Wrench,
  Sparkles,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";

interface PriceItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  roofType: string;
  hsnSacCode: string;
  unit: string;
  defaultRate: string;
  gstRate: string;
  description?: string | null;
}

export default function PriceCatalogPage() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRoofType, setSelectedRoofType] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newItem, setNewItem] = useState({
    itemCode: "",
    name: "",
    category: "ROOFING_SERVICE",
    roofType: "PEB",
    hsnSacCode: "9954",
    unit: "Sq.Ft",
    defaultRate: "",
    gstRate: "18.00",
    description: "",
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/price-catalog");
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/price-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewItem({
          itemCode: "",
          name: "",
          category: "ROOFING_SERVICE",
          roofType: "PEB",
          hsnSacCode: "9954",
          unit: "Sq.Ft",
          defaultRate: "",
          gstRate: "18.00",
          description: "",
        });
        fetchItems();
      } else {
        alert(data.error || "Failed to add price catalog item");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((it) => {
    const matchesSearch =
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      it.roofType.toLowerCase().includes(search.toLowerCase());
    const matchesRoof = selectedRoofType === "ALL" || it.roofType === selectedRoofType;
    return matchesSearch && matchesRoof;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
              Zoho Books Completeness
            </span>
            <span className="text-xs text-slate-400 font-medium">Standard Roofing Rates & Rates Card</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            Roofing Service & Material Price Catalog
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Standardized rates for Clay Tile, PEB, UPVC, Tensile, and Solar roofing for 1-click invoice and quotation insertion.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition active:scale-95"
        >
          <Plus size={16} />
          <span>+ Add Price Item</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search roofing rates, item codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["ALL", "PEB", "Clay Tile", "UPVC", "Tensile", "Solar"].map((rt) => (
            <button
              key={rt}
              onClick={() => setSelectedRoofType(rt)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedRoofType === rt
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {rt}
            </button>
          ))}
        </div>
      </div>

      {/* Price Catalog Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-xs text-slate-400">
            Loading standard roofing rates...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-xs text-slate-400">
            No price catalog items found. Click "+ Add Price Item" to add standard rates.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 relative overflow-hidden hover:border-blue-500/50 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {item.itemCode}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {item.roofType}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                  {item.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {item.description || "Standard commercial roofing specification"}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Default Unit Rate</span>
                  <div className="font-mono font-black text-lg text-slate-900 dark:text-slate-100">
                    ₹ {parseFloat(item.defaultRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    <span className="text-xs font-normal text-slate-500 ml-1">/ {item.unit}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">HSN/SAC</span>
                  <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                    {item.hsnSacCode} (GST {item.gstRate}%)
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Price Item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Tags className="text-blue-600" /> + Add Roofing Rate Item
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Item Code *
                </label>
                <input
                  type="text"
                  value={newItem.itemCode}
                  onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                  placeholder="e.g. ROOF-CLAY-01"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Item Name / Service Description *
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Kerala Clay Tile Roofing (Complete Laying & Ridge)"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Roof Type
                  </label>
                  <select
                    value={newItem.roofType}
                    onChange={(e) => setNewItem({ ...newItem, roofType: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="PEB">PEB Structural</option>
                    <option value="Clay Tile">Clay Tile</option>
                    <option value="UPVC">UPVC Sheet</option>
                    <option value="Tensile">Tensile Fabric</option>
                    <option value="Solar">Solar Rooftop</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="ROOFING_SERVICE">Roofing Service</option>
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="ACCESSORY">Accessory</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Unit Rate (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newItem.defaultRate}
                    onChange={(e) => setNewItem({ ...newItem, defaultRate: e.target.value })}
                    placeholder="250"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Unit
                  </label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="Sq.Ft">Sq.Ft</option>
                    <option value="MT">MT (Tonne)</option>
                    <option value="Kg">Kg</option>
                    <option value="Nos">Nos</option>
                    <option value="Box">Box</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    GST Rate %
                  </label>
                  <select
                    value={newItem.gstRate}
                    onChange={(e) => setNewItem({ ...newItem, gstRate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="18.00">18%</option>
                    <option value="12.00">12%</option>
                    <option value="5.00">5%</option>
                    <option value="0.00">0%</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
