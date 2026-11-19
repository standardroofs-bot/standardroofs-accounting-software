"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  Eye,
  Printer,
  Trash2,
  Building,
  Calendar,
  Layers,
  Sparkles,
  X,
  FileCheck,
  ChevronRight,
  ExternalLink,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  Download,
  Copy,
  Clock,
  Check,
  FileDown,
  Info,
} from "lucide-react";
import Link from "next/link";
import { formatINR } from "@/lib/decimal";
import {
  COMPANY_NAME,
  COMPANY_ADDRESS,
  COMPANY_GSTIN,
  COMPANY_PHONE,
  COMPANY_EMAIL,
  COMPANY_WEBSITE,
  COMPANY_BANK_NAME,
  COMPANY_BANK_ACCOUNT_NAME,
  COMPANY_BANK_BRANCH,
  COMPANY_BANK_AC_NO,
  COMPANY_BANK_IFSC,
} from "@/lib/gst";

interface Estimate {
  id: string;
  estimateNumber: string;
  serialNo?: string;
  version: number;
  subject?: string;
  date: string;
  validUntil?: string;
  customerId: string;
  projectId?: string;
  status: string;
  quoteStage: string;
  roofType: string;
  subType?: string;
  totalSqFt: string;
  rateSqft?: string;
  subTotal: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  totalAmount: string;
  terms?: string;
  notes?: string;
  convertedInvoiceId?: string;
  clientMobile?: string;
  siteAddress?: string;
  googleMapsLink?: string;
  length?: string;
  breadth?: string;
  supervisorName?: string;
  supervisorMobile?: string;
  managerName?: string;
  managerMobile?: string;
  accountantName?: string;
  accountantMobile?: string;
  topLayer?: string;
  bottomLayer?: string;
  ridgeType?: string;
  clipType?: string;
  thicknessType?: string;
  weldingRod?: string;
  waterproofingSheet?: string;
  productColor?: string;
  colorText?: string;
  productImage1?: string;
  productImage2?: string;
  earthImage?: string;
  roof2DImage?: string;
  manual2DRoofImage?: string;
  pillarSpec?: string;
  platformSpec?: string;
  rafterSpec?: string;
  purlinSpec?: string;
  customer: {
    id: string;
    name: string;
    companyName?: string;
    phone?: string;
    email?: string;
    gstNumber?: string;
    stateCode: string;
    billingAddress?: string;
    siteAddress?: string;
    googleMapsLink?: string;
    length?: number;
    breadth?: number;
  };
  project?: {
    id: string;
    code: string;
    name: string;
  };
  items: Array<{
    id: string;
    description: string;
    hsnCode: string;
    quantity: string;
    unit: string;
    unitRate: string;
    totalAmount: string;
  }>;
}

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);

  // Masters data
  const [systems, setSystems] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any>({ supervisors: [], managers: [], accountants: [] });
  const [nextSerialNo, setNextSerialNo] = useState("SR-00001");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 5-Field Manual Input Form State (+ specs)
  const [formData, setFormData] = useState({
    customerId: "",
    selectedSystemId: "",
    roofType: "Ceramic",
    subType: "3 Way",
    selectedColorName: "Coffee Brown",
    length: "45",
    breadth: "30",
    rateSqft: "340",
    clientMobile: "",
    siteAddress: "",
    googleMapsLink: "",
    supervisorName: "Saran",
    supervisorMobile: "+91 98427 12345",
    managerName: "Prabhakaran T",
    managerMobile: "+91 86084 75767",
    accountantName: "Senior Accountant",
    accountantMobile: "+91 98421 12345",
    manual2DRoofImage: "",
    earthImage: "",
    // Auto-filled specs
    topLayer: "KPG / Tapco Tiles",
    bottomLayer: "Karnataka Tile | Export Quality",
    ridgeType: "KPG / Tapco",
    clipType: "BMI Monier",
    thicknessType: "N/A",
    weldingRod: "BEST ARC",
    waterproofingSheet: "Dr.Fixit / Ganesh Waterproofing sheet for ridges",
    pillarSpec: "150X150 mm Size Appollo Brand Pipe",
    platformSpec: "150X75 mm Size Appollo Brand Pipe",
    rafterSpec: "100X50 mm Size Appollo Brand Pipe",
    purlinSpec: "40X20 mm Size Appollo Brand Pipe",
    diagramUrl: "/uploads/roofing/3 way.jpg",
    productImage1: "/uploads/roofing/Ceramic/Ceramic_Coffe Brown Pyramid.png",
    productImage2: "/uploads/roofing/Ceramic/ceramic terracotta.png",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [estRes, mastRes] = await Promise.all([
        fetch("/api/estimates"),
        fetch("/api/roofing-masters"),
      ]);

      const estData = await estRes.json();
      if (estData.success) {
        setEstimates(estData.estimates);
        if (estData.estimates.length > 0 && !selectedEstimate) {
          setSelectedEstimate(estData.estimates[0]);
        }
      }

      const mastData = await mastRes.json();
      if (mastData.success) {
        setSystems(mastData.systems || []);
        setColors(mastData.colors || []);
        setCustomers(mastData.customers || []);
        setStaff(mastData.staff || { supervisors: [], managers: [], accountants: [] });
        if (mastData.nextSerialNo) setNextSerialNo(mastData.nextSerialNo);
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

  // Customer Auto-Fetch (Rule 3.2: Create-only, auto-fills mobile, address, maps link, length, breadth)
  const handleCustomerSelect = (custId: string) => {
    const cust = customers.find((c) => c.id === custId);
    if (!cust) return;

    setFormData((prev) => ({
      ...prev,
      customerId: cust.id,
      clientMobile: cust.phone || prev.clientMobile,
      siteAddress: cust.siteAddress || cust.shippingAddress || cust.billingAddress || prev.siteAddress,
      googleMapsLink: cust.googleMapsLink || prev.googleMapsLink,
      length: cust.length ? String(cust.length) : prev.length,
      breadth: cust.breadth ? String(cust.breadth) : prev.breadth,
    }));
  };

  // Roofing System Auto-Fill (Rule 3.5 & 3.7: Fills all 8 specs + 4 steel specs + 2D diagram)
  const handleSystemSelect = (sysId: string) => {
    const sys = systems.find((s) => s.id === sysId);
    if (!sys) return;

    setFormData((prev) => ({
      ...prev,
      selectedSystemId: sys.id,
      roofType: sys.material,
      subType: sys.roofType,
      rateSqft: String(sys.defaultRate || 280),
      topLayer: sys.topLayer || prev.topLayer,
      bottomLayer: sys.bottomLayer || prev.bottomLayer,
      ridgeType: sys.ridgeHipSystem || prev.ridgeType,
      clipType: sys.clipsFasteners || prev.clipType,
      thicknessType: sys.thickness || prev.thicknessType,
      weldingRod: sys.weldingRod || prev.weldingRod,
      waterproofingSheet: sys.waterproofSheet || prev.waterproofingSheet,
      pillarSpec: sys.pillarSpec || prev.pillarSpec,
      platformSpec: sys.platformSpec || prev.platformSpec,
      rafterSpec: sys.rafterSpec || prev.rafterSpec,
      purlinSpec: sys.purlinSpec || prev.purlinSpec,
      diagramUrl: sys.diagramUrl || prev.diagramUrl,
    }));
  };

  // Product Color Auto-Fetch (Rule 3.6: Auto-syncs color text and fetches 2 product photos)
  const handleColorSelect = (colorName: string) => {
    const col = colors.find((c) => c.colorName === colorName);
    setFormData((prev) => ({
      ...prev,
      selectedColorName: colorName,
      productImage1: col?.image1Url || prev.productImage1,
      productImage2: col?.image2Url || prev.productImage2,
    }));
  };

  // Staff Phone Auto-Fetch (Rule 3.3: Name selection fetches respective mobile)
  const handleSupervisorSelect = (name: string) => {
    const found = staff.supervisors?.find((s: any) => s.name === name);
    setFormData((prev) => ({
      ...prev,
      supervisorName: name,
      supervisorMobile: found ? found.mobile : prev.supervisorMobile,
    }));
  };

  const handleManagerSelect = (name: string) => {
    const found = staff.managers?.find((m: any) => m.name === name);
    setFormData((prev) => ({
      ...prev,
      managerName: name,
      managerMobile: found ? found.mobile : prev.managerMobile,
    }));
  };

  const handleAccountantSelect = (name: string) => {
    const found = staff.accountants?.find((a: any) => a.name === name);
    setFormData((prev) => ({
      ...prev,
      accountantName: name,
      accountantMobile: found ? found.mobile : prev.accountantMobile,
    }));
  };

  // Live Instant Client-Side Calculations (Section 6: Total Area = L × B, Grand Total = Area × Rate + GST)
  const numLen = parseFloat(formData.length || "0") || 0;
  const numBrd = parseFloat(formData.breadth || "0") || 0;
  const liveArea = numLen * numBrd;
  const liveRate = parseFloat(formData.rateSqft || "0") || 0;
  const liveSubTotal = liveArea * liveRate;
  const liveGst = liveSubTotal * 0.18;
  const liveGrandTotal = liveSubTotal + liveGst;

  // Handle Create Quote
  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      alert("Please select a customer.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        await fetchData();
        setSelectedEstimate(data.estimate);
      } else {
        alert(data.error || "Failed to create quotation.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 1-Click Convert Quote -> Active Project Site & Tax Invoice #33+
  const handleConvertQuote = async (est: Estimate) => {
    if (!confirm(`Convert quotation ${est.serialNo || est.estimateNumber} into an Active Project Site and Tax Invoice?`)) {
      return;
    }
    setConvertingId(est.id);
    try {
      const res = await fetch(`/api/estimates/${est.id}/convert`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert(`Success! Created Tax Invoice ${data.invoiceNumber}`);
        await fetchData();
      } else {
        alert(data.error || "Conversion failed.");
      }
    } catch (err: any) {
      alert("Conversion error: " + err.message);
    } finally {
      setConvertingId(null);
    }
  };

  // Filtered list
  const filteredEstimates = estimates.filter((e) => {
    const matchesSearch =
      (e.subject || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.serialNo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.customer?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.roofType || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === "ALL" || e.quoteStage === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Zoho CRM Specification Parity
            </span>
            <span className="text-xs text-slate-400 font-medium">Auto-Numbered • Persistent Counter</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-1">
            <FileText className="text-blue-600" /> Quotations & Estimates
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            5-Field instant quotation automation, 64 roofing systems, client version control, and 1-click branded A4 PDF generator.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block pr-3 border-r border-slate-200 dark:border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Next Serial No</div>
            <div className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">{nextSerialNo}</div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Create Quote {nextSerialNo}</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Quotation Register on Left, Zoho Detail Drawer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Register (5 or 6 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Search size={16} className="text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              placeholder="Instant search by SR-00001, Client Name, Roof..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs w-full focus:outline-none text-slate-800 dark:text-slate-100"
            />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold px-2 py-1 rounded-lg border-none focus:outline-none"
            >
              <option value="ALL">All Stages</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Approved">Approved</option>
              <option value="Converted">Converted</option>
            </select>
          </div>

          {/* Quotations List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[750px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading quotations...</div>
            ) : filteredEstimates.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
                <div className="font-bold text-sm text-slate-700 dark:text-slate-300">No Quotations Yet</div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Click "+ Create Quote" to generate your first quotation with automatic specifications.
                </p>
              </div>
            ) : (
              filteredEstimates.map((est) => {
                const isSelected = selectedEstimate?.id === est.id;
                return (
                  <div
                    key={est.id}
                    onClick={() => setSelectedEstimate(est)}
                    className={`p-4 transition cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                          {est.serialNo || est.estimateNumber}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          V{est.version || 1}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            est.status === "CONVERTED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {est.status === "CONVERTED" ? "Converted" : est.quoteStage || "Sent"}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {est.customer?.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                        <span>{est.roofType} ({est.subType || "Standard"})</span>
                        <span>•</span>
                        <span>{parseFloat(est.totalSqFt).toLocaleString()} Sq.Ft</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                        ₹ {parseFloat(est.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(est.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Zoho-Style Quotation Detail Drawer (7 cols) */}
        <div className="lg:col-span-7">
          {selectedEstimate ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6 sticky top-20">
              {/* Drawer Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-lg text-blue-600 dark:text-blue-400">
                      {selectedEstimate.serialNo || selectedEstimate.estimateNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Version {selectedEstimate.version}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        selectedEstimate.status === "CONVERTED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {selectedEstimate.status === "CONVERTED" ? "Converted to Tax Invoice" : selectedEstimate.quoteStage || "Active Quote"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-medium truncate max-w-md">
                    {selectedEstimate.subject || `${selectedEstimate.serialNo} – ${selectedEstimate.customer?.name}`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPrintModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-xs font-bold transition shadow"
                  >
                    <Printer size={14} />
                    <span>Branded A4 PDF</span>
                  </button>

                  {selectedEstimate.status !== "CONVERTED" ? (
                    <button
                      onClick={() => handleConvertQuote(selectedEstimate)}
                      disabled={convertingId === selectedEstimate.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      <span>{convertingId === selectedEstimate.id ? "Converting..." : "Convert -> Tax Invoice #33+"}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                      <Check size={14} /> Tax Invoice Generated
                    </span>
                  )}
                </div>
              </div>

              {/* 30+ Field Detail Sections */}
              <div className="space-y-6 text-xs max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {/* 1. Client & Site Coordinates */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <User size={15} /> Client & Site Information
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Create-Only Auto Fetch</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Client Name</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedEstimate.customer?.name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Client Mobile</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedEstimate.clientMobile || selectedEstimate.customer?.phone || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Dimensions</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {selectedEstimate.length || 0} ft × {selectedEstimate.breadth || 0} ft
                      </strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block">Site Address</span>
                      <span className="text-slate-700 dark:text-slate-300">{selectedEstimate.siteAddress || selectedEstimate.customer?.billingAddress}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Google Maps Link</span>
                      {selectedEstimate.googleMapsLink ? (
                        <a
                          href={selectedEstimate.googleMapsLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <MapPin size={12} /> View Map Coordinates
                        </a>
                      ) : (
                        <span className="text-slate-400">No link added</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Roofing System 8 Specs & 4 Steel Specs */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <Layers size={15} /> Roofing System Specs (8 Fields) & Structural Steel (4 Fields)
                    </span>
                    <span className="text-[10px] text-slate-400">{selectedEstimate.roofType} - {selectedEstimate.subType}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Top Layer</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{selectedEstimate.topLayer || "Standard"}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Bottom Layer</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{selectedEstimate.bottomLayer || "Standard"}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Ridge / Hip</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{selectedEstimate.ridgeType || "Standard"}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Clips / Fasteners</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{selectedEstimate.clipType || "Standard"}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Welding Rod</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{selectedEstimate.weldingRod || "BEST ARC"}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Waterproofing</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{selectedEstimate.waterproofingSheet || "Standard"}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Color</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{selectedEstimate.productColor || "Standard"}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Rate / Sq.Ft</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">₹ {selectedEstimate.rateSqft || 280}</span>
                    </div>
                  </div>

                  {/* Structural Steel */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px]">
                    <div>
                      <span className="text-slate-400 block">Pillars:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedEstimate.pillarSpec || "150X150 mm Apollo"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Platforms:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedEstimate.platformSpec || "150X75 mm Apollo"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Rafters:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedEstimate.rafterSpec || "100X50 mm Apollo"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Purlins:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedEstimate.purlinSpec || "40X20 mm Apollo"}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Visual Diagrams & Product Photos Preview */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span className="text-slate-900 dark:text-slate-100">2D Roof Diagram & Product Color Images</span>
                    <span className="text-[10px] text-slate-400">Smart Image Priority: Manual &gt; Master Default</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block">2D Roof Diagram</span>
                      <div className="w-full h-24 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden p-1">
                        <img
                          src={selectedEstimate.manual2DRoofImage || selectedEstimate.roof2DImage || "/uploads/roofing/3 way.jpg"}
                          alt="2D Roof Diagram"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as any).src = "/uploads/roofing/A type.jpg";
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block">Product Photo 1</span>
                      <div className="w-full h-24 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden p-1">
                        <img
                          src={selectedEstimate.productImage1 || "/uploads/roofing/Ceramic/Ceramic_Coffe Brown Pyramid.png"}
                          alt="Product Photo 1"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block">Product Photo 2</span>
                      <div className="w-full h-24 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden p-1">
                        <img
                          src={selectedEstimate.productImage2 || "/uploads/roofing/Ceramic/ceramic terracotta.png"}
                          alt="Product Photo 2"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Staff Contact Information */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                    Assigned Project Team & Emergency Contacts
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Site Supervisor</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedEstimate.supervisorName || "Saran"}</strong>
                      <span className="text-[10px] text-slate-500 block">{selectedEstimate.supervisorMobile || "+91 98427 12345"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Project Manager</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedEstimate.managerName || "Prabhakaran T"}</strong>
                      <span className="text-[10px] text-slate-500 block">{selectedEstimate.managerMobile || "+91 86084 75767"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Accounts Desk</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedEstimate.accountantName || "Senior Accountant"}</strong>
                      <span className="text-[10px] text-slate-500 block">{selectedEstimate.accountantMobile || "+91 98421 12345"}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Financial Summary Card */}
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Total Measured Area:</span>
                    <strong className="font-mono text-slate-900 dark:text-slate-100">{parseFloat(selectedEstimate.totalSqFt).toLocaleString()} Sq.Ft</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Sub Total:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">₹ {parseFloat(selectedEstimate.subTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-slate-400">GST (CGST 9% + SGST 9% / IGST 18%):</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      ₹ {(parseFloat(selectedEstimate.cgstTotal) + parseFloat(selectedEstimate.sgstTotal) + parseFloat(selectedEstimate.igstTotal)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black text-blue-600 dark:text-blue-400 pt-2 border-t border-blue-200 dark:border-blue-900">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹ {parseFloat(selectedEstimate.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center text-slate-400">
              Select a quotation to view specifications and generate branded PDF.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: 5-Field Quotation Creator matching Zoho Technical Specification */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full p-6 space-y-6 my-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Quote Serial: {nextSerialNo}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Auto-Numbered • Persistent</span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                  Create Quotation (Zoho 5-Field Input Model)
                </h2>
                <p className="text-xs text-slate-500">
                  Select Customer, Roofing System, Color, and Dimensions. All 30+ specifications, steel sections, and drawings auto-populate.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="space-y-6 text-xs">
              {/* The 5 Manual Inputs (Grid) */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-4">
                <div className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-[11px]">
                  Step 1: The 5 Core Manual Fields
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Field 1: Customer Name */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      1. Contact / Client Name *
                    </label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Choose Client --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.companyName || c.phone || "Erode"})
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Auto-fetches mobile, address, maps link, dimensions</span>
                  </div>

                  {/* Field 2: Roofing System (8 Systems & 64 Subtypes) */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      2. Roofing System & Design *
                    </label>
                    <select
                      value={formData.selectedSystemId}
                      onChange={(e) => handleSystemSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Choose Roofing System --</option>
                      {systems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.material} — {s.roofType} (₹{s.defaultRate}/sq.ft)
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Auto-fills 8 roofing specs + 4 steel specs + 2D diagram</span>
                  </div>

                  {/* Field 3: Product Color */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      3. Product Color *
                    </label>
                    <select
                      value={formData.selectedColorName}
                      onChange={(e) => handleColorSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    >
                      {colors.map((c) => (
                        <option key={c.id} value={c.colorName}>
                          {c.colorName}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Auto-syncs color text + 2 product photos</span>
                  </div>

                  {/* Field 4: Length (ft) */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      4. Length (ft) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.length}
                      onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Field 5: Breadth (ft) */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      5. Breadth (ft) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.breadth}
                      onChange={(e) => setFormData({ ...formData, breadth: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Rate / Sq.Ft */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Rate / Sq.Ft (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.rateSqft}
                      onChange={(e) => setFormData({ ...formData, rateSqft: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Live Client-Side Formula Display (Section 6) */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Live Area Formula:</span>
                    <strong className="font-mono text-sm text-slate-900 dark:text-slate-100">
                      {numLen} ft × {numBrd} ft = {liveArea.toLocaleString()} Sq.Ft
                    </strong>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500">SubTotal: <strong>₹ {liveSubTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
                    <span className="text-slate-500">GST 18%: <strong>₹ {liveGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-sm font-mono">
                      Grand Total: ₹ {liveGrandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2: Auto-Fetched Details (Editable Overrides) */}
              <div className="space-y-4">
                <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                  Step 2: Auto-Fetched Coordinates & Staff Contacts (Editable)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-slate-500 block mb-1">Client Mobile</label>
                    <input
                      type="text"
                      value={formData.clientMobile}
                      onChange={(e) => setFormData({ ...formData, clientMobile: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-slate-500 block mb-1">Site Address</label>
                    <input
                      type="text"
                      value={formData.siteAddress}
                      onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Supervisor</label>
                    <select
                      value={formData.supervisorName}
                      onChange={(e) => handleSupervisorSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {staff.supervisors?.map((s: any) => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.mobile})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Project Manager</label>
                    <select
                      value={formData.managerName}
                      onChange={(e) => handleManagerSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {staff.managers?.map((m: any) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({m.mobile})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Accountant</label>
                    <select
                      value={formData.accountantName}
                      onChange={(e) => handleAccountantSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {staff.accountants?.map((a: any) => (
                        <option key={a.name} value={a.name}>
                          {a.name} ({a.mobile})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Auto-Filled Specifications & Images */}
              <div className="space-y-4">
                <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                  Step 3: Auto-Filled Specs & 2D Diagram
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 block text-[10px]">Top Layer:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{formData.topLayer}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 block text-[10px]">Bottom Layer:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{formData.bottomLayer}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 block text-[10px]">Ridge / Hip:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{formData.ridgeType}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 block text-[10px]">Pillars Steel:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{formData.pillarSpec}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="w-20 h-16 rounded-lg bg-white dark:bg-slate-900 border flex items-center justify-center overflow-hidden shrink-0">
                    <img src={formData.diagramUrl} alt="2D Diagram" className="w-full h-full object-contain" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      2D Roof Diagram: {formData.roofType} ({formData.subType})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Auto-matched from Standard Roofs design master. Will be rendered with {numLen} ft × {numBrd} ft dimensions on PDF.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-2xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Generating..." : `Create Quotation ${nextSerialNo}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Branded A4 Multi-Page Quotation PDF View matching Section 13 */}
      {showPrintModal && selectedEstimate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full p-8 space-y-6 my-8 animate-in fade-in zoom-in-95">
            {/* Top Toolbar (Hidden on Print) */}
            <div className="flex justify-between items-center border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-600 text-sm">
                  {selectedEstimate.serialNo || selectedEstimate.estimateNumber}
                </span>
                <span className="text-xs text-slate-500">
                  Branded Multi-Page Quotation PDF (Standard Roofs Letterhead)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition cursor-pointer"
                >
                  <Printer size={15} /> Print / Save as PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>

            {/* A4 PRINT CONTENT (Matches Section 13 of Technical Doc) */}
            <div className="p-8 space-y-6 text-slate-900 bg-white" id="quotation-print-area">
              {/* 1. Header & Letterhead */}
              <div className="border-b-2 border-blue-600 pb-4 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="h-14 bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                      <img
                        src="/images/standard-roofs-logo.png"
                        alt="Standard Roofs Logo"
                        className="h-12 w-auto object-contain"
                      />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                        STANDARD ROOFS
                      </h1>
                      <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                        Roofing & PEB Structure Specialists
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-2 space-y-0.5 leading-tight">
                    <div>{COMPANY_ADDRESS}</div>
                    <div>
                      Phone: <strong className="text-slate-900">{COMPANY_PHONE}</strong> | Email: {COMPANY_EMAIL} | Web: {COMPANY_WEBSITE}
                    </div>
                    <div className="font-bold text-slate-900">
                      GSTIN: <span className="font-mono text-blue-700">{COMPANY_GSTIN}</span> | State: Tamil Nadu (Code: 33)
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="px-3 py-1 bg-blue-50 text-blue-800 rounded-lg font-black text-xs inline-block">
                    QUOTATION / ESTIMATE
                  </div>
                  <div className="font-mono font-black text-sm text-slate-900">
                    {selectedEstimate.serialNo || selectedEstimate.estimateNumber}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Version: <strong className="text-slate-900">V{selectedEstimate.version}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Date: <strong className="text-slate-900">{new Date(selectedEstimate.date).toLocaleDateString("en-IN")}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Valid Until: <strong className="text-slate-900">{selectedEstimate.validUntil ? new Date(selectedEstimate.validUntil).toLocaleDateString("en-IN") : "7 Days"}</strong>
                  </div>
                </div>
              </div>

              {/* 2. Client & Project Coordinates */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Client Details</span>
                  <div className="font-black text-slate-900 text-sm">{selectedEstimate.customer?.name}</div>
                  <div className="text-slate-600 mt-0.5">{selectedEstimate.customer?.companyName}</div>
                  <div className="text-slate-600 mt-0.5">Mobile: <strong>{selectedEstimate.clientMobile || selectedEstimate.customer?.phone}</strong></div>
                  <div className="text-slate-600 mt-0.5">{selectedEstimate.siteAddress || selectedEstimate.customer?.billingAddress}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Project Team & Support</span>
                  <div className="space-y-1 text-slate-700">
                    <div>Managing Director: <strong>{selectedEstimate.managerName || "Prabhakaran T"}</strong> ({selectedEstimate.managerMobile || "+91 86084 75767"})</div>
                    <div>Site Supervisor: <strong>{selectedEstimate.supervisorName || "Saran"}</strong> ({selectedEstimate.supervisorMobile || "+91 98427 12345"})</div>
                    <div>Accounts Desk: <strong>{selectedEstimate.accountantName || "Senior Accountant"}</strong> ({selectedEstimate.accountantMobile || "+91 98421 12345"})</div>
                  </div>
                </div>
              </div>

              {/* 3. Specifications Table (8 Roofing Specs + 4 Steel Specs) */}
              <div className="space-y-2">
                <div className="font-bold text-xs uppercase text-slate-800 border-b pb-1">
                  Roofing System & Structural Specifications ({selectedEstimate.roofType} - {selectedEstimate.subType})
                </div>
                <table className="w-full text-[11px] border border-slate-200">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 bg-slate-50 font-bold w-1/4">Top Layer</td>
                      <td className="p-2 w-1/4">{selectedEstimate.topLayer || "Standard"}</td>
                      <td className="p-2 bg-slate-50 font-bold w-1/4">Bottom Layer</td>
                      <td className="p-2 w-1/4">{selectedEstimate.bottomLayer || "Standard"}</td>
                    </tr>
                    <tr>
                      <td className="p-2 bg-slate-50 font-bold">Ridge / Hip System</td>
                      <td className="p-2">{selectedEstimate.ridgeType || "Standard"}</td>
                      <td className="p-2 bg-slate-50 font-bold">Clips / Fasteners</td>
                      <td className="p-2">{selectedEstimate.clipType || "Heavy Duty Fasteners"}</td>
                    </tr>
                    <tr>
                      <td className="p-2 bg-slate-50 font-bold">Welding Rod Spec</td>
                      <td className="p-2">{selectedEstimate.weldingRod || "BEST ARC"}</td>
                      <td className="p-2 bg-slate-50 font-bold">Waterproofing</td>
                      <td className="p-2">{selectedEstimate.waterproofingSheet || "Dr.Fixit Membrane"}</td>
                    </tr>
                    <tr>
                      <td className="p-2 bg-slate-50 font-bold">Product Color</td>
                      <td className="p-2 font-bold text-blue-700">{selectedEstimate.productColor || "Terracotta"}</td>
                      <td className="p-2 bg-slate-50 font-bold">Pillars Structural Steel</td>
                      <td className="p-2 font-semibold">{selectedEstimate.pillarSpec || "150X150 mm Apollo"}</td>
                    </tr>
                    <tr>
                      <td className="p-2 bg-slate-50 font-bold">Platform Sections</td>
                      <td className="p-2">{selectedEstimate.platformSpec || "150X75 mm Apollo"}</td>
                      <td className="p-2 bg-slate-50 font-bold">Rafters & Purlins</td>
                      <td className="p-2">{selectedEstimate.rafterSpec || "100X50 mm"} / {selectedEstimate.purlinSpec || "40X20 mm"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. Visual Diagrams & Dimensions */}
              <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-xl p-3 bg-slate-50">
                <div className="space-y-1 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">2D Roof Diagram ({selectedEstimate.length} ft × {selectedEstimate.breadth} ft)</span>
                  <div className="h-32 bg-white rounded-lg border flex items-center justify-center p-2">
                    <img
                      src={selectedEstimate.manual2DRoofImage || selectedEstimate.roof2DImage || "/uploads/roofing/3 way.jpg"}
                      alt="Roof Diagram"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
                <div className="space-y-1 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Product Color Sample ({selectedEstimate.productColor})</span>
                  <div className="h-32 bg-white rounded-lg border flex items-center justify-center p-2">
                    <img
                      src={selectedEstimate.productImage1 || "/uploads/roofing/Ceramic/Ceramic_Coffe Brown Pyramid.png"}
                      alt="Product Sample"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Project Summary & Financials Table */}
              <div className="space-y-2">
                <div className="font-bold text-xs uppercase text-slate-800 border-b pb-1">
                  Project Scope & Commercial Summary
                </div>
                <table className="w-full text-xs border border-slate-200">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-right">HSN/SAC</th>
                      <th className="p-2 text-right">Area / Qty</th>
                      <th className="p-2 text-right">Rate / Sq.Ft</th>
                      <th className="p-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedEstimate.items?.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="p-2 font-medium">{it.description}</td>
                        <td className="p-2 text-right font-mono text-slate-500">{it.hsnCode}</td>
                        <td className="p-2 text-right font-mono">{parseFloat(it.quantity).toLocaleString()} {it.unit}</td>
                        <td className="p-2 text-right font-mono">₹ {parseFloat(it.unitRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right font-mono font-bold">₹ {parseFloat(it.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                    <tr>
                      <td colSpan={4} className="p-2 text-right font-bold text-slate-600">Sub Total:</td>
                      <td className="p-2 text-right font-mono font-bold">₹ {parseFloat(selectedEstimate.subTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="p-2 text-right font-bold text-slate-600">GST (18% Accrual):</td>
                      <td className="p-2 text-right font-mono font-bold">
                        ₹ {(parseFloat(selectedEstimate.cgstTotal) + parseFloat(selectedEstimate.sgstTotal) + parseFloat(selectedEstimate.igstTotal)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-blue-50 text-blue-900 font-black text-sm">
                      <td colSpan={4} className="p-2 text-right">Grand Total:</td>
                      <td className="p-2 text-right font-mono">₹ {parseFloat(selectedEstimate.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 6. Bank Details & Signature Block */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-[11px]">
                <div className="space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 uppercase text-[10px] block">Standard Roofs Bank Account Details</span>
                  <div>Bank: <strong>{COMPANY_BANK_NAME}</strong></div>
                  <div>Account Name: <strong>{COMPANY_BANK_ACCOUNT_NAME}</strong></div>
                  <div>A/C Number: <strong className="font-mono text-blue-700">{COMPANY_BANK_AC_NO}</strong></div>
                  <div>Branch: <strong>{COMPANY_BANK_BRANCH}</strong> | IFSC: <strong className="font-mono">{COMPANY_BANK_IFSC}</strong></div>
                </div>

                <div className="text-right space-y-6 pt-2">
                  <div className="text-[10px] text-slate-500">For STANDARD ROOFS</div>
                  <div className="pt-6">
                    <div className="border-t border-slate-400 inline-block w-48 text-center pt-1 font-bold text-slate-800">
                      Authorized Signatory / Prabhakaran T
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
