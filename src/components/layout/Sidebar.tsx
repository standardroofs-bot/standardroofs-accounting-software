"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Wallet,
  Landmark,
  FileSpreadsheet,
  Users,
  Briefcase,
  Receipt,
  ShoppingCart,
  ReceiptIndianRupee,
  Users2,
  Wrench,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Truck,
  Warehouse,
  BarChart3,
  Settings,
  Upload,
  FileText,
  Coins,
  CheckSquare,
  Clock,
  Tags,
  RotateCcw,
  Layers,
  CreditCard,
  Building2,
  HardHat,
  Shield,
  X,
  Search,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "./AppShell";

// ==============================================================================
// BESPOKE MULTI-LAYERED DUOTONE SVG CREST EMBLEMS FOR THE 4 WORKSPACES
// ==============================================================================

// 1. Standard Finance & GST Crest (Emerald-Sapphire Ledger & Rupee Crest)
function FinanceGstIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="finGstGradA" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="finGstGradB" x1="8" y1="6" x2="16" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#finGstGradA)" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="14" r="3.5" fill="url(#finGstGradB)" stroke="white" strokeWidth="1.2" />
      <path d="M14.8 13h2.4M14.8 14.2h2M15.4 13v2.2" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

// 2. Standard Sites & Fleet Crest (Amber-Orange Roof Truss & Crane Crest)
function SitesFleetIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="siteGradA" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <path d="M2 13L12 4l10 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10.5v8.5a1 1 0 001 1h12a1 1 0 001-1v-8.5" fill="url(#siteGradA)" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 4v16M8 10l8 10M16 10L8 20" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" strokeLinecap="round" />
      <circle cx="12" cy="13" r="2.2" fill="white" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

// 3. Standard People (HR & Payroll) Crest (Violet-Teal Workforce & ID Crest)
function PeoplePayrollIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hrGradA" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="hrGradB" x1="10" y1="10" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" fill="url(#hrGradA)" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="11" width="8" height="10" rx="2" fill="url(#hrGradB)" stroke="white" strokeWidth="1.2" />
      <circle cx="18" cy="14" r="1.5" fill="white" />
      <path d="M16 18h4" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

// 4. Standard Admin & Security Crest (Crimson-Violet Shield & Key Crest)
function AdminSecurityIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="secGradA" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ec4899" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="url(#secGradA)" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" fill="white" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 12.5V16M10.5 15h3" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// 5. All Workspaces Multi-Cube Crest
function AllWorkspacesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#3b82f6" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M2 12l10 5 10-5M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  moduleKey: string;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export interface WorkspaceConfig {
  id: string;
  title: string;
  shortLabel: string;
  icon: any;
  color: string;
  activeBorder: string;
  activeText: string;
  activeIconColor: string;
  activeBadge: string;
  groups: NavGroup[];
}

const WORKSPACES: WorkspaceConfig[] = [
  {
    id: "accounting_gst",
    title: "Standard Finance & GST",
    shortLabel: "Finance",
    icon: FinanceGstIcon,
    color: "from-blue-600 via-indigo-600 to-blue-700",
    activeBorder: "border-l-indigo-600",
    activeText: "text-indigo-700",
    activeIconColor: "text-indigo-600",
    activeBadge: "bg-indigo-600/15 text-indigo-700 border border-indigo-600/25",
    groups: [
      {
        id: "sales_core",
        title: "Sales & Invoicing",
        items: [
          { name: "Standard Home", href: "/", icon: LayoutDashboard, moduleKey: "dashboard" },
          { name: "Standard Invoices & GST", href: "/invoices", icon: Receipt, badge: "#33", moduleKey: "invoices" },
          { name: "Standard Quotes", href: "/estimates", icon: FileText, badge: "Quotes", moduleKey: "estimates" },
          { name: "Standard Sales Orders", href: "/sales-orders", icon: Layers, badge: "Orders", moduleKey: "invoices" },
          { name: "Standard Customers", href: "/customers", icon: Users, moduleKey: "customers" },
          { name: "Standard Credit & Debit Notes", href: "/credit-notes", icon: RotateCcw, moduleKey: "credit_debit_notes" },
          { name: "Standard Price Catalog", href: "/price-catalog", icon: Tags, moduleKey: "price_catalog" },
          { name: "Standard Recurring Templates", href: "/recurring", icon: Clock, moduleKey: "recurring" },
        ],
      },
      {
        id: "purchases_core",
        title: "Purchases & Payables",
        items: [
          { name: "Standard Vendors", href: "/vendors", icon: Users, moduleKey: "suppliers" },
          { name: "Standard Sub-Contractors", href: "/contractors", icon: HardHat, badge: "Sub-Con", moduleKey: "projects" },
          { name: "Standard Purchase Orders", href: "/purchase-orders", icon: ShoppingCart, badge: "PO", moduleKey: "suppliers" },
          { name: "Standard Vendor Bills", href: "/bills", icon: FileText, badge: "Bills", moduleKey: "suppliers" },
          { name: "Standard Payments Made", href: "/payments-made", icon: CreditCard, moduleKey: "suppliers" },
        ],
      },
      {
        id: "banking_ledger",
        title: "Banking & General Ledger",
        items: [
          { name: "Standard Banking", href: "/banking", icon: Landmark, badge: "3161", moduleKey: "banking" },
          { name: "Standard Daily Cash Book", href: "/cashbook", icon: Wallet, moduleKey: "cashbook" },
          { name: "Standard Chart of Accounts", href: "/accounts", icon: BookOpen, moduleKey: "accounts" },
          { name: "Standard Vouchers & Journals", href: "/vouchers", icon: FileSpreadsheet, moduleKey: "vouchers" },
          { name: "Standard Capital & Loans", href: "/capital", icon: Coins, badge: "Equity", moduleKey: "capital" },
          { name: "Standard Reports", href: "/reports", icon: BarChart3, badge: "P&L", moduleKey: "reports" },
        ],
      },
    ],
  },
  {
    id: "site_fleet",
    title: "Standard Sites & Fleet",
    shortLabel: "Sites & Fleet",
    icon: SitesFleetIcon,
    color: "from-amber-500 via-orange-600 to-amber-700",
    activeBorder: "border-l-amber-600",
    activeText: "text-amber-800",
    activeIconColor: "text-amber-600",
    activeBadge: "bg-amber-600/15 text-amber-800 border border-amber-600/25",
    groups: [
      {
        id: "site_operations",
        title: "Site Execution & Costing",
        items: [
          { name: "Standard Sites", href: "/projects", icon: Briefcase, moduleKey: "projects" },
          { name: "Standard Sub-Contractors", href: "/contractors", icon: HardHat, badge: "Sub-Con", moduleKey: "projects" },
          { name: "Standard SRM Machines", href: "/machines", icon: Wrench, badge: "SRM", moduleKey: "machines" },
          { name: "Standard Fleet & Fuel", href: "/fleet", icon: Truck, badge: "2 Cargo", moduleKey: "fleet" },
          { name: "Standard Materials", href: "/inventory", icon: Warehouse, moduleKey: "inventory" },
          { name: "Standard Site Expenses", href: "/expenses", icon: ReceiptIndianRupee, moduleKey: "expenses" },
          { name: "Standard Site Advances", href: "/advances", icon: Wallet, moduleKey: "advances" },
        ],
      },
    ],
  },
  {
    id: "hr_payroll",
    title: "Standard People (HR & Payroll)",
    shortLabel: "People & HR",
    icon: PeoplePayrollIcon,
    color: "from-emerald-600 via-teal-600 to-emerald-700",
    activeBorder: "border-l-emerald-600",
    activeText: "text-emerald-800",
    activeIconColor: "text-emerald-600",
    activeBadge: "bg-emerald-600/15 text-emerald-800 border border-emerald-600/25",
    groups: [
      {
        id: "workforce",
        title: "Workforce Management",
        items: [
          { name: "Standard Attendance", href: "/attendance", icon: Clock, badge: "Live", moduleKey: "attendance" },
          { name: "Standard People", href: "/labour", icon: Users2, badge: "HRIS", moduleKey: "labour" },
          { name: "Standard Payroll", href: "/payroll", icon: Coins, moduleKey: "payroll" },
          { name: "Standard Recycle Bin", href: "/recycle-bin", icon: Trash2, badge: "Restore", moduleKey: "recycle_bin" },
        ],
      },
    ],
  },
  {
    id: "admin_control",
    title: "Standard Admin & Security",
    shortLabel: "Governance",
    icon: AdminSecurityIcon,
    color: "from-purple-600 via-violet-600 to-indigo-700",
    activeBorder: "border-l-purple-600",
    activeText: "text-purple-800",
    activeIconColor: "text-purple-600",
    activeBadge: "bg-purple-600/15 text-purple-800 border border-purple-600/25",
    groups: [
      {
        id: "governance",
        title: "Security & Governance",
        items: [
          { name: "Standard Approvals", href: "/approvals", icon: CheckSquare, badge: "MD", moduleKey: "approvals" },
          { name: "Standard Users & Roles", href: "/users", icon: Users, badge: "Super Admin", moduleKey: "users" },
          { name: "Standard Settings", href: "/settings", icon: Settings, moduleKey: "settings" },
          { name: "Standard Recycle Bin", href: "/recycle-bin", icon: Trash2, badge: "Restore", moduleKey: "recycle_bin" },
          { name: "Standard Excel Importer", href: "/import", icon: Upload, moduleKey: "import" },
          { name: "Standard Audit Trail", href: "/audit", icon: ShieldCheck, moduleKey: "audit" },
        ],
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isMobileOpen,
    setIsMobileOpen,
    isCollapsed,
    setIsCollapsed,
    currentWorkspace,
    setCurrentWorkspace,
    themeConfig,
  } = useSidebar();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sales_core: true,
    purchases_core: true,
    banking_ledger: true,
    site_operations: true,
    workforce: true,
    governance: true,
  });

  const WORKSPACE_FIRST_ROUTES: Record<string, string> = {
    accounting_gst: "/",
    site_fleet: "/projects",
    hr_payroll: "/attendance",
    admin_control: "/settings",
    all: "/",
  };

  const handleSwitchWorkspace = (wsId: string) => {
    setCurrentWorkspace(wsId);
    setShowWorkspaceMenu(false);
    const targetRoute = WORKSPACE_FIRST_ROUTES[wsId] || "/";
    router.push(targetRoute);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCurrentUser(data.user);
      })
      .catch((err) => console.error(err));
  }, []);

  // Automatic Workspace Detection based on route
  useEffect(() => {
    if (currentUser?.role === "HR_MANAGER") {
      if (currentWorkspace !== "hr_payroll") {
        setCurrentWorkspace("hr_payroll");
      }
      return;
    }

    if (
      pathname.startsWith("/projects") ||
      pathname.startsWith("/machines") ||
      pathname.startsWith("/fleet") ||
      pathname.startsWith("/inventory") ||
      pathname.startsWith("/expenses") ||
      pathname.startsWith("/advances")
    ) {
      if (currentWorkspace !== "site_fleet" && currentWorkspace !== "all") {
        setCurrentWorkspace("site_fleet");
      }
    } else if (pathname.startsWith("/labour") || pathname.startsWith("/attendance") || pathname.startsWith("/payroll")) {
      if (currentWorkspace !== "hr_payroll" && currentWorkspace !== "all") {
        setCurrentWorkspace("hr_payroll");
      }
    } else if (
      pathname.startsWith("/users") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/audit") ||
      pathname.startsWith("/approvals") ||
      pathname.startsWith("/import")
    ) {
      if (currentWorkspace !== "admin_control" && currentWorkspace !== "all") {
        setCurrentWorkspace("admin_control");
      }
    }
  }, [pathname, currentUser]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isModuleAllowed = (item: NavItem) => {
    if (!currentUser) return true;
    const role = currentUser.role;
    if (role === "SUPER_ADMIN" || role === "MANAGING_DIRECTOR") return true;

    if (role === "HR_MANAGER") {
      return ["labour", "attendance", "payroll", "recycle_bin"].includes(item.moduleKey);
    }
    if (role === "EMPLOYEE") {
      return false;
    }

    if (currentUser.permissions && currentUser.permissions[item.moduleKey] !== undefined) {
      return !!currentUser.permissions[item.moduleKey]?.view;
    }

    if (role === "SITE_SUPERVISOR") {
      return ["expenses", "machines", "fleet"].includes(item.moduleKey);
    }
    if (role === "ACCOUNTANT") {
      return item.moduleKey !== "users" && item.moduleKey !== "settings";
    }

    return true;
  };

  const isHr = currentUser?.role === "HR_MANAGER";
  const accessibleWorkspaces = isHr
    ? WORKSPACES.filter((w) => w.id === "hr_payroll")
    : WORKSPACES;

  const activeWsConfig =
    accessibleWorkspaces.find((w) => w.id === currentWorkspace) || accessibleWorkspaces[0];

  const displayedGroups =
    !isHr && currentWorkspace === "all"
      ? accessibleWorkspaces.flatMap((w) => w.groups)
      : activeWsConfig.groups;

  return (
    <aside
      className={`fixed top-0 left-0 z-50 h-screen transition-all duration-300 ease-in-out bg-[#EAEFF5] text-slate-800 flex flex-col border-r border-slate-300/80 shadow-[2px_0_16px_-4px_rgba(15,23,42,0.06)] ${
        isCollapsed ? "w-20" : "w-[272px]"
      } ${
        isMobileOpen
          ? "translate-x-0"
          : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Flagship Brand Header Lockup */}
      <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-300/80 bg-[#E3E9F1]/70 shrink-0">
        <Link
          href="/"
          onClick={() => setIsMobileOpen(false)}
          className="flex items-center gap-3 overflow-hidden hover:opacity-95 transition group cursor-pointer"
          title="Return to Home"
        >
          <motion.div
            whileHover={{ scale: 1.04 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="w-11 h-11 rounded-xl bg-white p-1.5 border border-indigo-300/80 shadow-[0_4px_14px_-2px_rgba(79,70,229,0.22)] ring-2 ring-indigo-500/15 relative overflow-hidden flex items-center justify-center shrink-0 group"
          >
            <img
              src="/images/standard-roofs-logo.png"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.png";
              }}
              alt="Standard Roofs Logo"
              className="w-full h-full object-contain relative z-10"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", repeatDelay: 2 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/15 to-transparent -skew-x-12 pointer-events-none"
            />
          </motion.div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-tight">
                  {currentUser?.activeCompany?.id === "invi-creation" ? "Invi-Books" : "SR-Books"}
                </span>
                <span className={`${currentUser?.activeCompany?.id === "invi-creation" ? "bg-purple-600" : "bg-indigo-600"} text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md leading-none shadow-2xs`}>
                  v2.6
                </span>
              </div>
              <span className="text-[10.5px] font-semibold tracking-wider uppercase text-slate-600 truncate mt-0.5 leading-none">
                {currentUser?.activeCompany?.id === "invi-creation"
                  ? "INVI CREATION · ERODE"
                  : "STANDARD ROOFS · ERODE"}
              </span>
            </div>
          )}
        </Link>

        {/* Mobile Close Button vs Desktop Collapse Toggle */}
        <div className="flex items-center">
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/70 lg:hidden transition cursor-pointer"
            title="Close Menu"
          >
            <X size={18} />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-white/70 text-slate-500 hover:text-slate-900 transition cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      {/* 4-Workspace Switcher Bar (Frosted White Selector) */}
      {!isCollapsed ? (
        <div className="p-2.5 border-b border-slate-300/80 bg-slate-200/40 relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/90 border border-slate-300/80 shadow-xs hover:border-indigo-400 text-slate-900 transition text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-br ${
                  currentWorkspace === "all"
                    ? "from-slate-700 to-indigo-700"
                    : activeWsConfig.color
                } text-white flex items-center justify-center shrink-0 shadow-xs`}
              >
                {currentWorkspace === "all" ? (
                  <AllWorkspacesIcon className="w-4.5 h-4.5 text-white" />
                ) : (
                  <activeWsConfig.icon className="w-4.5 h-4.5 text-white" />
                )}
              </div>
              <div className="truncate">
                <span className="text-[9.5px] font-bold tracking-wider text-slate-500 uppercase block leading-none">
                  Active Workspace
                </span>
                <span className="text-[12.5px] font-bold text-slate-900 group-hover:text-indigo-700 transition truncate block mt-0.5">
                  {currentWorkspace === "all" ? "All Modules" : activeWsConfig.title}
                </span>
              </div>
            </div>
            <ChevronDown
              size={15}
              className={`text-slate-500 group-hover:text-slate-900 transition-transform duration-200 shrink-0 ml-1 ${
                showWorkspaceMenu ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Workspace Dropdown Menu with Spring Physics & Custom Duotone Emblems */}
          <AnimatePresence>
            {showWorkspaceMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="absolute left-2.5 right-2.5 top-full mt-1.5 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-[0_20px_50px_-10px_rgba(15,23,42,0.15)] p-2 z-50 origin-top space-y-1.5"
              >
                <div className="px-2 py-1 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Workspace
                </div>
                {accessibleWorkspaces.map((ws) => {
                  const WsIcon = ws.icon;
                  const isSelected = currentWorkspace === ws.id;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitchWorkspace(ws.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? `bg-indigo-600/10 ${ws.activeText} font-bold border-l-[3px] ${ws.activeBorder} shadow-2xs`
                          : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${ws.color} text-white flex items-center justify-center shrink-0 shadow-2xs`}>
                          <WsIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="truncate">{ws.title}</span>
                      </div>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 shadow-xs" />}
                    </button>
                  );
                })}

                {!isHr && (
                  <div className="border-t border-slate-100 my-1 pt-1">
                    <button
                      onClick={() => handleSwitchWorkspace("all")}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition cursor-pointer ${
                        currentWorkspace === "all"
                          ? "bg-indigo-600/10 text-indigo-700 font-bold border-l-[3px] border-indigo-600"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <AllWorkspacesIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span>View All Workspaces</span>
                      </div>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Collapsed Workspace Icon Button */
        <div className="p-2 border-b border-indigo-200/70 flex justify-center">
          <button
            onClick={() => setIsCollapsed(false)}
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${activeWsConfig.color} text-white flex items-center justify-center transition cursor-pointer shadow-sm hover:scale-105`}
            title={`Active: ${activeWsConfig.title} (Click to expand)`}
          >
            <activeWsConfig.icon className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Nav groups */}
      <div className="flex-1 py-2 px-2 space-y-2 overflow-y-auto custom-scrollbar">
        {displayedGroups.map((group) => {
          const visibleItems = group.items.filter(isModuleAllowed);
          if (visibleItems.length === 0) return null;

          const isOpen = openSections[group.id] !== false;

          return (
            <div key={group.id} className="space-y-0.5">
              {/* Group Header */}
              {!isCollapsed ? (
                <button
                  onClick={() => toggleSection(group.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold tracking-wider text-slate-500 hover:text-slate-800 uppercase transition group cursor-pointer"
                >
                  <span className="truncate">{group.title}</span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-500 group-hover:text-slate-700 transition-transform duration-200 ${
                      isOpen ? "" : "-rotate-90"
                    }`}
                  />
                </button>
              ) : (
                <div className="h-px bg-slate-300/80 my-2 mx-1" />
              )}

              {/* Items List (Gliding Active Pill via Framer Motion layoutId) */}
              {(isCollapsed || isOpen) && (
                <div className="space-y-0.5 relative">
                  {visibleItems.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        title={isCollapsed ? item.name : undefined}
                        className={`flex items-center gap-2.5 px-3 py-2 text-[13.5px] transition-colors group relative rounded-xl ${
                          isActive
                            ? "text-white font-semibold"
                            : "text-slate-700 hover:text-slate-900 font-medium"
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="srActiveSidebarPill"
                            className="absolute inset-0 bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/25 rounded-xl z-0"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        {!isActive && (
                          <span className="absolute inset-0 rounded-xl hover:bg-white/70 transition-colors z-0" />
                        )}
                        <Icon
                          size={16}
                          className={`relative z-10 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                            isActive ? "text-white" : "text-slate-600 group-hover:text-indigo-600"
                          }`}
                        />
                        {!isCollapsed && (
                          <div className="relative z-10 flex items-center justify-between flex-1 min-w-0">
                            <span className="whitespace-nowrap tracking-tight">{item.name}</span>
                            {item.badge && (
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${
                                  isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-white/80 text-slate-700 border border-slate-300/80"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Super Admin Status Footer */}
      {!isCollapsed && currentUser && (
        <div className="p-3 border-t border-slate-300/80 bg-slate-200/70 text-xs flex items-center justify-between shrink-0 text-slate-900">
          <div className="truncate">
            <div className="font-bold text-slate-900 truncate">
              {currentUser.email === "admin@standardroofs.in" || currentUser.role === "SUPER_ADMIN"
                ? "Prabhakaran T"
                : currentUser.name}
            </div>
            <div className="text-[10px] text-slate-600 flex items-center gap-1 font-medium">
              <span>{currentUser.role === "SUPER_ADMIN" ? "Super Admin" : currentUser.role?.replace(/_/g, " ")}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">Online</span>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-2xs shadow-emerald-500/50 animate-pulse" />
        </div>
      )}
    </aside>
  );
}
