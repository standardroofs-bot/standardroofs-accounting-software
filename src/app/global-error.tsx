"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("SR-Books Critical Global Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-950/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-900">
            <AlertTriangle size={28} />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-black text-white">
              Critical Runtime Error
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard Roofs Books experienced a root layout issue. All financial tables remain safely committed.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
            >
              <RefreshCw size={14} />
              <span>Reload Application</span>
            </button>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
            >
              <Home size={14} />
              <span>Home</span>
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
