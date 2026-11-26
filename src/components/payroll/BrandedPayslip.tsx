"use client";

import React from "react";
import { formatINR } from "@/lib/decimal";

export interface BrandedPayslipItem {
  id: string;
  employeeId?: string | null;
  employeeCode: string;
  employeeName: string;
  designation: string | null;
  category?: string;
  company: string;
  totalWorkingDays: number;
  daysPresent: number;
  leaveDays: number;
  baseRate: number;
  grossSalary: number;
  otAndIncentive: number;
  performanceIncentive?: number;
  performanceScore?: number | null;
  nightDutyAmount: number;
  lastMonthBalance: number;
  advanceDeduction: number;
  expenseBalanceDeduction: number;
  vehicleAllowance: number;
  netSalary: number;
  paidCash: number;
  paidBankOrGpay: number;
  paidGpay?: number;
  gpayWallet?: string | null;
  carryForwardBalance: number;
  paymentChannel: string;
  paymentStatus: string;
  paymentReason?: string | null;
  paymentRef?: string | null;
  paidDate?: string | null;
  notes?: string | null;
  employee?: {
    phone?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    aadharNumber?: string | null;
    joiningDate?: string | null;
    designation?: string | null;
    role?: string | null;
    baseLocation?: string | null;
    companyUnit?: string | null;
  } | null;
}

export interface BrandedPayslipRun {
  month: string;
  cycleType: string;
  halfPeriod: string;
  status: string;
}

function numberToIndianWords(num: number): string {
  const n = Math.round(Math.abs(num));
  if (n === 0) return "Zero Rupees Only";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (val: number) => {
    if (val < 20) return ones[val];
    return tens[Math.floor(val / 10)] + (val % 10 ? " " + ones[val % 10] : "");
  };

  const threeDigits = (val: number) => {
    if (val < 100) return twoDigits(val);
    return ones[Math.floor(val / 100)] + " Hundred" + (val % 100 ? " " + twoDigits(val % 100) : "");
  };

  let res = "";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  if (crore) res += threeDigits(crore) + " Crore ";
  if (lakh) res += twoDigits(lakh) + " Lakh ";
  if (thousand) res += twoDigits(thousand) + " Thousand ";
  if (rest) res += threeDigits(rest);

  return `Indian Rupee ${res.trim()} Only`;
}

function formatMonthTitle(month: string, halfPeriod: string) {
  const [y, m] = (month || "2026-11").split("-").map(Number);
  const d = new Date(y || 2026, (m || 1) - 1, 1);
  const monthLabel = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  if (halfPeriod === "FIRST_HALF") return `${monthLabel} (1st – 15th)`;
  if (halfPeriod === "SECOND_HALF") return `${monthLabel} (16th – End)`;
  return monthLabel;
}

function formatDateDisplay(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function BrandedPayslip({
  item,
  run,
  month,
  halfPeriod,
  status,
  serialNo,
  slipIndex,
}: {
  item: BrandedPayslipItem;
  run?: BrandedPayslipRun;
  month?: string;
  halfPeriod?: string;
  status?: string;
  serialNo?: number;
  slipIndex?: number;
}) {
  const effectiveRun: BrandedPayslipRun = run || {
    month: month || "2026-11",
    cycleType: "MONTHLY_OFFICE",
    halfPeriod: halfPeriod || "FULL",
    status: status || "PAID",
  };
  const effectiveSerial = serialNo ?? (slipIndex !== undefined ? slipIndex + 1 : 1);
  const isInvi =
    item.company === "INVI_CREATION" || item.employee?.companyUnit === "INVI_CREATION";
  const companyName = isInvi ? "INVI CREATION" : "STANDARD ROOFS";
  const companyAddress = isInvi
    ? "146/A, Vellaikal Medu, Villarasampatti, Nasiyanur (Post), Erode, Tamil Nadu – 638107"
    : "146/A, Vellaikal Medu, Villarasampatti, Nasiyanur (Post), Erode, Tamil Nadu – 638107";
  const companySub = "Ph: +91 96984 15157 • hr@standardroofs.com • www.standardroofs.com";

  const roleStr = item.designation || item.employee?.designation || item.employee?.role || "Staff";
  const isDriver = roleStr.toLowerCase().includes("driver");
  const showVehicle = isDriver || Number(item.vehicleAllowance || 0) > 0;

  const perfInc = Number(item.performanceIncentive || 0);
  const otInc = Number(item.otAndIncentive || 0);
  const vehAllow = showVehicle ? Number(item.vehicleAllowance || 0) : 0;
  const totalEarnings = Number(item.grossSalary || 0) + otInc + perfInc + vehAllow;
  const totalDeductions = Number(item.advanceDeduction || 0);
  const netPayable = Number(item.netSalary || 0);

  const paidCash = Number(item.paidCash || 0);
  const paidBank = Number(item.paidBankOrGpay || 0);
  const paidGpay = Number(item.paidGpay || 0);
  const totalPaid = paidCash + paidBank + paidGpay;
  const balanceCf = Number(item.carryForwardBalance || 0);
  const isPaid = item.paymentStatus === "PAID" || (totalPaid >= netPayable && netPayable > 0);

  const periodTitle = formatMonthTitle(effectiveRun.month, effectiveRun.halfPeriod);
  const slipNo = `SR-PAY/${effectiveRun.month.replace("-", "/")}/${String(effectiveSerial).padStart(3, "0")}`;

  return (
    <div className="bg-white text-slate-900 border border-slate-300 rounded-xl overflow-hidden shadow-xs print:border-slate-400 print:shadow-none print:rounded-none">
      {/* CORPORATE HEADER (ZERO GSTIN) */}
      <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-white">
        <div className="flex items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/standard-roofs-logo.png"
            alt={companyName}
            className="w-12 h-12 rounded-lg object-contain border border-slate-200 bg-white p-1 shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
              {companyName}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-md leading-snug">
              {companyAddress}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{companySub}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Payslip for the month of
          </div>
          <div className="text-base font-extrabold text-slate-900 mt-0.5">{periodTitle}</div>
          <div className="mt-1.5 flex items-center justify-end gap-2">
            <span className="text-[10px] font-mono text-slate-500">{slipNo}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                isPaid
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : item.paymentStatus === "PARTIAL"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {isPaid ? "PAID" : item.paymentStatus || "UNPAID"}
            </span>
          </div>
        </div>
      </div>

      {/* EMPLOYEE SUMMARY + BOXED NET PAY / PAID DAYS */}
      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-12 gap-5 border-b border-slate-200">
        <div className="md:col-span-8">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Employee Pay Summary
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500">Employee Name</span>
              <span className="font-bold text-slate-900 text-right">{item.employeeName}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500">Employee ID</span>
              <span className="font-mono font-semibold text-slate-800">{item.employeeCode || "—"}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500">Designation</span>
              <span className="font-semibold text-slate-800 text-right">{roleStr}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500">Date of Joining</span>
              <span className="font-medium text-slate-800">
                {formatDateDisplay(item.employee?.joiningDate)}
              </span>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500">Location</span>
              <span className="font-medium text-slate-800 text-right">
                {item.employee?.baseLocation || "Erode, TN"}
              </span>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500">Mobile No</span>
              <span className="font-mono text-slate-800">{item.employee?.phone || "—"}</span>
            </div>
            <div className="flex justify-between gap-2 pb-1">
              <span className="text-slate-500">Bank Name</span>
              <span className="font-medium text-slate-800 text-right">
                {item.employee?.bankName || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2 pb-1">
              <span className="text-slate-500">Bank A/C No</span>
              <span className="font-mono text-slate-800">
                {item.employee?.accountNumber || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* BOXED PAID DAYS / LOP DAYS + NET PAY CARD */}
        <div className="md:col-span-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Employee Net Pay
            </div>
            <div className="text-2xl font-black text-emerald-700 tabular-nums mt-0.5">
              {formatINR(netPayable)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded-lg border border-slate-200 py-1.5 px-1">
              <div className="text-[9px] font-bold uppercase text-slate-400">Sched</div>
              <div className="text-xs font-extrabold text-slate-800 tabular-nums">
                {item.totalWorkingDays}d
              </div>
            </div>
            <div className="bg-white rounded-lg border border-emerald-200 py-1.5 px-1">
              <div className="text-[9px] font-bold uppercase text-emerald-600">Paid Days</div>
              <div className="text-xs font-extrabold text-emerald-700 tabular-nums">
                {item.daysPresent}d
              </div>
            </div>
            <div className="bg-white rounded-lg border border-rose-200 py-1.5 px-1">
              <div className="text-[9px] font-bold uppercase text-rose-500">LOP Days</div>
              <div className="text-xs font-extrabold text-rose-600 tabular-nums">
                {item.leaveDays}d
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SIDE-BY-SIDE EARNINGS & DEDUCTIONS TABLE */}
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 border border-slate-200 rounded-xl overflow-hidden">
          {/* EARNINGS */}
          <div className="border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between">
            <div>
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                <span>Earnings</span>
                <span>Amount</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Basic &amp; Pro-Rated Earned</div>
                    <div className="text-[10px] text-slate-400">
                      Base Rate {formatINR(item.baseRate)} • {item.daysPresent}/{item.totalWorkingDays} days
                    </div>
                  </div>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatINR(item.grossSalary)}
                  </span>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="font-medium text-slate-700">Overtime (OT) Allowance</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatINR(otInc)}
                  </span>
                </div>
                {perfInc > 0 && (
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <span className="font-medium text-slate-700">Performance Incentive</span>
                    <span className="font-semibold text-emerald-700 tabular-nums">
                      {formatINR(perfInc)}
                    </span>
                  </div>
                )}
                {showVehicle && (
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <span className="font-medium text-slate-700">Vehicle / Travel Allowance</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatINR(vehAllow)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs font-extrabold text-slate-900">
              <span>Gross Earnings</span>
              <span className="tabular-nums">{formatINR(totalEarnings)}</span>
            </div>
          </div>

          {/* DEDUCTIONS */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                <span>Deductions</span>
                <span>Amount</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="font-medium text-slate-700">Salary Advance Recovery</span>
                  <span className="font-semibold text-rose-700 tabular-nums">
                    {formatINR(item.advanceDeduction)}
                  </span>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between text-slate-500">
                  <span>LOP / Unpaid Leave ({item.leaveDays} days)</span>
                  <span className="tabular-nums">Adjusted in Earned</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs font-extrabold text-slate-900">
              <span>Total Deductions</span>
              <span className="tabular-nums text-rose-700">{formatINR(totalDeductions)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DASHED TOTAL NET PAYABLE BOX */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
              Total Net Payable
            </div>
            <div className="text-[11px] text-emerald-800 font-medium mt-0.5">
              Gross Earnings ({formatINR(totalEarnings)}) – Total Deductions ({formatINR(totalDeductions)})
            </div>
            <div className="text-[11px] font-semibold text-slate-700 mt-1">
              In Words: <span className="italic">{numberToIndianWords(netPayable)}</span>
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tabular-nums shrink-0">
            {formatINR(netPayable)}
          </div>
        </div>
      </div>

      {/* DISBURSEMENT PROOF & BANK STATEMENT REFERENCE BOX */}
      <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Disbursement Proof &amp; Bank Statement Reference
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
            <div className="text-[10px] text-slate-400 font-semibold">Cash Paid</div>
            <div className="font-bold text-slate-800 tabular-nums">{formatINR(paidCash)}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
            <div className="text-[10px] text-slate-400 font-semibold">Bank / ICICI</div>
            <div className="font-bold text-slate-800 tabular-nums">{formatINR(paidBank)}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
            <div className="text-[10px] text-slate-400 font-semibold">Office GPay</div>
            <div className="font-bold text-slate-800 tabular-nums">{formatINR(paidGpay)}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
            <div className="text-[10px] text-slate-400 font-semibold">UTR / Ref No.</div>
            <div className="font-mono font-bold text-indigo-700 truncate">
              {item.paymentRef || "—"}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
            <div className="text-[10px] text-slate-400 font-semibold">Paid Date / C/F</div>
            <div className="font-semibold text-slate-800">
              {item.paidDate ? formatDateDisplay(item.paidDate) : `C/F ${formatINR(balanceCf)}`}
            </div>
          </div>
        </div>
        {item.notes && (
          <div className="mt-2 text-[11px] text-slate-600">
            <span className="font-semibold">Payment Note:</span> {item.notes}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-6 py-4 bg-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="text-[10px] text-slate-400">
          This is a system-generated payslip from Standard Roofs Books (SR-Books) and does not require a physical signature.
        </div>
        <div className="flex items-center gap-8 text-[11px] font-semibold text-slate-600 shrink-0">
          <div className="text-center">
            <div className="w-28 border-t border-slate-300 pt-1">Employee Signature</div>
          </div>
          <div className="text-center">
            <div className="w-32 border-t border-slate-300 pt-1">Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrandedPayslip;
