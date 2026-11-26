"use client";

import React, { useState, useEffect } from "react";
import { X, Printer, FileCheck, LogOut, CheckCircle2, Calendar, AlertTriangle } from "lucide-react";
import { ViewportPortal } from "@/components/ui/ViewportPortal";

interface OfferExitWorker {
  id: string;
  name: string;
  employeeCode: string;
  designation?: string | null;
  category: string;
  companyUnit: string;
  location?: string | null;
  state?: string | null;
  dateOfJoining?: string | null;
  monthlySalary?: number | string | null;
  dailyWage?: number | string | null;
  defaultVehicleAllowance?: number | null;
  resignationDate?: string | null;
  lastWorkingDate?: string | null;
  exitStatus?: string | null;
  handoverChecklistJson?: string | null;
  fnfSettlementAmount?: number | null;
  salaryMasked?: boolean;
}

interface Props {
  mode: "OFFER_LETTER" | "EXIT_FNF";
  worker: OfferExitWorker;
  salaryVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function formatINR(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(val || 0));
}

export function OfferLetterAndExitModal({ mode, worker, salaryVisible, onClose, onSuccess }: Props) {
  const isInvi = worker.companyUnit === "INVI_CREATION";
  const orgName = isInvi ? "INVI CREATION" : "STANDARD ROOFS";
  const isDriver = (worker.designation || "").toLowerCase().includes("driver");
  const basePay =
    worker.category === "OFFICE_STAFF"
      ? Number(worker.monthlySalary || 0)
      : Number(worker.dailyWage || 0);

  // Offer Letter State
  const [terms, setTerms] = useState(
    "Standard 1-Month (30 Days) Notice Period applies on either side. Subject to statutory KYC verification and site safety compliance."
  );
  const [savingOffer, setSavingOffer] = useState(false);

  // Exit / FnF State
  const [resignationDate, setResignationDate] = useState(
    worker.resignationDate ? worker.resignationDate.split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [checklist, setChecklist] = useState({
    toolsReturned: false,
    idCardReturned: false,
    siteKeysReturned: false,
    advanceCleared: false,
    remarks: "",
  });
  const [proratedSalary, setProratedSalary] = useState(basePay);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [incentives, setIncentives] = useState(0);
  const [unrecoveredAdvances, setUnrecoveredAdvances] = useState(0);
  const [toolDeduction, setToolDeduction] = useState(0);
  const [savingExit, setSavingExit] = useState(false);

  useEffect(() => {
    if (worker.handoverChecklistJson) {
      try {
        setChecklist((prev) => ({ ...prev, ...JSON.parse(worker.handoverChecklistJson!) }));
      } catch {}
    }
  }, [worker.handoverChecklistJson]);

  const resDateObj = new Date(resignationDate);
  const lwdDateObj = new Date(resDateObj.getTime() + 30 * 86400000);
  const daysElapsed = Math.max(
    0,
    Math.min(30, Math.floor((Date.now() - resDateObj.getTime()) / 86400000) + 1)
  );
  const netFnf = Math.round(proratedSalary + pendingBalance + incentives - unrecoveredAdvances - toolDeduction);

  const handleIssueOffer = async () => {
    setSavingOffer(true);
    try {
      const res = await fetch(`/api/labour/${worker.id}/offer-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms }),
      });
      if (res.ok) {
        onSuccess();
      }
    } finally {
      setSavingOffer(false);
    }
  };

  const handleExitAction = async (action: "INITIATE_EXIT" | "UPDATE_HANDOVER" | "COMPLETE_FNF") => {
    setSavingExit(true);
    try {
      const res = await fetch(`/api/labour/${worker.id}/exit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          resignationDate,
          handoverChecklist: checklist,
          fnfAmount: netFnf,
        }),
      });
      if (res.ok) {
        onSuccess();
        if (action === "COMPLETE_FNF") onClose();
      }
    } finally {
      setSavingExit(false);
    }
  };

  return (
    <ViewportPortal onBackdropClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode === "OFFER_LETTER" ? "bg-indigo-50 text-indigo-600" : "bg-rose-50 text-rose-600"}`}>
              {mode === "OFFER_LETTER" ? <FileCheck size={18} /> : <LogOut size={18} />}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {mode === "OFFER_LETTER"
                  ? `Digital Offer Letter — ${worker.name}`
                  : `1-Month Notice Exit & FnF Settlement — ${worker.name}`}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {worker.employeeCode} • {worker.designation || worker.category}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
            >
              <Printer size={14} />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs print:overflow-visible">
          {mode === "OFFER_LETTER" ? (
            <div className="border border-slate-200 rounded-xl p-6 space-y-4 bg-white">
              <div className="flex items-start justify-between border-b-2 border-indigo-600 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/standard-roofs-logo.png"
                    onError={(e) => ((e.target as HTMLImageElement).src = "/logo.png")}
                    alt={orgName}
                    className="w-12 h-12 object-contain"
                  />
                  <div>
                    <div className="text-lg font-extrabold text-slate-900">{orgName}</div>
                    <div className="text-[11px] text-slate-600">
                      144/A, Vellakkal Medu, Villarasampatti, Nasiyanur (Post), Erode – 638107, Tamil Nadu
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    OFFER OF EMPLOYMENT
                  </span>
                  <div className="text-[11px] font-mono text-slate-600 mt-1">
                    Date: {new Date().toLocaleDateString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="space-y-2 leading-relaxed text-slate-800 text-[13px]">
                <p>
                  Dear <strong>{worker.name}</strong> ({worker.employeeCode}),
                </p>
                <p>
                  We are pleased to offer you the position of{" "}
                  <strong>{worker.designation || worker.category.replace("_", " ")}</strong> at{" "}
                  <strong>{orgName}</strong>, based at{" "}
                  <strong>
                    {worker.location || "Erode"}, {worker.state || "Tamil Nadu"}
                  </strong>
                  , effective{" "}
                  <strong>
                    {worker.dateOfJoining
                      ? new Date(worker.dateOfJoining).toLocaleDateString("en-IN")
                      : new Date().toLocaleDateString("en-IN")}
                  </strong>
                  .
                </p>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-xs">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="py-2 px-3 bg-slate-50 font-bold text-slate-600 w-1/3">Designation</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{worker.designation || "Staff / Crew"}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="py-2 px-3 bg-slate-50 font-bold text-slate-600">Compensation</td>
                    <td className="py-2 px-3 font-bold text-indigo-700 tabular-nums">
                      {salaryVisible && !worker.salaryMasked
                        ? worker.category === "OFFICE_STAFF"
                          ? `${formatINR(basePay)} / Month`
                          : `${formatINR(basePay)} / Day`
                        : "•••••• (Confidential — Super Admin Only)"}
                    </td>
                  </tr>
                  {(isDriver || Number(worker.defaultVehicleAllowance || 0) > 0) && (
                    <tr className="border-b border-slate-300">
                      <td className="py-2 px-3 bg-slate-50 font-bold text-slate-600">Vehicle Allowance</td>
                      <td className="py-2 px-3 font-semibold text-slate-900 tabular-nums">
                        {salaryVisible && !worker.salaryMasked
                          ? `${formatINR(Number(worker.defaultVehicleAllowance || 0))} / Month`
                          : "••••••"}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-2 px-3 bg-slate-50 font-bold text-slate-600">Notice Period</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">1 Month (30 Calendar Days)</td>
                  </tr>
                </tbody>
              </table>

              <div className="print:hidden">
                <label className="block font-semibold text-slate-700 mb-1">Offer Terms &amp; Clauses</label>
                <textarea
                  rows={2}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <p className="text-[11px] text-slate-600 italic">{terms}</p>

              <div className="pt-4 border-t border-slate-200 text-center text-[11px] text-slate-500">
                System-generated digital offer letter from SR-Books ERP • {orgName}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Notice Period Countdown Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Calendar size={18} className="text-amber-600" />
                  <div>
                    <div className="font-bold text-amber-900">
                      1-Month Notice Period ({worker.exitStatus === "EXITED" ? "Completed" : `Day ${daysElapsed} of 30`})
                    </div>
                    <div className="text-[11px] text-amber-700">
                      Last Working Date: <strong>{lwdDateObj.toLocaleDateString("en-IN")}</strong>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <label className="font-semibold text-slate-700">Resignation Date:</label>
                  <input
                    type="date"
                    value={resignationDate}
                    onChange={(e) => setResignationDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold"
                  />
                  <button
                    type="button"
                    disabled={savingExit}
                    onClick={() => handleExitAction("INITIATE_EXIT")}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Start 30-Day Notice
                  </button>
                </div>
              </div>

              {/* Handover Checklist */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Exit Handover Clearance Checklist
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: "toolsReturned", label: "Site Tools Returned" },
                    { key: "idCardReturned", label: "ID Card Returned" },
                    { key: "siteKeysReturned", label: "Site Keys Returned" },
                    { key: "advanceCleared", label: "Advances Cleared" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(checklist as any)[item.key]}
                        onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="font-semibold text-slate-700">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* FnF Calculator */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Full &amp; Final (FnF) Settlement Statement
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 print:hidden">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Notice Salary (₹)</label>
                    <input type="number" value={proratedSalary} onChange={(e) => setProratedSalary(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Pending Bal (₹)</label>
                    <input type="number" value={pendingBalance} onChange={(e) => setPendingBalance(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Incentives (₹)</label>
                    <input type="number" value={incentives} onChange={(e) => setIncentives(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold" />
                  </div>
                  <div>
                    <label className="block font-semibold text-rose-600 mb-1">Adv Recovery (₹)</label>
                    <input type="number" value={unrecoveredAdvances} onChange={(e) => setUnrecoveredAdvances(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-rose-600" />
                  </div>
                  <div>
                    <label className="block font-semibold text-rose-600 mb-1">Tool Recovery (₹)</label>
                    <input type="number" value={toolDeduction} onChange={(e) => setToolDeduction(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-rose-600" />
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase text-indigo-700">
                      Net FnF {netFnf >= 0 ? "Payable to Employee" : "Recoverable from Employee"}
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5">
                      {formatINR(netFnf)}
                    </div>
                  </div>
                  <AlertTriangle className="text-indigo-500" size={24} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Close
          </button>
          {mode === "OFFER_LETTER" ? (
            <button
              type="button"
              disabled={savingOffer}
              onClick={handleIssueOffer}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              <span>{savingOffer ? "Saving..." : "Save Offer Letter to Vault"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={savingExit}
                onClick={() => handleExitAction("UPDATE_HANDOVER")}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Save Checklist
              </button>
              <button
                type="button"
                disabled={savingExit}
                onClick={() => handleExitAction("COMPLETE_FNF")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>{savingExit ? "Settling..." : "Complete FnF & Archive"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </ViewportPortal>
  );
}
