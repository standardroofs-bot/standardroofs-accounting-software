import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatINR, numberToWordsINR } from "@/lib/decimal";
import {
  COMPANY_NAME,
  COMPANY_ADDRESS,
  COMPANY_GSTIN,
  COMPANY_PAN,
  COMPANY_PHONE,
  COMPANY_EMAIL,
  COMPANY_BANK_NAME,
  COMPANY_BANK_BRANCH,
  COMPANY_BANK_AC_NO,
  COMPANY_BANK_IFSC,
} from "@/lib/gst";
import { Printer } from "lucide-react";

export const dynamic = "force-dynamic";

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

  return (
    <div className="bg-slate-100 min-h-screen py-8 text-slate-900 print:bg-white print:py-0 print:m-0">
      {/* Print Controls (Hidden on Print) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between print:hidden px-4">
        <a
          href="/invoices"
          className="text-xs text-blue-600 hover:underline font-bold"
        >
          ← Back to Invoices
        </a>
        <button
          onClick={() => {}}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-2 print:hidden cursor-pointer"
          id="print-btn"
        >
          <Printer size={16} /> Print / Save as PDF (A4)
        </button>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById('print-btn')?.addEventListener('click', () => window.print());`,
        }}
      />

      {/* A4 Document Container */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-8 border border-slate-300 shadow-xl print:border-none print:shadow-none print:p-6 text-xs font-sans">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-blue-700 text-white font-black text-xl flex items-center justify-center">
                SR
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  {COMPANY_NAME}
                </h1>
                <p className="text-[10px] text-slate-600 font-medium">
                  Pre-Engineered Building (PEB) & Industrial Roofing Contractors
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-2 max-w-sm leading-relaxed">
              {COMPANY_ADDRESS}
              <br />
              Phone: {COMPANY_PHONE} • Email: {COMPANY_EMAIL}
            </p>
            <div className="mt-1 font-mono text-[10px] text-slate-700 font-bold">
              <span>GSTIN: {COMPANY_GSTIN}</span> • <span>PAN: {COMPANY_PAN}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="px-3 py-1 bg-slate-900 text-white font-black text-sm uppercase tracking-wider rounded">
              {invoice.invoiceType.replace("_", " ")}
            </span>
            <div className="mt-3 space-y-1 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 font-sans">Invoice No: </span>
                <strong className="text-sm text-slate-900">{invoice.invoiceNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Date: </span>
                <strong>
                  {new Date(invoice.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </strong>
              </div>
              {invoice.dueDate && (
                <div>
                  <span className="text-slate-500 font-sans">Due Date: </span>
                  <strong>
                    {new Date(invoice.dueDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </div>
              )}
              <div>
                <span className="text-slate-500 font-sans">Place of Supply: </span>
                <strong>
                  {invoice.placeOfSupply} (Code: {invoice.placeOfSupplyStateCode})
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & Ship To Section */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Billed To:
            </span>
            <p className="font-bold text-slate-900 mt-1 text-sm">{invoice.customer.name}</p>
            {invoice.customer.companyName && (
              <p className="text-slate-700 font-semibold">{invoice.customer.companyName}</p>
            )}
            <p className="text-slate-600 mt-1 whitespace-pre-line text-[11px]">
              {invoice.customer.billingAddress}
            </p>
            <div className="mt-2 text-[10px] font-mono text-slate-700">
              {invoice.customer.gstNumber ? (
                <span>
                  <strong>GSTIN:</strong> {invoice.customer.gstNumber}
                </span>
              ) : (
                <span className="italic text-slate-400">GST: Unregistered Consumer</span>
              )}
              <span className="ml-3">
                <strong>State:</strong> {invoice.customer.state} ({invoice.customer.stateCode})
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Site / Project Location:
            </span>
            {invoice.project ? (
              <div className="mt-1">
                <p className="font-bold text-slate-900 text-sm">
                  {invoice.project.code} — {invoice.project.name}
                </p>
                <p className="text-slate-600 mt-0.5 text-[11px]">
                  {invoice.project.siteLocation}, {invoice.project.city}, {invoice.project.state}
                </p>
                <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  Roof Type: {invoice.project.roofType}
                </span>
              </div>
            ) : (
              <p className="text-slate-600 mt-1 whitespace-pre-line text-[11px]">
                {invoice.customer.shippingAddress || invoice.customer.billingAddress}
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mt-4">
          <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                <th className="py-2 px-2.5 w-8 text-center border-r border-slate-300">#</th>
                <th className="py-2 px-2.5 border-r border-slate-300">Description of Goods / Works Contract</th>
                <th className="py-2 px-2 w-20 text-center border-r border-slate-300">HSN/SAC</th>
                <th className="py-2 px-2 w-16 text-right border-r border-slate-300">Qty</th>
                <th className="py-2 px-2 w-14 text-center border-r border-slate-300">Unit</th>
                <th className="py-2 px-2 w-20 text-right border-r border-slate-300">Rate (₹)</th>
                <th className="py-2 px-2 w-20 text-right border-r border-slate-300">Taxable (₹)</th>
                <th className="py-2 px-2 w-12 text-center border-r border-slate-300">GST %</th>
                <th className="py-2 px-2.5 w-24 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-2 px-2.5 text-center font-mono border-r border-slate-300">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300 font-medium text-slate-800">
                    {item.description}
                  </td>
                  <td className="py-2 px-2 text-center font-mono border-r border-slate-300">
                    {item.hsnSacCode}
                  </td>
                  <td className="py-2 px-2 text-right font-mono border-r border-slate-300">
                    {Number(item.quantity).toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-center font-mono border-r border-slate-300">
                    {item.unit}
                  </td>
                  <td className="py-2 px-2 text-right font-mono border-r border-slate-300">
                    {Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold border-r border-slate-300">
                    {formatINR(item.taxableAmount)}
                  </td>
                  <td className="py-2 px-2 text-center font-mono border-r border-slate-300">
                    {Number(item.gstRate).toFixed(0)}%
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                    {formatINR(item.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary & Bank Details */}
        <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
          {/* Bank Payment Details */}
          <div className="p-3 bg-slate-50 border border-slate-300 rounded font-mono text-[10px] space-y-1">
            <span className="font-bold font-sans text-slate-800 uppercase block mb-1">
              Bank Details for NEFT / RTGS Payout:
            </span>
            <div>Bank: <strong>{COMPANY_BANK_NAME}</strong></div>
            <div>Branch: <strong>{COMPANY_BANK_BRANCH}</strong></div>
            <div>A/C Number: <strong className="text-xs">{COMPANY_BANK_AC_NO}</strong></div>
            <div>IFSC Code: <strong className="text-xs">{COMPANY_BANK_IFSC}</strong></div>
            <div>A/C Name: <strong>{COMPANY_NAME}</strong></div>
          </div>

          {/* Totals Table */}
          <div className="border border-slate-300 divide-y divide-slate-200 font-mono text-xs">
            <div className="flex justify-between py-1.5 px-3">
              <span className="font-sans text-slate-600">Taxable Amount:</span>
              <strong className="text-slate-900">{formatINR(invoice.subTotal)}</strong>
            </div>

            {invoice.isInterState ? (
              <div className="flex justify-between py-1.5 px-3">
                <span className="font-sans text-slate-600">IGST (18%):</span>
                <strong>{formatINR(invoice.igstTotal)}</strong>
              </div>
            ) : (
              <>
                <div className="flex justify-between py-1.5 px-3">
                  <span className="font-sans text-slate-600">Central GST (CGST 9%):</span>
                  <strong>{formatINR(invoice.cgstTotal)}</strong>
                </div>
                <div className="flex justify-between py-1.5 px-3">
                  <span className="font-sans text-slate-600">State GST (SGST 9%):</span>
                  <strong>{formatINR(invoice.sgstTotal)}</strong>
                </div>
              </>
            )}

            <div className="flex justify-between py-2 px-3 bg-slate-100 text-sm font-black text-slate-900">
              <span className="font-sans">Grand Total:</span>
              <span>{formatINR(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px]">
          <strong>Amount in Words: </strong>
          <span className="italic text-slate-800">{numberToWordsINR(invoice.totalAmount)}</span>
        </div>

        {/* Terms & Signatures */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-200 text-[10px]">
          <div>
            <span className="font-bold uppercase text-slate-700 block">Terms & Conditions:</span>
            <p className="text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
              {invoice.terms}
            </p>
          </div>
          <div className="text-right flex flex-col justify-between items-end h-28">
            <span className="font-bold uppercase text-slate-900">
              For {COMPANY_NAME}
            </span>
            <div className="text-center w-48 border-t border-slate-400 pt-1">
              <span className="text-[10px] font-bold text-slate-700 block">Authorised Signatory</span>
              <span className="text-[9px] text-slate-400 block">Subject to Erode Jurisdiction</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
