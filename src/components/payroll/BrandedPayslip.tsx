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
  ytd?: {
    grossSalary?: number;
    otAndIncentive?: number;
    performanceIncentive?: number;
    vehicleAllowance?: number;
    advanceDeduction?: number;
    expenseBalanceDeduction?: number;
  } | null;
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
  if (n === 0) return "Indian Rupee Zero Only";
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
  const parts = monthLabel.split(" ");
  const formatted = parts.length === 2 ? `${parts[0]}, ${parts[1]}` : monthLabel;
  if (halfPeriod === "FIRST_HALF") return `${formatted} (1st – 15th)`;
  if (halfPeriod === "SECOND_HALF") return `${formatted} (16th – End)`;
  return formatted;
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
  const companyName = isInvi ? "Invi Creation" : "Standard Roofs";
  const companyAddress =
    "D144/A, Vellakkal Medu, Infront of Manjal Vaniga Valagam, Nasiyanur Post, Erode - 638107";
  const companySub = "Ph: +91 8608475767 • info@standardroofs.in";

  const roleStr = item.designation || item.employee?.designation || item.employee?.role || "Staff";
  const isDriver = roleStr.toLowerCase().includes("driver");
  const showVehicle = isDriver || Number(item.vehicleAllowance || 0) > 0;

  const grossEarned = Number(item.grossSalary || 0);
  const perfInc = Number(item.performanceIncentive || 0);
  const otInc = Number(item.otAndIncentive || 0);
  const vehAllow = showVehicle ? Number(item.vehicleAllowance || 0) : 0;
  const totalReimbursements = otInc + perfInc + vehAllow + Number(item.nightDutyAmount || 0) + Number(item.lastMonthBalance || 0);
  const advDed = Number(item.advanceDeduction || 0);
  const expDed = Number(item.expenseBalanceDeduction || 0);
  const totalDeductions = advDed + expDed;
  const netPayable = Number(item.netSalary || 0);

  const ytdGross = Number(item.ytd?.grossSalary ?? grossEarned);
  const ytdAdv = Number(item.ytd?.advanceDeduction ?? advDed);
  const ytdExp = Number(item.ytd?.expenseBalanceDeduction ?? expDed);
  const ytdOt = Number(item.ytd?.otAndIncentive ?? otInc);
  const ytdPerf = Number(item.ytd?.performanceIncentive ?? perfInc);
  const ytdVeh = Number(item.ytd?.vehicleAllowance ?? vehAllow);

  const paidCash = Number(item.paidCash || 0);
  const paidBank = Number(item.paidBankOrGpay || 0);
  const paidGpay = Number(item.paidGpay || 0);
  const totalPaid = paidCash + paidBank + paidGpay;
  const balanceCf = Number(item.carryForwardBalance || 0);
  const isPaid = item.paymentStatus === "PAID" || (totalPaid >= netPayable && netPayable > 0);

  const periodTitle = formatMonthTitle(effectiveRun.month, effectiveRun.halfPeriod);
  const slipNo = `SR-PAY/${effectiveRun.month.replace("-", "/")}/${String(effectiveSerial).padStart(3, "0")}`;

  return (
    <div className="bg-white text-slate-900 border border-slate-300 rounded-xl overflow-hidden shadow-xs print:border print:border-slate-300 print:shadow-none print:rounded-none">
      {/* CLEAN CORPORATE HEADER (NO GSTIN) */}
      <div className="px-6 py-4 flex items-start justify-between gap-4 bg-white">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-[#0F172A] leading-tight">
            {companyName}
          </h2>
          <p className="text-[11px] text-slate-600 mt-1 max-w-md leading-snug">
            {companyAddress}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{companySub}</p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={companyName} className="h-11 w-auto object-contain" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">{slipNo}</span>
            <span className="px-2 py-0.5 rounded border border-slate-300 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-800">
              {isPaid ? "PAID" : item.paymentStatus || "UNPAID"}
            </span>
          </div>
        </div>
      </div>

      {/* SUB-BANNER */}
      <div className="px-6 py-2.5 border-y border-slate-300 bg-slate-50">
        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
          PAYSLIP FOR THE MONTH OF {periodTitle.toUpperCase()}
        </div>
      </div>

      {/* EMPLOYEE SUMMARY (70%) + COMPACT RIGHT ATTENDANCE TABLE (30%) */}
      <div className="px-6 py-4 grid grid-cols-12 gap-5 border-b border-slate-200 items-center">
        <div className="col-span-8">
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
            Employee Pay Summary
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-[11px]">
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500">Employee Name</span>
              <span className="font-bold text-slate-900 text-right">{item.employeeName}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500">Employee ID</span>
              <span className="font-mono font-bold text-slate-900">{item.employeeCode || "—"}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500">Designation</span>
              <span className="font-semibold text-slate-800 text-right">{roleStr}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500">Department</span>
              <span className="font-medium text-slate-800 text-right">{companyName}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500">Date of Joining</span>
              <span className="font-medium text-slate-800">{formatDateDisplay(item.employee?.joiningDate)}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500">Mobile No</span>
              <span className="font-mono text-slate-800">{item.employee?.phone || "—"}</span>
            </div>
            <div className="col-span-2 flex justify-between gap-2 pb-0.5">
              <span className="text-slate-500">Bank Account No</span>
              <span className="font-mono text-slate-800">
                {item.employee?.bankName ? `${item.employee.bankName} • ` : ""}
                {item.employee?.accountNumber || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COMPACT BORDERED 3-ROW ATTENDANCE TABLE */}
        <div className="col-span-4">
          <div className="w-full rounded-lg border border-slate-300 overflow-hidden bg-white text-xs">
            <div className="grid grid-cols-2 border-b border-slate-200 px-3 py-2 items-center">
              <span className="font-semibold text-slate-600">Working Days</span>
              <span className="text-right font-bold text-slate-900 tabular-nums">{item.totalWorkingDays}</span>
            </div>
            <div className="grid grid-cols-2 border-b border-slate-200 px-3 py-2 items-center bg-slate-50/60">
              <span className="font-semibold text-slate-600">Paid Days</span>
              <span className="text-right font-extrabold text-slate-900 tabular-nums">{item.daysPresent}</span>
            </div>
            <div className="grid grid-cols-2 px-3 py-2 items-center">
              <span className="font-semibold text-slate-600">LOP Days</span>
              <span className="text-right font-bold text-slate-900 tabular-nums">{item.leaveDays}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SIDE-BY-SIDE EARNINGS (50%) & DEDUCTIONS (50%) TABLE — ENFORCED IN SCREEN & PRINT */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="grid grid-cols-2 border border-slate-300 rounded-lg overflow-hidden">
          {/* EARNINGS */}
          <div className="border-r border-slate-200 flex flex-col justify-between">
            <div>
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 grid grid-cols-[1.6fr_1fr_1fr] gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[#0F172A]">
                <span>Earnings</span>
                <span className="text-right">Amount</span>
                <span className="text-right">YTD</span>
              </div>
              <div className="divide-y divide-slate-100 text-[11px]">
                <div className="px-3 py-2 grid grid-cols-[1.6fr_1fr_1fr] gap-2 items-center">
                  <div>
                    <div className="font-semibold text-slate-800">Basic / Pro-Rated</div>
                    <div className="text-[9.5px] text-slate-400">Rate {formatINR(item.baseRate)}</div>
                  </div>
                  <span className="text-right font-semibold text-slate-900 tabular-nums">{formatINR(grossEarned)}</span>
                  <span className="text-right text-slate-500 tabular-nums">{formatINR(ytdGross)}</span>
                </div>
                {otInc > 0 && (
                  <div className="px-3 py-2 grid grid-cols-[1.6fr_1fr_1fr] gap-2 items-center">
                    <span className="font-medium text-slate-700">Overtime (OT)</span>
                    <span className="text-right font-semibold text-slate-900 tabular-nums">{formatINR(otInc)}</span>
                    <span className="text-right text-slate-500 tabular-nums">{formatINR(ytdOt)}</span>
                  </div>
                )}
                {perfInc > 0 && (
                  <div className="px-3 py-2 grid grid-cols-[1.6fr_1fr_1fr] gap-2 items-center">
                    <span className="font-medium text-slate-700">Performance Incentive</span>
                    <span className="text-right font-semibold text-slate-900 tabular-nums">{formatINR(perfInc)}</span>
                    <span className="text-right text-slate-500 tabular-nums">{formatINR(ytdPerf)}</span>
                  </div>
                )}
                {showVehicle && (
                  <div className="px-3 py-2 grid grid-cols-[1.6fr_1fr_1fr] gap-2 items-center">
                    <span className="font-medium text-slate-700">Driver / Vehicle Allowance</span>
                    <span className="text-right font-semibold text-slate-900 tabular-nums">{formatINR(vehAllow)}</span>
                    <span className="text-right text-slate-500 tabular-nums">{formatINR(ytdVeh)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-slate-100 px-3 py-2 border-t border-slate-200 grid grid-cols-[1.6fr_1fr_1fr] gap-2 text-[11px] font-extrabold text-[#0F172A]">
              <span>Gross Earnings</span>
              <span className="text-right tabular-nums">{formatINR(grossEarned + otInc + perfInc + vehAllow)}</span>
              <span className="text-right tabular-nums text-slate-600">{formatINR(ytdGross + ytdOt + ytdPerf + ytdVeh)}</span>
            </div>
          </div>

          {/* DEDUCTIONS */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 grid grid-cols-[1.6fr_1fr_1fr] gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[#0F172A]">
                <span>Deductions</span>
                <span className="text-right">Amount</span>
                <span className="text-right">YTD</span>
              </div>
              <div className="divide-y divide-slate-100 text-[11px]">
                <div className="px-3 py-2 grid grid-cols-[1.6fr_1fr_1fr] gap-2 items-center">
                  <span className="font-medium text-slate-700">Salary Advance Recovery</span>
                  <span className="text-right font-semibold text-slate-900 tabular-nums">{formatINR(advDed)}</span>
                  <span className="text-right text-slate-500 tabular-nums">{formatINR(ytdAdv)}</span>
                </div>
                <div className="px-3 py-2 grid grid-cols-[1.6fr_1fr_1fr] gap-2 items-center">
                  <span className="font-medium text-slate-700">Expense / Tool Deduction</span>
                  <span className="text-right font-semibold text-slate-900 tabular-nums">{formatINR(expDed)}</span>
                  <span className="text-right text-slate-500 tabular-nums">{formatINR(ytdExp)}</span>
                </div>
                <div className="px-3 py-2 grid grid-cols-[1.6fr_1fr_1fr] gap-2 items-center text-slate-500">
                  <span>LOP Unpaid Days ({item.leaveDays}d)</span>
                  <span className="text-right tabular-nums">In Basic</span>
                  <span className="text-right tabular-nums">—</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-100 px-3 py-2 border-t border-slate-200 grid grid-cols-[1.6fr_1fr_1fr] gap-2 text-[11px] font-extrabold text-[#0F172A]">
              <span>Total Deductions</span>
              <span className="text-right tabular-nums">{formatINR(totalDeductions)}</span>
              <span className="text-right tabular-nums text-slate-600">{formatINR(ytdAdv + ytdExp)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* EXECUTIVE NET PAYABLE BOX & DISBURSEMENT PROOF */}
      <div className="px-6 py-4 space-y-2.5 border-b border-slate-200">
        <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A]">
              TOTAL NET PAYABLE: <span className="text-base font-black ml-1">{formatINR(netPayable)}</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              <strong>Amount in Words:</strong> {numberToIndianWords(netPayable)}
            </div>
          </div>
          <div className="text-[10.5px] text-slate-500 font-medium">
            Net = Gross Earnings − Total Deductions
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-[10.5px] text-slate-700 font-medium">
          <strong>Cash Paid:</strong> {formatINR(paidCash)} &nbsp;|&nbsp; <strong>Bank / ICICI:</strong>{" "}
          {formatINR(paidBank)} &nbsp;|&nbsp; <strong>GPay:</strong> {formatINR(paidGpay)} &nbsp;|&nbsp;{" "}
          <strong>UTR / Ref No.:</strong> <span className="font-mono">{item.paymentRef || "—"}</span> &nbsp;|&nbsp;{" "}
          <strong>Paid Date / Bal C/F:</strong> {item.paidDate ? formatDateDisplay(item.paidDate) : formatINR(balanceCf)}
        </div>
      </div>

      {/* CENTERED COMPUTER-GENERATED FOOTER */}
      <div className="px-6 py-3 bg-white text-center text-[10.5px] text-slate-500 font-medium">
        This is a computer-generated payslip from SR-Books ERP and does not require a physical signature.
      </div>
    </div>
  );
}

export default BrandedPayslip;
