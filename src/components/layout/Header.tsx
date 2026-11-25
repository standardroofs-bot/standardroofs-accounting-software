"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Moon,
  Sun,
  Calendar,
  Building,
  Search,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  FileText,
  Truck,
  Warehouse,
  Receipt,
  ReceiptIndianRupee,
  Wallet,
  Bell,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Menu,
  Palette,
  Check,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useSidebar, useTheme, SR_THEMES, SRThemeKey } from "./AppShell";

interface HeaderProps {
  onQuickCreate?: (type: "inflow" | "outflow" | "transfer" | "journal") => void;
}

export function Header({ onQuickCreate }: HeaderProps) {
  const { toggleMobileSidebar } = useSidebar();
  const { currentTheme, setCurrentTheme, themeConfig } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [selectedFY, setSelectedFY] = useState("2026-27");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCurrentUser(data.user);
      })
      .catch((err) => console.error(err));

    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      // Clear client storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}
      // Replace history to prevent browser back-button navigation
      window.location.replace("/login");
    }
  };

  const [alerts, setAlerts] = useState<any[]>([
    {
      id: "1",
      title: "Invoice Sequence #33 Ready",
      description: "Next sequential tax invoice SR/26-27/0033 ready for generation.",
      type: "info",
      href: "/invoices/new",
      time: "Current",
    },
    {
      id: "2",
      title: "Bolero Pickup Insurance / FC",
      description: "Annual FC inspection due next month for TN-33 cargo vehicle.",
      type: "warning",
      href: "/fleet",
      time: "Reminder",
    },
    {
      id: "3",
      title: "Double-Entry Balance Verified",
      description: "Trial Balance & Cash Flow balanced to ₹ 0.00 exact parity.",
      type: "success",
      href: "/reports",
      time: "Automated",
    },
  ]);

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("sr_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("sr_theme", "light");
    }
  };

  const displayName =
    currentUser?.email === "admin@standardroofs.in" || currentUser?.role === "SUPER_ADMIN"
      ? "Prabhakaran T"
      : currentUser?.name || "Managing Director";

  const displayRole =
    currentUser?.role === "SUPER_ADMIN" ? "Super Admin" : currentUser?.role?.replace(/_/g, " ") || "Administrator";

  const initials =
    displayName
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PT";

  return (
    <header className="h-14 bg-[#FCFBF9]/90 backdrop-blur-xl border-b border-stone-300/80 dark:border-slate-800 shadow-xs flex items-center justify-between px-3 sm:px-5 lg:px-6 sticky top-0 z-30 transition-colors whitespace-nowrap select-none">
      {/* Left: Hamburger (mobile) + Organization context + Search */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Drawer Button */}
        <button
          onClick={toggleMobileSidebar}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition"
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-85 transition group cursor-pointer"
          title="Return to Home"
        >
          <Building className="text-amber-700 dark:text-amber-500 group-hover:scale-105 transition shrink-0" size={18} />
          <div className="flex flex-col">
            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition leading-none">
              Standard Roofs
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none mt-0.5 hidden xs:inline">
              Books & Roofing ERP
            </span>
          </div>
        </Link>

        {/* Financial Year Selector */}
        <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-md bg-stone-100/90 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Calendar size={13} className="text-amber-700 dark:text-amber-500 shrink-0" />
          <span>FY:</span>
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            className="bg-transparent border-none text-xs font-bold text-stone-800 dark:text-stone-200 focus:outline-none cursor-pointer"
          >
            <option value="2026-27">2026-27 (Active)</option>
            <option value="2025-26">2025-26 (Archived)</option>
          </select>
        </div>

        {/* Global Search (Tablet and Desktop) */}
        <div className="hidden md:flex items-center relative ml-2">
          <Search size={15} className="absolute left-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search accounts, invoices, materials, fleet..."
            className="pl-8 pr-4 py-1.5 rounded-lg bg-[#F9F7F3] dark:bg-slate-800 border border-stone-300/80 dark:border-slate-700 text-xs w-48 lg:w-64 focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* + Quick Create Button */}
        <div className="relative">
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition active:scale-95 cursor-pointer"
            title="Create New Transaction"
          >
            <Plus size={15} />
            <span className="hidden xs:inline">+ Quick Create</span>
            <span className="xs:hidden">Create</span>
          </button>

          {showQuickMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95">
              <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                Top 5 Daily Quick Actions
              </div>

              {/* 1. New Tax Invoice */}
              <Link
                href="/invoices/new"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Receipt size={16} className="text-amber-500" />
                  <span className="font-semibold">+ New Tax Invoice</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">
                  #33
                </span>
              </Link>

              {/* 2. Record Cash In / Out */}
              <Link
                href="/cashbook"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
              >
                <Wallet size={16} className="text-emerald-500" />
                <span className="font-medium">+ Record Cash In / Out</span>
              </Link>

              {/* 3. Log Site Expense */}
              <Link
                href="/expenses"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition"
              >
                <ReceiptIndianRupee size={16} className="text-rose-500" />
                <span className="font-medium">+ Log Site Expense (Photo)</span>
              </Link>

              {/* 4. Vehicle Trip & Diesel */}
              <Link
                href="/fleet"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                <Truck size={16} className="text-blue-500" />
                <span className="font-medium">+ Vehicle Trip / Diesel ₹</span>
              </Link>

              {/* 5. Issue Material to Site */}
              <Link
                href="/inventory"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                <Warehouse size={16} className="text-indigo-500" />
                <span className="font-medium">+ Issue Material to Site</span>
              </Link>

              <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1">
                <Link
                  href="/import"
                  onClick={() => setShowQuickMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:text-foreground text-[11px]"
                >
                  <FileText size={14} />
                  <span>Excel Bulk Importer (.xlsx)</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Smart Alerts & Reminders Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
            title="Smart Alerts & Reminders"
          >
            <Bell size={17} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-3 z-50 text-xs animate-in fade-in zoom-in-95">
              <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Smart Alerts & Reminders
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold">
                  {alerts.length} active
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {alerts.map((al) => (
                  <Link
                    key={al.id}
                    href={al.href}
                    onClick={() => setShowNotifications(false)}
                    className="block p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition whitespace-normal"
                  >
                    <div className="flex items-start gap-2.5">
                      {al.type === "warning" ? (
                        <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                      ) : al.type === "success" ? (
                        <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <Clock size={15} className="text-blue-500 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {al.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {al.description}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1 block">
                          {al.time}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="px-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <Link
                  href="/reports"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View All Financial Indicators →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 1-Click Curated Live Palette Theme Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowThemeMenu(!showThemeMenu);
              setShowQuickMenu(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-800 dark:text-stone-200 border border-stone-300/80 dark:border-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
            title="Switch Commercial Palette Theme (Persisted)"
          >
            <Palette size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="hidden md:inline font-bold text-[11.5px]">{themeConfig.paletteLabel}</span>
            <div className="flex items-center -space-x-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800 shadow-2xs" style={{ backgroundColor: themeConfig.swatchPrimary }} />
              <span className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800 shadow-2xs" style={{ backgroundColor: themeConfig.swatchSecondary }} />
            </div>
            <ChevronDown size={11} className="text-stone-400" />
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#FCFBF9] dark:bg-slate-900 border border-stone-300 dark:border-slate-800 shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500 border-b border-stone-200 dark:border-slate-800 mb-1 flex items-center justify-between">
                <span>Commercial ERP Palette</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">1-Click Live</span>
              </div>

              <div className="space-y-1">
                {(Object.keys(SR_THEMES) as SRThemeKey[]).map((themeKey) => {
                  const t = SR_THEMES[themeKey];
                  const isSelected = currentTheme === themeKey;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setCurrentTheme(t.id);
                        setShowThemeMenu(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition text-left cursor-pointer group ${
                        isSelected
                          ? "bg-amber-100/70 dark:bg-slate-800 text-stone-900 dark:text-stone-50 border border-amber-300/80 dark:border-amber-500/40 shadow-xs"
                          : "hover:bg-stone-200/50 dark:hover:bg-slate-800/60 text-stone-700 dark:text-stone-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="flex items-center -space-x-1.5 mt-0.5 shrink-0">
                          <span className="w-3.5 h-3.5 rounded-full border border-white shadow-xs" style={{ backgroundColor: t.swatchPrimary }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-white shadow-xs" style={{ backgroundColor: t.swatchSecondary }} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs tracking-tight flex items-center gap-1.5">
                            {t.name}
                            {isSelected && (
                              <span className="text-[9px] px-1 rounded bg-amber-600 text-white font-bold leading-tight">Active</span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug line-clamp-1">
                            {t.tagline}
                          </div>
                        </div>
                      </div>
                      {isSelected ? (
                        <Check size={14} className="text-amber-700 dark:text-amber-400 shrink-0 ml-1.5" />
                      ) : (
                        <div className="w-3.5 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition"
          title="Toggle Light/Dark Theme"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* User Badge & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col text-left truncate max-w-[140px]">
              <span className="text-xs font-bold text-stone-800 dark:text-slate-200 leading-none truncate">
                {displayName}
              </span>
              <span className="text-[10px] text-stone-400 leading-none mt-1 truncate">
                {displayRole}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            title="Log Out of SR-Books (Strict Session End)"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
