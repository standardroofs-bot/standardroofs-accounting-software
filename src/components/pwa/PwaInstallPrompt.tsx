"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, Share2, PlusSquare, X, CheckCircle2 } from "lucide-react";

interface PwaInstallPromptProps {
  variant?: "button" | "banner" | "compact";
  className?: string;
  label?: string;
}

export default function PwaInstallPrompt({
  variant = "button",
  className = "",
  label = "Install App",
}: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt event (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Prompt modal with general instructions
      setShowIOSModal(true);
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {variant === "banner" ? (
        <div
          className={`bg-gradient-to-r from-blue-900/90 to-indigo-900/90 text-white p-3.5 sm:p-4 rounded-2xl border border-blue-500/30 shadow-lg flex items-center justify-between gap-3 ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/60 border border-blue-400/40 flex items-center justify-center shrink-0">
              <Smartphone size={20} className="text-white" />
            </div>
            <div>
              <strong className="text-xs sm:text-sm font-extrabold block text-white">
                Install Standard Roofs Mobile App
              </strong>
              <p className="text-[11px] text-blue-200">
                Fast 1-tap home screen access, offline attendance & instant push alerts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-2 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-black text-xs shrink-0 shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Install</span>
          </button>
        </div>
      ) : variant === "compact" ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer ${className}`}
          title="Install as mobile app"
        >
          <Smartphone size={12} className="text-blue-600 dark:text-blue-400" />
          <span>{label}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer shrink-0 ${className}`}
        >
          <Smartphone size={14} />
          <span>{label}</span>
        </button>
      )}

      {/* iOS & General Install Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  SR
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Install SR-Books HR
                  </h3>
                  <p className="text-[10px] text-slate-500">Android & iPhone Mobile App</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <p className="text-slate-600 dark:text-slate-400 text-[11.5px]">
                To install this app on your phone's home screen for instant access:
              </p>

              {isIOS ? (
                <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Tap the <strong className="text-blue-600 dark:text-blue-400 inline-flex items-center gap-1"><Share2 size={12} /> Share</strong> button at the bottom of Safari.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Scroll down and tap <strong className="text-slate-900 dark:text-slate-100 inline-flex items-center gap-1"><PlusSquare size={12} /> Add to Home Screen</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Tap <strong className="text-blue-600 dark:text-blue-400">Add</strong> in the top-right corner.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Tap the <strong>three dots (⋮)</strong> browser menu in Chrome / Edge.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Select <strong className="text-blue-600 dark:text-blue-400">Install App</strong> or <strong className="text-blue-600 dark:text-blue-400">Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 size={13} />
                <span>Zero download required &middot; Works offline</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
