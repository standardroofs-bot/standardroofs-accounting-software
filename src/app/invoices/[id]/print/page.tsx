import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatINR, numberToWordsINR } from "@/lib/decimal";
import {
  COMPANY_NAME,
  COMPANY_ADDRESS,
  COMPANY_GSTIN,
  COMPANY_PHONE,
  COMPANY_EMAIL,
  COMPANY_BANK_NAME,
  COMPANY_BANK_BRANCH,
  COMPANY_BANK_AC_NO,
  COMPANY_BANK_IFSC,
} from "@/lib/gst";
import PrintButton from "@/components/common/PrintButton";

export const dynamic = "force-dynamic";

function formatDateDMY(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      project: true,
      items: true,
    },
  });

  if (!invoice) notFound();

  const customerName = invoice.customer?.name || "Customer";
  const billingAddr = invoice.customer?.billingAddress || "Erode, Tamil Nadu";
  const shippingAddr =
    invoice.shippingAddress ||
    invoice.customer?.shippingAddress ||
    invoice.customer?.siteAddress ||
    billingAddr;
  const customerGstin = invoice.customer?.gstNumber;
  const customerState = invoice.customer?.state || "Tamil Nadu";
  const customerStateCode = invoice.customer?.stateCode || "33";

  const subTotalNum = Number(invoice.subTotal);
  const cgstNum = Number(invoice.cgstTotal);
  const sgstNum = Number(invoice.sgstTotal);
  const igstNum = Number(invoice.igstTotal);
  const adjNum = Number(invoice.adjustment || 0);
  const totalNum = Number(invoice.totalAmount);
  const balanceDueNum = Number(invoice.balanceDue);

  return (
    <div className="bg-slate-100 min-h-screen py-8 text-slate-900 print:bg-white print:py-0 print:m-0 font-sans">
      {/* Print Controls (Hidden on Print) */}
      <PrintButton backUrl={`/invoices/${invoice.id}`} title="Print / Save as PDF (A4)" />

      {/* A4 Document Outer Border Box */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white border border-[#4b5563] shadow-md print:border print:border-[#4b5563] print:shadow-none print:m-0 print:w-full print:max-w-none text-[11px] font-sans relative overflow-hidden">
        {/* Zoho-style Diagonal Corner Ribbon (Hidden on print) */}
        <div className="print:hidden absolute top-0 left-0 w-36 h-36 overflow-hidden pointer-events-auto group z-20">
          <div
            className={`absolute top-7 left-[-35px] w-40 -rotate-45 text-center py-1 text-[11px] font-bold tracking-wider shadow-sm select-none ${
              invoice.status === "PAID"
                ? "bg-emerald-600 text-white"
                : invoice.status === "VOID"
                ? "bg-rose-600 text-white"
                : invoice.status === "UNPAID"
                ? "bg-amber-600 text-white"
                : "bg-[#6c757d] text-white"
            }`}
          >
            {invoice.status === "DRAFT" ? "Draft" : invoice.status}
          </div>
          {invoice.status === "DRAFT" && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute top-12 left-6 z-30 bg-[#1e293b] text-white text-[11px] p-2.5 rounded shadow-2xl w-64 leading-snug pointer-events-none">
              A Draft status indicates that the invoice can undergo further modifications and its amount is yet to reflect in your sales figures.
            </div>
          )}
        </div>

        {/* 1. Header Block */}
        <div className="p-6 flex justify-between items-center">
          {/* Logo & Company Profile */}
          <div className="flex items-start gap-4">
            <img
              src="/images/standard-roofs-logo.png"
              alt="Standard Roofs Logo"
              className="h-16 w-auto object-contain shrink-0"
            />
            <div className="text-[11px] leading-tight text-slate-800 space-y-0.5">
              <h1 className="font-bold text-[13px] text-slate-950">Standard Roofs</h1>
              <p>144/A, Vellakkal Medu,</p>
              <p>Villarasampatti, Nasiyanur(Post),</p>
              <p>Erode, Tamil Nadu-638107.</p>
              <p className="font-semibold text-slate-900">GSTIN/UIN: {COMPANY_GSTIN}</p>
              <p>Phone No : 8608475767</p>
              <p>Email : {COMPANY_EMAIL}</p>
            </div>
          </div>

          {/* Large TAX INVOICE Title (Zoho Books Style) */}
          <div className="text-right pr-2">
            <h2 className="text-2xl font-normal tracking-wide text-slate-900 uppercase">
              TAX INVOICE
            </h2>
          </div>
        </div>

        {/* 2. Metadata Split Row */}
        <div className="grid grid-cols-2 border-t border-b border-[#6b7280] text-[11px]">
          <div className="p-3 border-r border-[#6b7280] space-y-1">
            <div className="flex">
              <span className="w-24 text-slate-700">Invoice No.</span>
              <span className="mr-2 text-slate-700">:</span>
              <strong className="font-bold text-slate-950">
                {invoice.sequenceNumber || invoice.invoiceNumber.replace(/^.*\/0*/, "")}
              </strong>
            </div>
            <div className="flex">
              <span className="w-24 text-slate-700">Invoice Date</span>
              <span className="mr-2 text-slate-700">:</span>
              <span className="text-slate-900">{formatDateDMY(invoice.date)}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-slate-700">Terms</span>
              <span className="mr-2 text-slate-700">:</span>
              <span className="text-slate-900">{invoice.terms || "Due on Receipt"}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-slate-700">Due Date</span>
              <span className="mr-2 text-slate-700">:</span>
              <span className="text-slate-900">
                {formatDateDMY(invoice.dueDate || invoice.date)}
              </span>
            </div>
          </div>

          <div className="p-3 space-y-1">
            <div className="flex">
              <span className="w-28 text-slate-700">Place Of Supply</span>
              <span className="mr-2 text-slate-700">:</span>
              <strong className="font-semibold text-slate-950">
                {invoice.placeOfSupply || "Tamil Nadu"} ({invoice.placeOfSupplyStateCode || "33"})
              </strong>
            </div>
          </div>
        </div>

        {/* 3. Bill To / Ship To Split Row */}
        <div className="grid grid-cols-2 border-b border-[#6b7280] text-[11px]">
          {/* Bill To */}
          <div className="p-3 border-r border-[#6b7280] space-y-1">
            <span className="font-bold text-slate-800 block text-[11px]">Bill To</span>
            <p className="font-semibold text-[#0066cc] text-[12px]">{customerName}</p>
            <p className="text-slate-700 text-[11px] whitespace-pre-line leading-relaxed">
              {billingAddr}
            </p>
            {customerGstin && (
              <p className="text-[11px] font-medium text-slate-800 pt-0.5">
                GSTIN: {customerGstin}
              </p>
            )}
          </div>

          {/* Ship To */}
          <div className="p-3 space-y-1">
            <span className="font-bold text-slate-800 block text-[11px]">Ship To</span>
            <p className="text-slate-700 text-[11px] whitespace-pre-line leading-relaxed">
              {shippingAddr}
            </p>
          </div>
        </div>

        {/* 4. Items Table (Exact Zoho Books Style) */}
        <table className="w-full text-left border-collapse border-b border-[#6b7280] text-[11px]">
          <thead>
            <tr className="border-b border-[#6b7280] text-[11px] font-bold text-slate-800 bg-white">
              <th className="py-2 px-2.5 w-12 text-center border-r border-[#6b7280]">S.no</th>
              <th className="py-2 px-3 border-r border-[#6b7280]">Item & Description</th>
              <th className="py-2 px-2.5 w-24 text-center border-r border-[#6b7280]">HSN/SAC</th>
              <th className="py-2 px-2.5 w-20 text-right border-r border-[#6b7280]">Qty</th>
              <th className="py-2 px-2.5 w-24 text-right border-r border-[#6b7280]">Rate</th>
              <th className="py-2 px-3 w-28 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoice.items.map((item, idx) => {
              const itemTaxable = Number(
                item.taxableAmount ||
                  Number(item.quantity) * Number(item.unitPrice) - Number(item.discount || 0)
              );
              return (
                <tr key={item.id} className="align-top">
                  <td className="py-2.5 px-2.5 text-center text-slate-700 border-r border-[#6b7280]">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 border-r border-[#6b7280]">
                    <div className="font-semibold text-slate-900 leading-snug">{item.description}</div>
                    {item.subDescription && (
                      <div className="text-[10px] text-slate-500 mt-0.5 font-normal">
                        {item.subDescription}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 text-center text-slate-800 border-r border-[#6b7280]">
                    {item.hsnSacCode}
                  </td>
                  <td className="py-2.5 px-2.5 text-right border-r border-[#6b7280]">
                    <div className="text-slate-900">{Number(item.quantity).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500 lowercase">{item.unit}</div>
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-slate-900 border-r border-[#6b7280]">
                    {Number(item.unitPrice).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-950">
                    {itemTaxable.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 5. Footer Split Grid: Words/Bank/Terms vs Totals & Signature */}
        <div className="grid grid-cols-12 text-[11px]">
          {/* Left Column (col-span-7) */}
          <div className="col-span-7 p-4 border-r border-[#6b7280] space-y-4">
            {/* Total In Words */}
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-700 text-[11px] block">Total In Words</span>
              <p className="font-bold italic text-slate-950 text-[11px] leading-relaxed">
                Indian Rupee {numberToWordsINR(invoice.totalAmount)}
              </p>
            </div>

            {/* Bank Details */}
            <div className="space-y-1 text-[11px]">
              <span className="font-bold text-slate-950 text-[11px] block">Bank Details</span>
              <div className="space-y-0.5 text-slate-800">
                <p>Bank Name : {COMPANY_BANK_NAME}</p>
                <p>A/C No : {COMPANY_BANK_AC_NO}</p>
                <p>Branch :{COMPANY_BANK_BRANCH}</p>
                <p>IFSC Code : {COMPANY_BANK_IFSC}</p>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="space-y-1 text-[11px] text-slate-800">
              <span className="font-bold text-slate-950 text-[11px] block">Terms & Conditions</span>
              <p className="font-semibold">E.& O.E.</p>
              <p>1. Goods once sold will not be taken back.</p>
              <p>2. Interest @ 18% p.a. will be charged if the payment is not made with in the stipulated time.</p>
              <p>3. Subject to 'Tamilnadu' Jurisdiction only.</p>
            </div>
          </div>

          {/* Right Column (col-span-5) */}
          <div className="col-span-5 flex flex-col justify-between">
            {/* Totals Table */}
            <div className="p-3 space-y-1.5 text-[11px] border-b border-[#6b7280]">
              <div className="flex justify-between py-0.5 text-slate-700">
                <span>Sub Total</span>
                <span className="text-slate-900">
                  {subTotalNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-0.5 text-slate-700">
                <span>Total Taxable Amount</span>
                <span className="text-slate-900">
                  {subTotalNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {invoice.isInterState ? (
                <div className="flex justify-between py-0.5 text-slate-700">
                  <span>IGST18 (18%)</span>
                  <span className="text-slate-900">
                    {igstNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between py-0.5 text-slate-700">
                    <span>CGST9 (9%)</span>
                    <span className="text-slate-900">
                      {cgstNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-700">
                    <span>SGST9 (9%)</span>
                    <span className="text-slate-900">
                      {sgstNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}

              {/* Adjustment Row */}
              <div className="flex justify-between py-0.5 text-slate-700">
                <span>Adjustment</span>
                <span className="text-slate-900">
                  {adjNum < 0
                    ? `(-) ${Math.abs(adjNum).toFixed(2)}`
                    : adjNum > 0
                    ? `(+) ${adjNum.toFixed(2)}`
                    : "0.00"}
                </span>
              </div>

              {/* Total ₹ */}
              <div className="flex justify-between py-1 text-[13px] font-bold border-t border-gray-300 text-slate-950">
                <span>Total</span>
                <span>
                  ₹{totalNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Balance Due */}
              <div className="flex justify-between py-1 text-[12px] font-bold text-slate-950">
                <span>Balance Due</span>
                <span>
                  ₹{balanceDueNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Signature Box */}
            <div className="p-4 text-center text-[11px] flex flex-col justify-between min-h-[140px]">
              <span className="font-semibold text-slate-900 block">Sivakumar D (Manager)</span>
              <div className="h-14"></div>
              <span className="font-medium text-slate-600 block text-[10px]">Authorized Signature</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
