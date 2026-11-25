"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { BrandedPayslip, BrandedPayslipItem } from "@/components/payroll/BrandedPayslip";

interface RunData {
  id: string;
  cycleType: string;
  month: string;
  halfPeriod: string;
  status: string;
  items: BrandedPayslipItem[];
}

function BatchPayslipsContent() {
  const searchParams = useSearchParams();
  const runId = searchParams.get("runId");
  const cycleType = searchParams.get("cycleType") || "MONTHLY_OFFICE";
  const month = searchParams.get("month") || "2026-10";
  const halfPeriod = searchParams.get("halfPeriod") || "FULL";

  const [run, setRun] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ cycleType, month, halfPeriod });
    if (runId) params.set("runId", runId);
    fetch(`/api/payroll?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.run) {
          setRun(data.run);
        }
      })
      .finally(() => setLoading(false));
  }, [runId, cycleType, month, halfPeriod]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/payroll"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            <ArrowLeft size={14} />
            <span>Back to Payroll</span>
          </Link>
          <div>
            <div className="text-sm font-extrabold text-slate-900">
              Batch Payslips Print View
            </div>
            <div className="text-xs text-slate-500">
              {run ? `${run.items.length} Payslips • ${run.month} (${run.halfPeriod})` : "Loading..."}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          disabled={!run || run.items.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
        >
          <Printer size={14} />
          <span>Print / Save All as PDF</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">Loading payslips...</div>
      ) : !run || run.items.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
          No payroll items found for this cycle.
        </div>
      ) : (
        <div className="space-y-8 print:space-y-0">
          {run.items.map((item, idx) => (
            <BrandedPayslip
              key={item.id}
              item={item}
              month={run.month}
              halfPeriod={run.halfPeriod}
              status={run.status}
              slipIndex={idx + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BatchPayslipsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Loading batch payslips...</div>}>
      <BatchPayslipsContent />
    </Suspense>
  );
}
