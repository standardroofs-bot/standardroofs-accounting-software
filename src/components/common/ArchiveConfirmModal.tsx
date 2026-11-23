"use client";

import React from "react";
import { AlertTriangle, Archive, RotateCcw, X, Loader2 } from "lucide-react";

export interface ArchiveConfirmModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  message?: string;
  recordLabel?: string;
  recordName?: string;
  recordType?: string;
  isRestore?: boolean;
  loading?: boolean;
}

export function ArchiveConfirmModal({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  recordLabel,
  recordName,
  recordType = "record",
  isRestore = false,
  loading = false,
}: ArchiveConfirmModalProps) {
  if (!isOpen) return null;

  const handleClose = onClose || onCancel || (() => {});
  const displayLabel = recordLabel || recordName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
          title="Close"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl shrink-0 ${
              isRestore
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                : "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
            }`}
          >
            {isRestore ? <RotateCcw size={24} /> : <Archive size={24} />}
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {title || (isRestore ? `Restore ${recordType}` : `Archive ${recordType}`)}
            </h3>
            {message ? (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {message}
                {displayLabel && (
                  <span className="block mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    ({displayLabel})
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isRestore ? (
                  <>
                    Are you sure you want to restore{" "}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {displayLabel || `this ${recordType}`}
                    </strong>
                    ? It will become active and visible across standard reports and workflows again.
                  </>
                ) : (
                  <>
                    Are you sure you want to archive{" "}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {displayLabel || `this ${recordType}`}
                    </strong>
                    ? It will be safely preserved in your archive tab and can be restored at any time.
                    No financial or ledger history will be permanently deleted.
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg text-white shadow-2xs transition active:scale-95 ${
              isRestore
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            <span>{isRestore ? "Confirm Restore" : "Archive Record"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ArchiveConfirmModal;
