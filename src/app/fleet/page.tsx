"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  Navigation,
  Fuel,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  User,
  Phone,
  FileText,
  DollarSign,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTripModal, setShowTripModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);

  // Forms
  const [tripForm, setTripForm] = useState({
    date: new Date().toISOString().split("T")[0],
    vehicleId: "",
    driverId: "",
    projectId: "",
    fromLocation: "Erode Yard",
    toLocation: "",
    materialCarried: "",
    startKm: 0,
    closingKm: 0,
    fuelLiters: 0,
    fuelCost: 0,
    tollCost: 0,
    driverBata: 0,
    maintenanceCost: 0,
    paymentMode: "CASH",
    bankAccountId: "",
    notes: "",
  });

  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: "",
    vehicleType: "Bolero Pickup",
    modelName: "",
    odometerKm: 0,
    insuranceExpiry: "",
    fitnessExpiry: "",
    permitExpiry: "",
    notes: "",
  });

  const [driverForm, setDriverForm] = useState({
    name: "",
    licenseNumber: "",
    phone: "",
    salaryType: "MONTHLY",
    monthlySalary: 20000,
    tripBataRate: 350,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [fleetRes, tripsRes, prjRes, bankRes] = await Promise.all([
        fetch("/api/fleet"),
        fetch("/api/fleet/trips"),
        fetch("/api/projects"),
        fetch("/api/bank-accounts"),
      ]);

      const fleetData = await fleetRes.json();
      const tripsData = await tripsRes.json();
      const prjData = await prjRes.json();
      const bankData = await bankRes.json();

      if (fleetData.success) {
        setVehicles(fleetData.vehicles || []);
        setDrivers(fleetData.drivers || []);
      }
      if (tripsData.success) {
        setTrips(tripsData.trips || []);
      }
      if (prjData.success) {
        setProjects(prjData.projects || []);
      }
      if (bankData.success) {
        setBankAccounts(bankData.bankAccounts || []);
      }
    } catch (e) {
      console.error("Error fetching fleet data:", e);
    } finally {
      setLoading(false);
    }
  }

  const totalFuelCost = trips.reduce((sum, t) => sum + Number(t.fuelCost || 0), 0);
  const totalKmRun = trips.reduce((sum, t) => sum + Number(t.totalKm || 0), 0);

  // Auto-fill odometer when vehicle is selected in Trip modal
  function handleVehicleSelect(vId: string) {
    const sel = vehicles.find((v) => v.id === vId);
    setTripForm((prev) => ({
      ...prev,
      vehicleId: vId,
      startKm: sel ? sel.odometerKm : 0,
      closingKm: sel ? sel.odometerKm : 0,
    }));
  }

  // Handle Trip Submission
  async function handleTripSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/fleet/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowTripModal(false);
        setTripForm({
          date: new Date().toISOString().split("T")[0],
          vehicleId: "",
          driverId: "",
          projectId: "",
          fromLocation: "Erode Yard",
          toLocation: "",
          materialCarried: "",
          startKm: 0,
          closingKm: 0,
          fuelLiters: 0,
          fuelCost: 0,
          tollCost: 0,
          driverBata: 0,
          maintenanceCost: 0,
          paymentMode: "CASH",
          bankAccountId: "",
          notes: "",
        });
        fetchData();
      } else {
        alert("Failed to save trip: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // Handle Vehicle Submission
  async function handleVehicleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/fleet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_VEHICLE", ...vehicleForm }),
      });
      const data = await res.json();
      if (data.success) {
        setShowVehicleModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // Handle Driver Submission
  async function handleDriverSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/fleet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_DRIVER", ...driverForm }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDriverModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-7 w-7 text-amber-500" />
            Fleet & Cargo Vehicles
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage company transport vehicles, drivers, daily site dispatch trips, and automatic project fuel costing
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowVehicleModal(true)}
            className="px-3 py-2 text-xs font-semibold rounded-md border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Vehicle
          </button>
          <button
            onClick={() => setShowDriverModal(true)}
            className="px-3 py-2 text-xs font-semibold rounded-md border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Driver
          </button>
          <button
            onClick={() => {
              if (vehicles.length > 0) handleVehicleSelect(vehicles[0].id);
              setShowTripModal(true);
            }}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Navigation className="h-4 w-4" /> + Log Daily Site Trip
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-blue-500" /> Company Cargo Fleet
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{vehicles.length} Vehicles</div>
          <div className="text-xs text-muted-foreground mt-0.5">Bolero Pickup & Eicher 14ft</div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <User className="h-4 w-4 text-emerald-500" /> Dedicated Drivers
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{drivers.length} Drivers</div>
          <div className="text-xs text-muted-foreground mt-0.5">Monthly Salary + Trip Bata</div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Fuel className="h-4 w-4 text-amber-500" /> Total Fuel & Site Diesel
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">
            ₹ {totalFuelCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Auto-posted to Ledger 5050</div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Navigation className="h-4 w-4 text-indigo-500" /> Total Distance Run
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{totalKmRun.toLocaleString()} km</div>
          <div className="text-xs text-muted-foreground mt-0.5">{trips.length} Site Trips Logged</div>
        </div>
      </div>

      {/* Vehicles Fleet Cards */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Company Cargo Transport Fleet
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicles.map((v) => {
            const insExp = v.insuranceExpiry ? new Date(v.insuranceExpiry) : null;
            const fcExp = v.fitnessExpiry ? new Date(v.fitnessExpiry) : null;
            const now = new Date();
            const insDays = insExp ? Math.ceil((insExp.getTime() - now.getTime()) / (1000 * 3600 * 24)) : null;

            return (
              <div
                key={v.id}
                className="bg-card rounded-lg border border-border p-5 shadow-sm hover:border-amber-500/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground tracking-tight">{v.vehicleNumber}</h3>
                      <p className="text-xs text-muted-foreground">{v.modelName || v.vehicleType}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {v.status}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted/40 p-2 rounded">
                    <div className="text-xs text-muted-foreground">Odometer</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">
                      {v.odometerKm.toLocaleString()} km
                    </div>
                  </div>
                  <div className="bg-muted/40 p-2 rounded">
                    <div className="text-xs text-muted-foreground">Insurance</div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">
                      {insExp ? insExp.toLocaleDateString("en-IN") : "N/A"}
                    </div>
                  </div>
                  <div className="bg-muted/40 p-2 rounded">
                    <div className="text-xs text-muted-foreground">FC Expiry</div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">
                      {fcExp ? fcExp.toLocaleDateString("en-IN") : "N/A"}
                    </div>
                  </div>
                </div>

                {insDays !== null && insDays < 45 && (
                  <div className="mt-3 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 p-2 rounded flex items-center gap-1.5 border border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Insurance renewal due in {insDays} days</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Trips Register Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Daily Site Trip & Fuel Register</h3>
            <p className="text-xs text-muted-foreground">
              Every trip automatically updates vehicle odometer and posts balanced double-entry vouchers to General Ledger
            </p>
          </div>
          <button
            onClick={() => setShowTripModal(true)}
            className="text-xs font-semibold text-amber-500 hover:text-amber-600 flex items-center gap-1"
          >
            + Log Trip
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Trip No / Date</th>
                <th className="py-3 px-4">Vehicle & Driver</th>
                <th className="py-3 px-4">From ➔ To (Site)</th>
                <th className="py-3 px-4">Material Carried</th>
                <th className="py-3 px-4 text-right">Distance</th>
                <th className="py-3 px-4 text-right">Fuel (₹)</th>
                <th className="py-3 px-4 text-right">Toll / Bata</th>
                <th className="py-3 px-4 text-right">Total Cost</th>
                <th className="py-3 px-4 text-center">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    No site trips logged yet. Click{" "}
                    <button
                      onClick={() => setShowTripModal(true)}
                      className="text-amber-500 underline font-medium"
                    >
                      + Log Daily Site Trip
                    </button>{" "}
                    to record your first material delivery.
                  </td>
                </tr>
              ) : (
                trips.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">{t.tripNumber}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(t.date).toLocaleDateString("en-IN")}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{t.vehicle?.vehicleNumber}</div>
                      <div className="text-muted-foreground">{t.driver?.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{t.toLocation}</div>
                      <div className="text-muted-foreground">{t.project?.code ? `Proj: ${t.project.code}` : "Direct Dispatch"}</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{t.materialCarried || "Roofing Material"}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {t.totalKm} km
                      <div className="text-[10px] text-muted-foreground">
                        {t.startKm} ➔ {t.closingKm}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      ₹ {Number(t.fuelCost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      {Number(t.fuelLiters) > 0 && (
                        <div className="text-[10px] text-muted-foreground">{t.fuelLiters} L</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      ₹ {(Number(t.tollCost) + Number(t.driverBata)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-500">
                      ₹ {Number(t.totalCost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {t.journalEntry ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> {t.journalEntry.entryNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Direct Log</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log Daily Site Trip */}
      {showTripModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-2xl rounded-xl shadow-xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Navigation className="h-5 w-5 text-amber-500" /> Log Daily Cargo Trip & Fuel
              </h3>
              <button
                onClick={() => setShowTripModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTripSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={tripForm.date}
                    onChange={(e) => setTripForm({ ...tripForm, date: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Vehicle *</label>
                  <select
                    required
                    value={tripForm.vehicleId}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber} ({v.vehicleType})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Driver *</label>
                  <select
                    required
                    value={tripForm.driverId}
                    onChange={(e) => setTripForm({ ...tripForm, driverId: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Project Site Tag</label>
                  <select
                    value={tripForm.projectId}
                    onChange={(e) => {
                      const prj = projects.find((p) => p.id === e.target.value);
                      setTripForm({
                        ...tripForm,
                        projectId: e.target.value,
                        toLocation: prj ? `${prj.name} (${prj.siteLocation})` : tripForm.toLocation,
                      });
                    }}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="">-- General / Non-Project Dispatch --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name} ({p.siteLocation})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Destination Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Perundurai SIPCOT Site"
                    value={tripForm.toLocation}
                    onChange={(e) => setTripForm({ ...tripForm, toLocation: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Material Carried</label>
                  <input
                    type="text"
                    placeholder="e.g., Purlins, Clay Tiles, Star Bits"
                    value={tripForm.materialCarried}
                    onChange={(e) => setTripForm({ ...tripForm, materialCarried: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Opening Km</label>
                  <input
                    type="number"
                    value={tripForm.startKm}
                    onChange={(e) => setTripForm({ ...tripForm, startKm: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Closing Km *</label>
                  <input
                    type="number"
                    required
                    value={tripForm.closingKm}
                    onChange={(e) => setTripForm({ ...tripForm, closingKm: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              {/* Trip Expenses */}
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                <div className="text-xs font-bold text-foreground">Trip Expenses & Fuel (Auto Double-Entry)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-muted-foreground">Diesel / Fuel ₹</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tripForm.fuelCost}
                      onChange={(e) => setTripForm({ ...tripForm, fuelCost: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-1.5 rounded border border-border bg-background text-foreground font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground">Toll / RTO ₹</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tripForm.tollCost}
                      onChange={(e) => setTripForm({ ...tripForm, tollCost: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-1.5 rounded border border-border bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground">Driver Bata ₹</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tripForm.driverBata}
                      onChange={(e) => setTripForm({ ...tripForm, driverBata: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-1.5 rounded border border-border bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground">Repairs / Maint ₹</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tripForm.maintenanceCost}
                      onChange={(e) => setTripForm({ ...tripForm, maintenanceCost: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-1.5 rounded border border-border bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  <div>
                    <label className="block text-[11px] text-muted-foreground">Payment Mode</label>
                    <select
                      value={tripForm.paymentMode}
                      onChange={(e) => setTripForm({ ...tripForm, paymentMode: e.target.value })}
                      className="w-full text-xs p-1.5 rounded border border-border bg-background text-foreground"
                    >
                      <option value="CASH">Cash in Hand (1010)</option>
                      <option value="BANK">Bank Account (HDFC/ICICI)</option>
                    </select>
                  </div>
                  {tripForm.paymentMode === "BANK" && (
                    <div>
                      <label className="block text-[11px] text-muted-foreground">Select Bank</label>
                      <select
                        value={tripForm.bankAccountId}
                        onChange={(e) => setTripForm({ ...tripForm, bankAccountId: e.target.value })}
                        className="w-full text-xs p-1.5 rounded border border-border bg-background text-foreground"
                      >
                        <option value="">-- Select Bank --</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} - {b.accountNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowTripModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded border border-border bg-card text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm"
                >
                  Post Trip & Double-Entry Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Vehicle */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-500" /> Register Company Cargo Vehicle
            </h3>
            <form onSubmit={handleVehicleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Registration No *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., TN-33-AX-8912"
                  value={vehicleForm.vehicleNumber}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Vehicle Type</label>
                  <select
                    value={vehicleForm.vehicleType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="Bolero Pickup">Bolero Pickup</option>
                    <option value="Eicher 14ft">Eicher 14ft</option>
                    <option value="Tata Ace">Tata Ace</option>
                    <option value="Crane Truck">Crane Truck</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Odometer (km)</label>
                  <input
                    type="number"
                    value={vehicleForm.odometerKm}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, odometerKm: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Insurance Expiry</label>
                  <input
                    type="date"
                    value={vehicleForm.insuranceExpiry}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, insuranceExpiry: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Fitness (FC) Expiry</label>
                  <input
                    type="date"
                    value={vehicleForm.fitnessExpiry}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, fitnessExpiry: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Driver */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-amber-500" /> Add Dedicated Driver
            </h3>
            <form onSubmit={handleDriverSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., M. Senthil Kumar"
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Mobile No *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 94433 11223"
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">License No</label>
                  <input
                    type="text"
                    placeholder="TN33-20150004512"
                    value={driverForm.licenseNumber}
                    onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={driverForm.monthlySalary}
                    onChange={(e) => setDriverForm({ ...driverForm, monthlySalary: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Trip Bata Rate (₹)</label>
                  <input
                    type="number"
                    value={driverForm.tripBataRate}
                    onChange={(e) => setDriverForm({ ...driverForm, tripBataRate: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDriverModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  Save Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
