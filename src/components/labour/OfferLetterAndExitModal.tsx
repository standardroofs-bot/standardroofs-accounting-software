"use client";

import React, { useState, useEffect } from "react";
import { X, Printer, FileCheck, LogOut, CheckCircle2, Calendar, AlertTriangle, Save } from "lucide-react";
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

function numberToIndianWords(num: number): string {
  const n = Math.round(Math.abs(num));
  if (n === 0) return "Zero Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (v: number) => (v < 20 ? ones[v] : tens[Math.floor(v / 10)] + (v % 10 ? " " + ones[v % 10] : ""));
  const three = (v: number) => (v < 100 ? two(v) : ones[Math.floor(v / 100)] + " Hundred" + (v % 100 ? " " + two(v % 100) : ""));
  let res = "";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) res += three(crore) + " Crore ";
  if (lakh) res += two(lakh) + " Lakh ";
  if (thousand) res += two(thousand) + " Thousand ";
  if (rest) res += three(rest);
  return `${res.trim()} Only`;
}

function formatDotDate(dStr?: string | null) {
  const d = dStr ? new Date(dStr) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toLocaleDateString("en-GB").replace(/\//g, ".");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export function OfferLetterAndExitModal({ mode, worker, salaryVisible, onClose, onSuccess }: Props) {
  const isInvi = worker.companyUnit === "INVI_CREATION";
  const orgName = isInvi ? "INVI CREATION" : "STANDARD ROOFS";
  const isDriver = (worker.designation || "").toLowerCase().includes("driver");
  const basePay =
    worker.category === "OFFICE_STAFF"
      ? Number(worker.monthlySalary || 0)
      : Number(worker.dailyWage || 0);

  // Offer Letter Editable Fields (matches Offer Letter_Kaviya E.pdf)
  const [letterDate, setLetterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [salutation, setSalutation] = useState<"Mr." | "Ms.">("Ms.");
  const [designation, setDesignation] = useState(worker.designation || "Executive");
  const [department, setDepartment] = useState(isInvi ? "Digital & Creative" : "Operations & Accounts");
  const [joiningDate, setJoiningDate] = useState(
    worker.dateOfJoining ? worker.dateOfJoining.split("T")[0] : new Date().toISOString().slice(0, 10)
  );
  const [savingOffer, setSavingOffer] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

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

  const handleSaveOfferToVault = async () => {
    setSavingOffer(true);
    try {
      const termsSummary = `Offer Letter (${orgName}) | Date: ${letterDate} | Role: ${designation} (${department}) | Joining: ${formatDotDate(joiningDate)} | 1-month mandatory notice period.`;
      const res = await fetch(`/api/labour/${worker.id}/offer-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms: termsSummary }),
      });
      if (res.ok) {
        setSavedNotice(true);
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

  const formattedLetterDate = new Date(letterDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <ViewportPortal onBackdropClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-0"
        onMouseDown={(e) => e.stopPropagation()}
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
                  ? `Official Offer Letter — ${worker.name}`
                  : `1-Month Notice Exit & FnF Settlement — ${worker.name}`}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {worker.employeeCode} • {designation}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
            >
              <Printer size={14} />
              <span>Print / Save Official PDF</span>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs print:overflow-visible">
          {mode === "OFFER_LETTER" ? (
            <>
              {/* Inline Quick-Edit Controls (hidden on print) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 print:hidden">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Letter Date</label>
                  <input type="date" value={letterDate} onChange={(e) => setLetterDate(e.target.value)} className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Title</label>
                  <select value={salutation} onChange={(e) => setSalutation(e.target.value as any)} className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs font-semibold">
                    <option value="Ms.">Ms.</option>
                    <option value="Mr.">Mr.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Designation</label>
                  <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Department</label>
                  <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Joining Date</label>
                  <input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs" />
                </div>
              </div>

              {/* OFFICIAL A4 LETTERHEAD REPLICA (Offer Letter_Kaviya E.pdf) */}
              <div className="border border-slate-300 rounded-xl p-8 space-y-5 bg-white text-slate-900">
                <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt={orgName} className="w-12 h-12 object-contain shrink-0" />
                    <div>
                      <div className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                        {orgName}{" "}
                        <span className="text-xs font-bold text-slate-600">
                          {isInvi ? "- DIGITAL & TECH SOLUTIONS" : "- HIGH QUALITY ROOFING SOLUTIONS"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 max-w-sm leading-snug">
                        <strong>Address:</strong> D144/A, Vellakkal Medu, Infront of Manjal Vaniga Valagam Nasiyanur post, Erode-638107
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[10.5px] text-slate-700 font-mono leading-relaxed shrink-0">
                    <div><strong>GSTIN:</strong> 33AEWFS5187G1ZD</div>
                    <div><strong>PAN:</strong> AEWFS5187</div>
                    <div>8608475767</div>
                    <div>info@standardroofs.in</div>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-800">Date: {formattedLetterDate}</div>

                <div className="text-[13px] leading-relaxed space-y-4">
                  <p className="font-bold">
                    Dear {salutation} {worker.name},
                  </p>
                  <p>
                    We are pleased to offer you the position of <strong>{designation}</strong> in the{" "}
                    <strong>{department}</strong> Department at <strong>{orgName}</strong>. We are confident that your
                    skills, dedication, and abilities will contribute positively to the growth and success of our
                    organization.
                  </p>

                  <div>
                    <div className="font-extrabold text-slate-900 underline mb-2">Terms of Employment:</div>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>
                        <strong>Joining Date:</strong> Your official date of joining will be{" "}
                        <strong>{formatDotDate(joiningDate)}</strong>.
                      </li>
                      <li>
                        <strong>{worker.category === "OFFICE_STAFF" ? "Monthly Salary:" : "Daily Compensation:"}</strong>{" "}
                        {salaryVisible && !worker.salaryMasked ? (
                          <>
                            You will receive a {worker.category === "OFFICE_STAFF" ? "monthly salary" : "daily wage"} of{" "}
                            <strong>
                              {formatINR(basePay)}/- (Rupees {numberToIndianWords(basePay)})
                            </strong>
                            .
                            {(isDriver || Number(worker.defaultVehicleAllowance || 0) > 0) &&
                              ` Plus Vehicle Allowance of ${formatINR(Number(worker.defaultVehicleAllowance || 0))}/month.`}
                          </>
                        ) : (
                          "Confidential compensation as agreed (Super Admin view required to unmask)."
                        )}
                      </li>
                      <li>
                        <strong>Notice Period:</strong> As per company policy, a one-month notice period is mandatory
                        if you wish to resign from your position.
                      </li>
                      <li>
                        <strong>Acceptance:</strong> Please confirm your acceptance of this offer by signing and
                        returning a copy of this letter.
                      </li>
                    </ul>
                  </div>

                  <p>
                    We look forward to welcoming you to the {orgName} family and wish you a successful and rewarding
                    career with us.
                  </p>
                </div>

                <div className="pt-4 flex items-end justify-between text-[13px]">
                  <div>
                    <div>Best Regards,</div>
                    <div className="font-extrabold text-slate-900 mt-8">{orgName}.</div>
                  </div>
                  <div className="text-center">
                    <div className="w-48 border-t border-slate-500 pt-1 text-xs font-semibold text-slate-700">
                      Candidate Acceptance ({worker.name})
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 print:hidden">
                <span className="text-[11px] text-emerald-700 font-semibold">
                  {savedNotice ? "Saved to Employee Document Vault!" : ""}
                </span>
                <button
                  type="button"
                  disabled={savingOffer}
                  onClick={handleSaveOfferToVault}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{savingOffer ? "Saving..." : "Save Copy to Employee Document Vault"}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* 1-Month Notice Period Tracker */}
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5">
                    <Calendar size={15} />
                    <span>1-Month (30 Days) Notice Period Tracker</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                    {daysElapsed} / 30 Days Served
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Resignation Date</label>
                    <input
                      type="date"
                      value={resignationDate}
                      onChange={(e) => setResignationDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Auto Last Working Day (+30 Days)</label>
                    <div className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-900">
                      {lwdDateObj.toLocaleDateString("en-IN")}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-rose-200/60 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-600 h-2 rounded-full transition-all" style={{ width: `${(daysElapsed / 30) * 100}%` }} />
                </div>
              </div>

              {/* Handover Checklist */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="font-bold text-slate-800">Asset &amp; Site Handover Checklist</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "toolsReturned", label: "Company Tools & PPE Returned" },
                    { key: "idCardReturned", label: "ID Card & Uniform Returned" },
                    { key: "siteKeysReturned", label: "Site Keys / Vehicle Keys Returned" },
                    { key: "advanceCleared", label: "Cash Advances Reconciled" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean((checklist as any)[item.key])}
                        onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="font-medium text-slate-700">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Full & Final Settlement Calculator */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Full &amp; Final (FnF) Settlement Calculator</span>
                  {!salaryVisible && (
                    <span className="text-[10px] text-amber-700 flex items-center gap-1">
                      <AlertTriangle size={12} /> Salaries masked in overview
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Pro-rated Salary (₹)</label>
                    <input type="number" value={proratedSalary} onChange={(e) => setProratedSalary(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Pending Bal (₹)</label>
                    <input type="number" value={pendingBalance} onChange={(e) => setPendingBalance(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-emerald-700 mb-1">Incentives (₹)</label>
                    <input type="number" value={incentives} onChange={(e) => setIncentives(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-rose-700 mb-1">Advances Ded (₹)</label>
                    <input type="number" value={unrecoveredAdvances} onChange={(e) => setUnrecoveredAdvances(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-rose-700 mb-1">Tool Ded (₹)</label>
                    <input type="number" value={toolDeduction} onChange={(e) => setToolDeduction(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold tabular-nums" />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
                  <span className="font-bold text-indigo-900">Net FnF Settlement Payable</span>
                  <span className="text-lg font-extrabold text-indigo-700 tabular-nums">{formatINR(netFnf)}</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={savingExit}
                  onClick={() => handleExitAction("INITIATE_EXIT")}
                  className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                >
                  Save Notice Period
                </button>
                <button
                  type="button"
                  disabled={savingExit}
                  onClick={() => handleExitAction("COMPLETE_FNF")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>Complete FnF &amp; Archive Employee</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ViewportPortal>
  );
}
