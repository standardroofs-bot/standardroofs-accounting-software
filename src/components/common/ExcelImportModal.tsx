"use client";

import React, { useState } from "react";
import { X, Upload, Download, CheckCircle2, AlertTriangle, FileSpreadsheet, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { downloadSampleExcel } from "@/lib/exportUtils";

export type SampleColumnItem = string | { header: string; example?: string | number };

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sampleColumns: SampleColumnItem[];
  onImport: (rows: any[]) => Promise<{ success: boolean; message?: string; count?: number }>;
  sampleFilename?: string;
}

export function ExcelImportModal({
  isOpen,
  onClose,
  title,
  sampleColumns,
  onImport,
  sampleFilename = "sample_import_template",
}: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!data || data.length === 0) {
          setErrorMsg("Uploaded sheet contains no data rows.");
          return;
        }

        const cols = Object.keys(data[0] as object);
        setColumns(cols);
        setParsedRows(data);
      } catch (err: any) {
        setErrorMsg("Failed to read Excel file: " + err.message);
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleDownloadSample = () => {
    const normalized = sampleColumns.map((c) =>
      typeof c === "string" ? { header: c, example: `Sample ${c}` } : { header: c.header, example: c.example ?? "" }
    );
    downloadSampleExcel(normalized, sampleFilename);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) {
      setErrorMsg("No rows to import.");
      return;
    }

    try {
      setImporting(true);
      setErrorMsg(null);
      const res = await onImport(parsedRows);
      if (res.success) {
        setSuccessMsg(res.message || `Successfully imported ${res.count || parsedRows.length} records!`);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.message || "Import failed. Please check your data formatting.");
      }
    } catch (err: any) {
      setErrorMsg("Error executing import: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {title} (Excel / CSV)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Universal 3-step bulk import with live validation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 1: Download Template */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              Step 1: Download Standard Roofs Sample Template
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Pre-configured with exact required columns and validation examples.
            </span>
          </div>
          <button
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 shadow-2xs shrink-0 transition"
          >
            <Download size={13} />
            <span>Sample .xlsx</span>
          </button>
        </div>

        {/* Step 2: Upload File */}
        <div className="space-y-1 text-xs">
          <label className="font-bold text-slate-800 dark:text-slate-200 block">
            Step 2: Choose File (.xlsx, .xls, .csv)
          </label>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center hover:border-blue-500 transition cursor-pointer relative bg-slate-50/50 dark:bg-slate-800/30">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center gap-1">
              <Upload size={22} className="text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                {file ? file.name : "Click or drag your filled spreadsheet here"}
              </span>
              <span className="text-[10px] text-slate-400">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports XLSX and CSV formats"}
              </span>
            </div>
          </div>
        </div>

        {/* Step 3: Live Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Step 3: Preview Detected Rows ({parsedRows.length} total)
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Ready for safe database upsert
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-48 text-[11px]">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 uppercase text-[9px]">
                  <tr>
                    <th className="py-2 px-3 border-b border-slate-200 dark:border-slate-700">#</th>
                    {columns.map((c) => (
                      <th key={c} className="py-2 px-3 border-b border-slate-200 dark:border-slate-700">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedRows.slice(0, 8).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-1.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                      {columns.map((c) => (
                        <td key={c} className="py-1.5 px-3 text-slate-700 dark:text-slate-300">
                          {String(row[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 8 && (
              <span className="text-[10px] text-slate-400 block text-right">
                Showing first 8 of {parsedRows.length} records.
              </span>
            )}
          </div>
        )}

        {/* Status Messages */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={importing || parsedRows.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {importing && <Loader2 size={14} className="animate-spin" />}
            <span>{importing ? "Importing Records..." : `Confirm Import (${parsedRows.length})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
