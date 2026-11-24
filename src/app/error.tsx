"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.message?.toLowerCase().includes("loading chunk") ||
    error?.message?.toLowerCase().includes("failed to fetch") ||
    error?.name === "ChunkLoadError";

  useEffect(() => {
    console.error("SR-Books Application Error:", error);

    // If a deployment or rebuild replaced client chunks, automatically reload once to fetch latest build
    if (isChunkError && typeof window !== "undefined") {
      const storageKey = "sr_chunk_reload_ts";
      const lastReload = sessionStorage.getItem(storageKey);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(storageKey, String(now));
        window.location.reload();
      }
    }
  }, [error, isChunkError]);

  const handleRetry = () => {
    if (isChunkError && typeof window !== "undefined") {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle size={28} />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
            {isChunkError ? "Application Updated to Latest Version" : "System Notice: Action Interrupted"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {isChunkError
              ? "A fresh build of Standard Roofs Books was deployed. Please click reload below to update your session."
              : "Standard Roofs Books caught an unexpected runtime condition. Your accounting ledgers and database records are completely secure."}
          </p>
        </div>

        {error?.message && !isChunkError && (
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-[11px] font-mono text-slate-700 dark:text-slate-300 text-left overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>{isChunkError ? "Reload Fresh App" : "Try Again"}</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 transition"
          >
            <Home size={14} />
            <span>Go to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
