"use client";

import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PrintButtonProps {
  backUrl?: string;
  title?: string;
}

export default function PrintButton({
  backUrl = "/invoices",
  title = "Print / Save as PDF (A4)",
}: PrintButtonProps) {
  return (
    <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between print:hidden px-4">
      <Link
        href={backUrl}
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1.5"
      >
        <ArrowLeft size={14} /> Back
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-2 cursor-pointer transition active:scale-95"
      >
        <Printer size={16} /> {title}
      </button>
    </div>
  );
}
