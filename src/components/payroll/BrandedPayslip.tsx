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
  paidGpay?: number;
  gpayWallet?: string | null;
  paymentChannel: string;
  paymentStatus?: string;
  paymentReason?: string | null;
  performanceScore?: number | null;
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

function formatPayPeriodBanner(month: string, halfPeriod: string): string {
  const [y, m] = month.split("-");
  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ];
  const mName = monthNames[Number(m) - 1] || m;
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sName = shortMonths[Number(m) - 1] || m;

  if (halfPeriod === "FIRST_HALF") return `${mName} ${y} (01-${sName} to 15-${sName})`;
  if (halfPeriod === "SECOND_HALF") return `${mName} ${y} (16-${sName} to End)`;
  return `${mName} ${y} (Full Month)`;
}

export function BrandedPayslip({
  item,
  month,
  halfPeriod,
  status,
  companyAddress = "144/A, Vellakkal Medu, Villarasampatti, Nasiyanur (Post), Erode, Tamil Nadu – 638107",
  companyPhone = "+91 8608475767",
  slipIndex = 1,
}: BrandedPayslipProps) {
  const [y, m] = month.split("-");
  const payPeriodBanner = formatPayPeriodBanner(month, halfPeriod);

  const isInvi = item.company === "INVI_CREATION";
  const orgTitle = isInvi ? "INVI CREATION" : "STANDARD ROOFS";
  const deptLabel =
    item.category === "OFFICE"
      ? isInvi
        ? "Invi Digital Hub"
        : "Headquarters Office"
      : item.category === "TAMIL_LABOUR"
      ? "Site Operations (Tamil)"
      : "Site Crew (Hindi)";
  const slipNo = `SR-PAY/${y?.slice(2) || "26"}/${m}/${String(slipIndex).padStart(3, "0")}`;

  const leaveDays =
    item.leaveDays !== undefined && item.leaveDays !== null
      ? item.leaveDays
      : Math.max(0, Math.round((item.totalWorkingDays - item.daysPresent) * 100) / 100);

  const totalIncentive = Math.round((item.otAndIncentive || 0) + (item.nightDutyAmount || 0));
  const isDriverRole = (item.designation || "").toLowerCase().includes("driver");
  const showVehicleRow = isDriverRole || Number(item.vehicleAllowance || 0) > 0;
  const gpayAmt = Number(item.paidGpay || 0);
  const payStatus = item.paymentStatus || (item.carryForwardBalance <= 0 && (item.paidCash + item.paidBankOrGpay + gpayAmt) > 0 ? "PAID" : status);

  return (
    <div className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 text-slate-900 shadow-sm print:shadow-none print:border-slate-400 print:rounded-none print:break-after-page max-w-[820px] mx-auto font-sans">
      {/* CORPORATE LETTERHEAD (NO GSTIN ON EMPLOYEE PAYSLIPS) */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-[#4F46E5] pb-4 mb-4">
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
            <div className="text-[11px] text-slate-700 font-semibold mt-1">
              Ph: {companyPhone}
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <div className="inline-block px-3 py-1 rounded-md bg-[#4F46E5] text-white text-xs font-extrabold tracking-widest uppercase">
            PAY SLIP
          </div>
          <div className="text-[11px] font-mono text-slate-600 mt-1.5 font-semibold">{slipNo}</div>
          <span
            className={`inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              payStatus === "PAID"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : payStatus === "PARTIAL"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : payStatus === "HOLD"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {payStatus}
          </span>
        </div>
      </div>

      {/* PROMINENT PAY PERIOD BANNER */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
          Pay Period
        </span>
        <span className="text-xs font-extrabold tracking-wide text-slate-900">
          {payPeriodBanner}
        </span>
      </div>

      {/* EMPLOYEE & STATUTORY DETAILS GRID */}
      <table className="w-full text-xs border-collapse border border-slate-300 mb-4">
        <tbody>
          <tr className="border-b border-slate-300">
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300 w-[22%]">EMPLOYEE NAME</td>
            <td className="py-2 px-3 font-extrabold text-slate-900 border-r border-slate-300 w-[28%] uppercase">{item.employeeName}</td>
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300 w-[22%]">EMPLOYEE ID</td>
            <td className="py-2 px-3 font-bold text-slate-800 w-[28%] font-mono">{item.employeeCode}</td>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">DESIGNATION</td>
            <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-300 uppercase">{item.designation || item.category}</td>
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">DEPARTMENT</td>
            <td className="py-2 px-3 font-semibold text-slate-800">{deptLabel}</td>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">JOINING DATE</td>
            <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-300 font-mono">{item.joiningDate || "—"}</td>
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">LOCATION</td>
            <td className="py-2 px-3 font-semibold text-slate-800 uppercase">{item.location || "Erode"}, {item.state || "Tamil Nadu"}</td>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">MOBILE NUMBER</td>
            <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-300 font-mono">{item.mobileNo || "—"}</td>
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">AADHAAR ID</td>
            <td className="py-2 px-3 font-semibold text-slate-800 font-mono">{item.aadhaarNo || "—"}</td>
          </tr>
          <tr>
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">BANK NAME</td>
            <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-300 uppercase">{item.bankName || "—"}</td>
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">ACCOUNT NO.</td>
            <td className="py-2 px-3 font-semibold text-slate-800 font-mono">{item.accountNo || "—"}</td>
          </tr>
        </tbody>
      </table>

      {/* ATTENDANCE & EARNINGS / DEDUCTIONS BREAKDOWN */}
      <table className="w-full text-xs border-collapse border border-slate-300">
        <tbody>
          <tr className="border-b border-slate-300 bg-slate-100">
            <th className="py-2 px-3 text-left font-bold text-slate-700 border-r border-slate-300" colSpan={2}>EARNINGS &amp; DEDUCTIONS</th>
            <th className="py-2 px-3 text-left font-bold text-slate-700" colSpan={2}>ATTENDANCE SUMMARY</th>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300 w-[26%]">BASIC / EARNED GROSS</td>
            <td className="py-2 px-3 font-extrabold text-slate-900 border-r border-slate-300 w-[24%] tabular-nums">
              {formatINR(item.grossSalary)}{" "}
              <span className="text-[10px] font-normal text-slate-500">(Rate: {formatINR(item.baseRate)})</span>
            </td>
            <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300 w-[24%]">WORKING DAYS</td>
            <td className="py-2 px-3 font-bold text-slate-800 w-[26%] tabular-nums">{item.totalWorkingDays} DAYS</td>
          </tr>
          {totalIncentive > 0 && (
            <tr className="border-b border-slate-300">
              <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">PERFORMANCE &amp; SPECIAL INCENTIVE</td>
              <td className="py-2 px-3 font-bold text-emerald-700 border-r border-slate-300 tabular-nums">
                +{formatINR(totalIncentive)}
                {item.performanceScore ? <span className="text-[10px] text-indigo-600 ml-1.5">(KPI {item.performanceScore}/100)</span> : null}
              </td>
              <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">DAYS PRESENT</td>
              <td className="py-2 px-3 font-bold text-emerald-700 tabular-nums">{item.daysPresent} DAYS</td>
            </tr>
          )}
          {totalIncentive === 0 && (
            <tr className="border-b border-slate-300">
              <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">ADVANCE DEDUCTION</td>
              <td className="py-2 px-3 font-bold text-rose-600 border-r border-slate-300 tabular-nums">
                {item.advanceDeduction > 0 ? `-${formatINR(item.advanceDeduction)}` : "₹0"}
              </td>
              <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">DAYS PRESENT</td>
              <td className="py-2 px-3 font-bold text-emerald-700 tabular-nums">{item.daysPresent} DAYS</td>
            </tr>
          )}
          {totalIncentive > 0 && (
            <tr className="border-b border-slate-300">
              <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">ADVANCE DEDUCTION</td>
              <td className="py-2 px-3 font-bold text-rose-600 border-r border-slate-300 tabular-nums">
                {item.advanceDeduction > 0 ? `-${formatINR(item.advanceDeduction)}` : "₹0"}
              </td>
              <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">APPROVED LEAVE DAYS</td>
              <td className="py-2 px-3 font-bold text-slate-800 tabular-nums">{leaveDays} DAYS</td>
            </tr>
          )}
          {totalIncentive === 0 && (
            <tr className="border-b border-slate-300">
              <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">EXPENSE BAL DEDUCTION</td>
              <td className="py-2 px-3 font-bold text-rose-600 border-r border-slate-300 tabular-nums">
                {item.expenseBalanceDeduction > 0 ? `-${formatINR(item.expenseBalanceDeduction)}` : "₹0"}
              </td>
              <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">APPROVED LEAVE DAYS</td>
              <td className="py-2 px-3 font-bold text-slate-800 tabular-nums">{leaveDays} DAYS</td>
            </tr>
          )}
          {showVehicleRow && (
            <tr className="border-b border-slate-300">
              <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">VEHICLE ALLOWANCE</td>
              <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-300 tabular-nums">
                {formatINR(item.vehicleAllowance || 0)}
              </td>
              <td className="py-2 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">PREVIOUS BAL C/F</td>
              <td className="py-2 px-3 font-semibold text-slate-800 tabular-nums">{formatINR(item.lastMonthBalance)}</td>
            </tr>
          )}
          <tr>
            <td className="py-2.5 px-3 font-bold bg-slate-50 text-slate-600 border-r border-slate-300">PAYMENT STATUS / NOTE</td>
            <td className="py-2.5 px-3 font-medium text-slate-700 border-r border-slate-300">
              {item.paymentReason || item.notes || "Standard Payroll Settlement"}
            </td>
            <td className="py-2.5 px-3 font-extrabold bg-indigo-50 text-indigo-800 border-r border-slate-300">NET PAYABLE SALARY</td>
            <td className="py-2.5 px-3 font-black text-base text-[#4F46E5] bg-indigo-50 tabular-nums">
              {formatINR(item.netSalary)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* AMOUNT IN WORDS & 3-WAY DISBURSEMENT SPLIT */}
      <div className="mt-4 p-3.5 bg-slate-50 border border-slate-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Amount in Words</span>
          <span className="font-bold text-slate-900">{numberToIndianWords(item.netSalary)}</span>
        </div>
        <div className="text-left sm:text-right font-mono text-[11px] text-slate-700">
          Cash: <strong>{formatINR(item.paidCash)}</strong> | Bank Account: <strong>{formatINR(item.paidBankOrGpay)}</strong> | GPay: <strong>{formatINR(gpayAmt)}</strong> | Balance C/F: <strong>{formatINR(item.carryForwardBalance)}</strong>
        </div>
      </div>

      {/* SYSTEM-GENERATED FOOTER NOTICE */}
      <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[11px] text-slate-500 italic">
        This is a system-generated payslip from SR-Books ERP and does not require a physical signature or company stamp.
      </div>
    </div>
  );
}
