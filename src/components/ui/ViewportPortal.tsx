"use client";

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

interface ViewportPortalProps {
  children: React.ReactNode;
  variant?: "modal" | "drawer";
  printScope?: boolean;
  onBackdropClick?: () => void;
  className?: string;
}

/**
 * Global ViewportPortal: renders modals and slide-over drawers directly into
 * document.body via ReactDOM.createPortal with documentElement + body scroll lock.
 */
export function ViewportPortal({
  children,
  variant = "modal",
  printScope = false,
  onBackdropClick,
  className = "",
}: ViewportPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  if (!mounted) return null;

  const layoutClasses =
    variant === "drawer"
      ? "fixed inset-0 z-[9999] flex justify-end bg-slate-950/55 print:static print:bg-white"
      : "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/55 print:static print:p-0 print:bg-white";

  return ReactDOM.createPortal(
    <div
      className={`${layoutClasses} ${printScope ? "sr-print-portal" : ""} ${className}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onBackdropClick) {
          onBackdropClick();
        }
      }}
    >
      {children}
    </div>,
    document.body
  );
}
