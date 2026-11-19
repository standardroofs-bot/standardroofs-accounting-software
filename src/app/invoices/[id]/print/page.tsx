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

function formatAddressLines(addr: string | null | undefined): string[] {
  if (!addr) return ["Erode, Tamil Nadu."];
  if (addr.includes("\n")) {
    return addr.split("\n").map((l) => l.trim()).filter(Boolean);
  }
  const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return [addr];

  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    if (current && (current.length + parts[i].length > 38)) {
      lines.push(current + ",");
      current = parts[i];
    } else {
      current = current ? `${current}, ${parts[i]}` : parts[i];
    }
    if (isLast && current) {
      lines.push(current.endsWith(".") ? current : current + ".");
    }
  }
  return lines;
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

  const billingLines = formatAddressLines(billingAddr);
  const shippingLines = formatAddressLines(shippingAddr);

  const subTotalNum = Number(invoice.subTotal);
  const cgstNum = Number(invoice.cgstTotal);
  const sgstNum = Number(invoice.sgstTotal);
  const igstNum = Number(invoice.igstTotal);
  const adjNum = Number(invoice.adjustment || 0);
  const totalNum = Number(invoice.totalAmount);
  const balanceDueNum = Number(invoice.balanceDue);

  const isDraft = invoice.status === "DRAFT";

  return (
    <div className="bg-[#f1f5f9] min-h-screen py-8 text-[#111827] print:bg-white print:py-0 print:m-0">
      {/* Print Controls (Hidden on Print) */}
      <PrintButton backUrl={`/invoices/${invoice.id}`} title="Print / Save as PDF (A4)" />

      {/* A4 Document Outer Border Box (100% Zoho Books Closed Frame) */}
      <div
        className="max-w-[210mm] mx-auto bg-white border border-[#8c8c8c] shadow-lg print:border print:border-[#8c8c8c] print:shadow-none print:m-0 print:w-full print:max-w-none relative overflow-hidden"
        style={{
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
          color: "#111827",
        }}
      >
        {/* Zoho Books Diagonal Corner Ribbon: ONLY for DRAFT status */}
        {isDraft && (
          <div className="print:hidden absolute top-0 left-0 w-32 h-32 overflow-hidden pointer-events-auto group z-20">
            <div className="absolute top-6 left-[-35px] w-36 -rotate-45 text-center py-1 text-[11px] font-bold tracking-wider shadow-sm select-none bg-[#737373] text-white">
              Draft
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute top-12 left-4 z-30 bg-[#1e293b] text-white text-[11px] p-2.5 rounded shadow-2xl w-60 leading-snug pointer-events-none">
              A Draft status indicates that the invoice can undergo further modifications and its amount is yet to reflect in your sales figures.
            </div>
          </div>
        )}

        {/* 1. Header Block: Bold Logo & Bottom-Right Aligned TAX INVOICE */}
        <div className="px-7 py-6 flex justify-between items-stretch">
          {/* Logo & Standard Roofs Organization Profile */}
          <div className="flex items-start gap-4">
            <img
              src="/images/standard-roofs-logo.png"
              alt="Standard Roofs Logo"
              className="w-[250px] h-auto object-contain shrink-0"
            />
            <div className="text-[11px] leading-[1.35] text-[#222222] space-y-0.5 pt-0.5">
              <h1 className="font-bold text-[13px] text-[#111111]">Standard Roofs</h1>
              <p>144/A, Vellakkal Medu,</p>
              <p>Villarasampatti, Nasiyanur(Post),</p>
              <p>Erode, Tamil Nadu-638107.</p>
              <p className="font-semibold text-[#111111]">GSTIN/UIN: {COMPANY_GSTIN}</p>
              <p>Phone No : 8608475767</p>
              <p>Email : {COMPANY_EMAIL}</p>
            </div>
          </div>

          {/* Right: TAX INVOICE Title aligned to bottom-right */}
          <div className="flex flex-col justify-end items-end pb-1 pr-2">
            <h2 className="text-[26px] font-normal tracking-[0.05em] text-[#222222] uppercase leading-none">
              TAX INVOICE
            </h2>
          </div>
        </div>

        {/* 2. Metadata Split Row */}
        <div className="grid grid-cols-12 border-t border-b border-[#8c8c8c] text-[11px]">
          <div className="col-span-6 p-3 border-r border-[#8c8c8c] space-y-1">
            <div className="flex items-center">
              <span className="w-24 text-[#444444]">Invoice No.</span>
              <span className="w-4 text-[#444444] text-center">:</span>
              <strong className="font-bold text-[#111111]">
                {invoice.sequenceNumber || invoice.invoiceNumber.replace(/^.*\/0*/, "")}
              </strong>
            </div>
            <div className="flex items-center">
              <span className="w-24 text-[#444444]">Invoice Date</span>
              <span className="w-4 text-[#444444] text-center">:</span>
              <span className="text-[#111111]">{formatDateDMY(invoice.date)}</span>
            </div>
            <div className="flex items-center">
              <span className="w-24 text-[#444444]">Terms</span>
              <span className="w-4 text-[#444444] text-center">:</span>
              <span className="text-[#111111]">{invoice.terms || "Due on Receipt"}</span>
            </div>
            <div className="flex items-center">
              <span className="w-24 text-[#444444]">Due Date</span>
              <span className="w-4 text-[#444444] text-center">:</span>
              <span className="text-[#111111]">
                {formatDateDMY(invoice.dueDate || invoice.date)}
              </span>
            </div>
          </div>

          <div className="col-span-6 p-3 space-y-1">
            <div className="flex items-center">
              <span className="w-28 text-[#444444]">Place Of Supply</span>
              <span className="w-4 text-[#444444] text-center">:</span>
              <strong className="font-semibold text-[#111111]">
                {invoice.placeOfSupply || "Tamil Nadu"} ({invoice.placeOfSupplyStateCode || "33"})
              </strong>
            </div>
          </div>
        </div>

        {/* 3. Bill To / Ship To Section with Shaded Header Bar */}
        {/* Shaded Header Bar (bg-[#f3f4f6]) */}
        <div className="grid grid-cols-12 border-b border-[#8c8c8c] bg-[#f3f4f6] text-[11px] font-bold text-[#333333]">
          <div className="col-span-6 px-3 py-1.5 border-r border-[#8c8c8c]">
            Bill To
          </div>
          <div className="col-span-6 px-3 py-1.5">
            Ship To
          </div>
        </div>

        {/* Address Content Rows */}
        <div className="grid grid-cols-12 border-b border-[#8c8c8c] text-[11px]">
          {/* Bill To Content */}
          <div className="col-span-6 p-3 border-r border-[#8c8c8c] space-y-1">
            <p className="font-semibold text-[#0066cc] text-[12px]">{customerName}</p>
            <div className="text-[#222222] text-[11px] leading-[1.4]">
              {billingLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            {customerGstin && (
              <p className="text-[11px] font-medium text-[#222222] pt-0.5">
                GSTIN: {customerGstin}
              </p>
            )}
          </div>

          {/* Ship To Content */}
          <div className="col-span-6 p-3 space-y-1">
            <div className="text-[#222222] text-[11px] leading-[1.4]">
              {shippingLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Items Table with Shaded thead */}
        <table className="w-full text-left border-collapse border-b border-[#8c8c8c] text-[11px]">
          <thead>
            <tr className="border-b border-[#8c8c8c] text-[11px] font-bold text-[#222222] bg-[#f3f4f6]">
              <th className="py-2 px-2.5 w-12 text-center border-r border-[#8c8c8c]">S.no</th>
              <th className="py-2 px-3 border-r border-[#8c8c8c]">Item & Description</th>
              <th className="py-2 px-2.5 w-24 text-center border-r border-[#8c8c8c]">HSN/SAC</th>
              <th className="py-2 px-2.5 w-20 text-right border-r border-[#8c8c8c]">Qty</th>
              <th className="py-2 px-2.5 w-24 text-right border-r border-[#8c8c8c]">Rate</th>
              <th className="py-2 px-3 w-28 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {invoice.items.map((item, idx) => {
              const itemTaxable = Number(
                item.taxableAmount ||
                  Number(item.quantity) * Number(item.unitPrice) - Number(item.discount || 0)
              );
              return (
                <tr key={item.id} className="align-top">
                  <td className="py-2.5 px-2.5 text-center text-[#444444] border-r border-[#8c8c8c]">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 border-r border-[#8c8c8c]">
                    <div className="font-normal text-[#111827] leading-snug">{item.description}</div>
                    {item.subDescription && (
                      <div className="text-[10px] text-[#666666] mt-0.5 font-normal">
                        {item.subDescription}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 text-center text-[#222222] border-r border-[#8c8c8c]">
                    {item.hsnSacCode}
                  </td>
                  <td className="py-2.5 px-2.5 text-right border-r border-[#8c8c8c]">
                    <div className="text-[#111111]">{Number(item.quantity).toFixed(2)}</div>
                    <div className="text-[10px] text-[#666666] lowercase">{item.unit}</div>
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-[#111111] border-r border-[#8c8c8c]">
                    {Number(item.unitPrice).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-[#111111]">
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

        {/* 5. Footer Split Grid: Words/Bank/Terms vs Totals & Signature with Closed Bottom Frame */}
        <div className="grid grid-cols-12 text-[11px]">
          {/* Left Column (col-span-7) */}
          <div className="col-span-7 p-4 border-r border-[#8c8c8c] space-y-4">
            {/* Total In Words */}
            <div className="space-y-0.5">
              <span className="font-semibold text-[#444444] text-[11px] block">Total In Words</span>
              <p className="font-bold italic text-[#111111] text-[11px] leading-relaxed">
                Indian Rupee {numberToWordsINR(invoice.totalAmount)}
              </p>
            </div>

            {/* Bank Details */}
            <div className="space-y-1 text-[11px]">
              <span className="font-bold text-[#111111] text-[11px] block">Bank Details</span>
              <div className="space-y-0.5 text-[#222222]">
                <p>Bank Name : {COMPANY_BANK_NAME}</p>
                <p>A/C No : {COMPANY_BANK_AC_NO}</p>
                <p>Branch :Erode, Tamil Nadu</p>
                <p>IFSC Code : {COMPANY_BANK_IFSC}</p>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="space-y-1 text-[11px] text-[#222222]">
              <span className="font-bold text-[#111111] text-[11px] block">Terms & Conditions</span>
              <p className="font-semibold">E.& O.E.</p>
              <p>1. Goods once sold will not be taken back.</p>
              <p>2. Interest @ 18% p.a. will be charged if the payment is not made with in the stipulated time.</p>
              <p>3. Subject to 'Tamilnadu' Jurisdiction only.</p>
            </div>
          </div>

          {/* Right Column (col-span-5) */}
          <div className="col-span-5 flex flex-col justify-between">
            {/* Totals Table */}
            <div className="p-3 space-y-1.5 text-[11px] border-b border-[#8c8c8c]">
              <div className="flex justify-end items-center py-0.5 text-[#444444]">
                <span className="text-right pr-6">Sub Total</span>
                <span className="text-right text-[#111111] min-w-[90px]">
                  {subTotalNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-end items-center py-0.5 text-[#444444]">
                <span className="text-right pr-6">Total Taxable Amount</span>
                <span className="text-right text-[#111111] min-w-[90px]">
                  {subTotalNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {invoice.isInterState ? (
                <div className="flex justify-end items-center py-0.5 text-[#444444]">
                  <span className="text-right pr-6">IGST18 (18%)</span>
                  <span className="text-right text-[#111111] min-w-[90px]">
                    {igstNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-end items-center py-0.5 text-[#444444]">
                    <span className="text-right pr-6">CGST9 (9%)</span>
                    <span className="text-right text-[#111111] min-w-[90px]">
                      {cgstNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-end items-center py-0.5 text-[#444444]">
                    <span className="text-right pr-6">SGST9 (9%)</span>
                    <span className="text-right text-[#111111] min-w-[90px]">
                      {sgstNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}

              {/* Adjustment Row */}
              <div className="flex justify-end items-center py-0.5 text-[#444444]">
                <span className="text-right pr-6">Adjustment</span>
                <span className="text-right text-[#111111] min-w-[90px]">
                  {adjNum < 0
                    ? `(-) ${Math.abs(adjNum).toFixed(2)}`
                    : adjNum > 0
                    ? `(+) ${adjNum.toFixed(2)}`
                    : "0.00"}
                </span>
              </div>

              {/* Total ₹ */}
              <div className="flex justify-end items-center py-1 text-[13px] font-bold border-t border-[#d1d5db] text-[#111111]">
                <span className="text-right pr-6">Total</span>
                <span className="text-right min-w-[90px]">
                  ₹{totalNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Balance Due */}
              <div className="flex justify-end items-center py-1 text-[12px] font-bold text-[#111111]">
                <span className="text-right pr-6">Balance Due</span>
                <span className="text-right min-w-[90px]">
                  ₹{balanceDueNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Signature Box: Sivakumar D (Manager) centered at top, Authorized Signature at bottom */}
            <div className="p-3 flex-1 flex flex-col justify-end">
              <div className="mr-3 mb-3 border border-[#8c8c8c] p-4 text-center text-[11px] flex flex-col justify-between min-h-[130px]">
                <span className="font-semibold text-[#111111] block">Sivakumar D (Manager)</span>
                <div className="h-12"></div>
                <span className="font-medium text-[#666666] block text-[10px]">Authorized Signature</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
