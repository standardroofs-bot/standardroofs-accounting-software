"use client";

import React from "react";

export interface BrandedPayslipItem {
  id: string;
  employeeName: string;
  employeeCode: string;
  category: string;
  company: string;
  totalWorkingDays: number;
  daysPresent: number;
  leaveDays: number;
  baseRate: number;
  grossSalary: number;
  otAndIncentive: number;
  nightDutyAmount: number;
  vehicleAllowance: number;
  lastMonthBalance: number;
  advanceDeduction: number;
  expenseBalanceDeduction: number;
  netSalary: number;
  paidCash: number;
  paidBankOrGpay: number;
  paymentChannel: string;
  carryForwardBalance: number;
  notes: string | null;
  designation?: string | null;
  joiningDate?: string | null;
  location?: string | null;
  state?: string | null;
  mobileNo?: string | null;
  aadhaarNo?: string | null;
  bankName?: string | null;
  accountNo?: string | null;
}

export interface BrandedPayslipProps {
  item: BrandedPayslipItem;
  month: string; // YYYY-MM
  halfPeriod: string; // FULL | FIRST_HALF | SECOND_HALF
  status: string; // DRAFT | APPROVED | PAID
  companyGstin?: string;
  companyAddress?: string;
  companyPhone?: string;
  slipIndex?: number;
}

function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(val || 0));
}

function numberToIndianWords(num: number): string {
  const n = Math.round(Math.abs(num));
  if (n === 0) return "Rupees Zero Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (x: number): string => {
    if (x < 20) return ones[x];
    return `${tens[Math.floor(x / 10)]}${x % 10 ? " " + ones[x % 10] : ""}`;
  };

  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rem = n % 100;

  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ones[hundred]} Hundred`);
  if (rem) parts.push(twoDigits(rem));

  return `${num < 0 ? "Minus " : ""}Rupees ${parts.join(" ")} Only`;
}

export function BrandedPayslip({
  item,
  month,
  halfPeriod,
  status,
  companyGstin = "33AEWFS5187G1ZD",
  companyAddress = "144/A, Vellakkal Medu, Villarasampatti, Nasiyanur (Post), Erode, Tamil Nadu – 638107",
  companyPhone = "+91 8608475767",
  slipIndex = 1,
}: BrandedPayslipProps) {
  const [y, m] = month.split("-");
  const mmYyyy = `${m}/${y}`;
  const periodSub =
    halfPeriod === "FIRST_HALF"
      ? " (1st – 15th)"
      : halfPeriod === "SECOND_HALF"
      ? " (16th – End)"
      : "";

  const isInvi = item.company === "INVI_CREATION";
  const orgTitle = isInvi ? "INVI CREATION" : "STANDARD ROOFS";
  const slipNo = `SR-PAY/${y?.slice(2) || "26"}/${m}/${String(slipIndex).padStart(3, "0")}`;

  const leaveDays =
    item.leaveDays !== undefined && item.leaveDays !== null
      ? item.leaveDays
      : Math.max(0, Math.round((item.totalWorkingDays - item.daysPresent) * 100) / 100);

  const totalOt = Math.round((item.otAndIncentive || 0) + (item.nightDutyAmount || 0));
  const totalAdv = Math.round((item.advanceDeduction || 0) + (item.expenseBalanceDeduction || 0));

  return (
    <div className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 text-slate-900 shadow-sm print:shadow-none print:border-slate-400 print:rounded-none print:break-after-page max-w-[820px] mx-auto font-sans">
      {/* TOP COMPANY LETTERHEAD */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-indigo-600 pb-4 mb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0">
            <img
              src="/images/standard-roofs-logo.png"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.png";
              }}
              alt="Standard Roofs Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight text-slate-900">{orgTitle}</div>
            <div className="text-[11px] text-slate-600 max-w-md leading-snug mt-0.5">
              {companyAddress}
            </div>
            <div className="text-[11px] text-slate-700 font-semibold mt-1 flex flex-wrap gap-3">
              <span>Ph: {companyPhone}</span>
              <span>•</span>
              <span className="font-mono">GSTIN: {companyGstin}</span>
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <div className="inline-block px-3 py-1 rounded-md bg-indigo-600 text-white text-xs font-extrabold tracking-widest uppercase">
            PAY SLIP
          </div>
          <div className="text-[11px] font-mono text-slate-600 mt-1.5 font-semibold">{slipNo}</div>
          <div className="text-xs font-bold text-slate-800 mt-0.5">
            Period: {mmYyyy}
            {periodSub}
          </div>
          <span
            className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              status === "PAID"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      {/* EXACT 4-COLUMN PAYSLIP GRID */}
      <table className="w-full text-xs border-collapse border border-slate-300">
        <tbody>
          <tr className="border-b border-slate-300">
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300 w-[22%]">NAME</td>
            <td className="py-2 px-3 font-extrabold text-slate-900 border-r border-slate-300 w-[28%] uppercase">
              {item.employeeName}
            </td>
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300 w-[24%]">
              JOINING DATE
            </td>
            <td className="py-2 px-3 font-semibold text-slate-800 w-[26%] font-mono">
              {item.joiningDate || "—"}
            </td>
          </tr>

          <tr className="border-b border-slate-300">
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">DESIGNATION</td>
            <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-300 uppercase">
              {item.designation || item.category.replace("_", " ")}
            </td>
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">MONTH/YEAR</td>
            <td className="py-2 px-3 font-bold text-slate-900 font-mono">
              {mmYyyy}
              {periodSub}
            </td>
          </tr>

          <tr className="border-b border-slate-300">
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">LOCATION</td>
            <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-300 uppercase">
              {item.location || "ERODE"}
            </td>
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">STATE</td>
            <td className="py-2 px-3 font-semibold text-slate-800 uppercase">
              {item.state || "TAMIL NADU"}
            </td>
          </tr>

          <tr className="border-b border-slate-300">
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">MOBILE NO.</td>
            <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-300 font-mono">
              {item.mobileNo || "—"}
            </td>
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">AADHAR</td>
            <td className="py-2 px-3 font-semibold text-slate-800 font-mono">
              {item.aadhaarNo || "—"}
            </td>
          </tr>

          <tr className="border-b-2 border-slate-400">
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">BANK</td>
            <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-300 uppercase">
              {item.bankName || "—"}
            </td>
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">ACCOUNT NO.</td>
            <td className="py-2 px-3 font-semibold text-slate-800 font-mono">
              {item.accountNo || "—"}
            </td>
          </tr>

          <tr className="border-b border-slate-300">
            <td className="py-2.5 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">
              GROSS SALARY
            </td>
            <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-300 tabular-nums">
              {formatINR(item.grossSalary)}
              {item.baseRate > 0 && item.baseRate !== item.grossSalary && (
                <span className="text-[10px] text-slate-500 font-normal ml-1.5">
                  (Rate: {formatINR(item.baseRate)})
                </span>
              )}
            </td>
            <td className="py-2.5 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">
              WORKING DAYS
            </td>
            <td className="py-2.5 px-3 font-bold text-slate-900 tabular-nums">
              {item.totalWorkingDays} DAYS
            </td>
          </tr>

          <tr className="border-b border-slate-300">
            <td className="py-2.5 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">ADVANCE</td>
            <td className="py-2.5 px-3 font-bold text-rose-700 border-r border-slate-300 tabular-nums">
              {formatINR(totalAdv)}
            </td>
            <td className="py-2.5 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">LEAVE</td>
            <td className="py-2.5 px-3 font-bold text-slate-800 tabular-nums">{leaveDays} DAYS</td>
          </tr>

          <tr className="border-b border-slate-300">
            <td className="py-2.5 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">OT</td>
            <td className="py-2.5 px-3 font-bold text-emerald-700 border-r border-slate-300 tabular-nums">
              {formatINR(totalOt)}
              {item.lastMonthBalance !== 0 && (
                <span className="text-[10px] text-slate-500 font-normal ml-1.5">
                  (+Prev: {formatINR(item.lastMonthBalance)})
                </span>
              )}
            </td>
            <td className="py-2.5 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">
              NO. OF DAYS PRESENT
            </td>
            <td className="py-2.5 px-3 font-bold text-slate-900 tabular-nums">{item.daysPresent} DAYS</td>
          </tr>

          <tr>
            <td className="py-3 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">VEHICLE</td>
            <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-300 tabular-nums">
              {formatINR(item.vehicleAllowance || 0)}
            </td>
            <td className="py-3 px-3 font-extrabold bg-indigo-50 text-indigo-800 border-r border-slate-300">
              NET SALARY
            </td>
            <td className="py-3 px-3 font-extrabold text-base text-indigo-900 bg-indigo-50 tabular-nums">
              {formatINR(item.netSalary)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* FOOTER: WORDS + PAYMENT BREAKDOWN + SIGNATURES */}
      <div className="mt-4 space-y-3 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Amount in Words</span>
            <span className="font-bold text-slate-900">{numberToIndianWords(item.netSalary)}</span>
          </div>
          <div className="text-left sm:text-right font-mono text-[11px] text-slate-700">
            Cash: <strong>{formatINR(item.paidCash)}</strong> | Bank/GPay:{" "}
            <strong>{formatINR(item.paidBankOrGpay)}</strong> | Balance C/F:{" "}
            <strong>{formatINR(item.carryForwardBalance)}</strong>
          </div>
        </div>

        {item.notes && (
          <div className="text-[11px] text-slate-600 px-1">
            <strong>Remarks:</strong> {item.notes}
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 pt-8">
          <div className="border-t border-slate-300 pt-2 text-center text-[11px] font-semibold text-slate-600">
            Employee Signature ({item.employeeName})
          </div>
          <div className="border-t border-slate-300 pt-2 text-center text-[11px] font-bold text-slate-800">
            Authorized Signatory ({orgTitle})
          </div>
        </div>
      </div>
    </div>
  );
}
