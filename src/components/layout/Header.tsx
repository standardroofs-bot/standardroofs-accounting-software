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
} from "lucide-react";
import Link from "next/link";
import { useSidebar } from "./AppShell";

interface HeaderProps {
  onQuickCreate?: (type: "inflow" | "outflow" | "transfer" | "journal") => void;
}

export function Header({ onQuickCreate }: HeaderProps) {
  const { toggleMobileSidebar } = useSidebar();
  const [isDark, setIsDark] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
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
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs flex items-center justify-between px-3 sm:px-5 lg:px-6 sticky top-0 z-30 transition-colors whitespace-nowrap select-none">
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
          <Building className="text-slate-900 dark:text-slate-100 group-hover:scale-105 transition shrink-0" size={18} />
          <div className="flex flex-col">
            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition leading-none">
              Standard Roofs
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none mt-0.5 hidden xs:inline">
              Books & Roofing ERP
            </span>
          </div>
        </Link>

        {/* Financial Year Selector */}
        <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Calendar size={13} className="text-slate-600 dark:text-slate-400 shrink-0" />
          <span>FY:</span>
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            className="bg-transparent border-none text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="2026-27">2026-27 (Active)</option>
            <option value="2025-26">2025-26 (Archived)</option>
          </select>
        </div>

        {/* Global Search (Tablet and Desktop) */}
        <div className="hidden md:flex items-center relative ml-2">
          <Search size={15} className="absolute left-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search accounts, invoices, materials..."
            className="pl-8 pr-12 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs w-48 lg:w-64 focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-900 dark:text-slate-200"
          />
          <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 rounded absolute right-2">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* + Quick Create Button */}
        <div className="relative">
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
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

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Toggle Light/Dark Theme"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* User Badge & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ring-2 ring-indigo-500/15">
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
