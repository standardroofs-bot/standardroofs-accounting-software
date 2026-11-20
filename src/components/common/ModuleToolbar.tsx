"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

export interface ViewFilterOption {
  label: string;
  value: string;
  count?: number;
}

interface ModuleToolbarProps {
  title?: string;
  searchPlaceholder?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewOptions?: ViewFilterOption[];
  activeView?: string;
  onViewChange?: (view: string) => void;
  onImportClick?: () => void;
  onDownloadSample?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionHref?: string;
  onRefresh?: () => void;
  extraControls?: React.ReactNode;
}

export function ModuleToolbar({
  title,
  searchPlaceholder = "Search records...",
  searchQuery,
  onSearchChange,
  viewOptions = [],
  activeView,
  onViewChange,
  onImportClick,
  onDownloadSample,
  onExportExcel,
  onExportPDF,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionHref,
  onRefresh,
  extraControls,
}: ModuleToolbarProps) {
  const [showImportExport, setShowImportExport] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-sans">
      {/* Left: View Filter Dropdown & Search */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        {/* View / Status Filter Dropdown */}
        {viewOptions.length > 0 && (
          <div className="relative shrink-0">
            <select
              value={activeView}
              onChange={(e) => onViewChange?.(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-xs"
            >
              {viewOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} {opt.count !== undefined ? `(${opt.count})` : ""}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        )}

        {/* Instant Search Bar */}
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
          />
        </div>

        {extraControls}
      </div>

      {/* Right Controls: Refresh, Import/Export & Primary + New CTA */}
      <div className="flex items-center gap-2 shrink-0">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh List"
          >
            <RefreshCw size={14} />
          </button>
        )}

        {/* Import / Export Menu */}
        <div className="relative">
          <button
            onClick={() => setShowImportExport(!showImportExport)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 transition"
            title="Import or Export Records"
          >
            <Download size={13} />
            <span>Import / Export</span>
            <ChevronDown size={12} className="text-slate-400" />
          </button>

          {showImportExport && (
            <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-40 text-xs animate-in fade-in zoom-in-95">
              {onImportClick && (
                <button
                  onClick={() => {
                    setShowImportExport(false);
                    onImportClick();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <Upload size={14} className="text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold">Import Excel / CSV</span>
                </button>
              )}

              {onDownloadSample && (
                <button
                  onClick={() => {
                    setShowImportExport(false);
                    onDownloadSample();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Download Sample Template</span>
                </button>
              )}

              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

              {onExportExcel && (
                <button
                  onClick={() => {
                    setShowImportExport(false);
                    onExportExcel();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <FileSpreadsheet size={14} className="text-green-600 dark:text-green-400" />
                  <span>Export to Excel (.xlsx)</span>
                </button>
              )}

              {onExportPDF && (
                <button
                  onClick={() => {
                    setShowImportExport(false);
                    onExportPDF();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <Printer size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Export Printable PDF (A4)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Primary + New Button */}
        {primaryActionLabel && (
          primaryActionHref ? (
            <a
              href={primaryActionHref}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-2xs transition active:scale-95"
            >
              <Plus size={15} />
              <span>{primaryActionLabel}</span>
            </a>
          ) : (
            <button
              onClick={onPrimaryAction}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              <span>{primaryActionLabel}</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
