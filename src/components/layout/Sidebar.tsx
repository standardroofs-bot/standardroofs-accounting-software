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
import { useSidebar } from "./AppShell";

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
  groups: NavGroup[];
}

const WORKSPACES: WorkspaceConfig[] = [
  {
    id: "accounting_gst",
    title: "Standard Finance & GST",
    shortLabel: "Finance",
    icon: Landmark,
    color: "from-blue-600 to-indigo-600",
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
    icon: HardHat,
    color: "from-amber-600 to-orange-600",
    groups: [
      {
        id: "site_operations",
        title: "Site Execution & Costing",
        items: [
          { name: "Standard Sites", href: "/projects", icon: Briefcase, moduleKey: "projects" },
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
    icon: Users2,
    color: "from-emerald-600 to-teal-600",
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
    icon: ShieldCheck,
    color: "from-purple-600 to-indigo-700",
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
      className={`fixed top-0 left-0 z-50 h-screen transition-all duration-300 ease-in-out bg-gradient-to-b from-[#E5ECFA] via-[#EAEFFA] to-[#DFE7F7] text-slate-800 flex flex-col border-r border-indigo-200/80 shadow-[4px_0_24px_-12px_rgba(30,58,138,0.12)] backdrop-blur-md ${
        isCollapsed ? "w-20" : "w-[272px]"
      } ${
        isMobileOpen
          ? "translate-x-0"
          : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-indigo-200/70 bg-white/75 shrink-0 backdrop-blur-sm">
        <Link
          href="/"
          onClick={() => setIsMobileOpen(false)}
          className="flex items-center gap-2.5 overflow-hidden hover:opacity-95 transition group cursor-pointer"
          title="Return to Home"
        >
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shrink-0 shadow-2xs border border-slate-200 group-hover:border-indigo-400 transition">
            <img
              src="/images/standard-roofs-logo.png"
              alt="Standard Roofs Logo"
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-xs tracking-tight text-slate-900 leading-none group-hover:text-indigo-600 transition flex items-center gap-1.5">
                SR-Books
                <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  v2.6
                </span>
              </span>
              <span className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                Standard Roofs • Erode
              </span>
            </div>
          )}
        </Link>

        {/* Mobile Close Button vs Desktop Collapse Toggle */}
        <div className="flex items-center">
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 lg:hidden transition cursor-pointer"
            title="Close Menu"
          >
            <X size={18} />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-slate-200/60 text-slate-500 hover:text-slate-900 transition cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      {/* 4-Workspace Switcher Bar (Tactile White Porcelain Selector) */}
      {!isCollapsed ? (
        <div className="p-2.5 border-b border-indigo-200/70 bg-indigo-50/40 relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-indigo-200/90 shadow-sm hover:border-indigo-400 hover:shadow-md transition text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-br ${
                  currentWorkspace === "all"
                    ? "from-blue-600 to-indigo-600"
                    : activeWsConfig.color
                } text-white flex items-center justify-center shrink-0 shadow-sm`}
              >
                {currentWorkspace === "all" ? (
                  <Layers size={15} />
                ) : (
                  <activeWsConfig.icon size={15} />
                )}
              </div>
              <div className="truncate">
                <span className="text-[9.5px] font-bold tracking-wider text-slate-400 uppercase block leading-none">
                  Active Workspace
                </span>
                <span className="text-[12.5px] font-bold text-slate-900 group-hover:text-indigo-600 transition truncate block mt-0.5">
                  {currentWorkspace === "all" ? "All Modules" : activeWsConfig.title}
                </span>
              </div>
            </div>
            <ChevronDown
              size={15}
              className={`text-slate-400 group-hover:text-slate-700 transition-transform duration-200 shrink-0 ml-1 ${
                showWorkspaceMenu ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Workspace Dropdown Menu */}
          {showWorkspaceMenu && (
            <div className="absolute left-2.5 right-2.5 top-full mt-1 bg-white border border-indigo-200/90 rounded-xl shadow-2xl p-1.5 z-50 transition-all duration-200 ease-out origin-top animate-in fade-in zoom-in-95 space-y-1">
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600/10 text-indigo-700 font-bold border-l-[3px] border-indigo-600 shadow-2xs"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <WsIcon size={15} className={isSelected ? "text-indigo-600" : "text-slate-400"} />
                      <span className="truncate">{ws.title}</span>
                    </div>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
                  </button>
                );
              })}

              {!isHr && (
                <div className="border-t border-slate-100 my-1 pt-1">
                  <button
                    onClick={() => handleSwitchWorkspace("all")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                      currentWorkspace === "all"
                        ? "bg-indigo-600/10 text-indigo-700 font-bold border-l-[3px] border-indigo-600"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers size={15} className={currentWorkspace === "all" ? "text-indigo-600" : "text-slate-400"} />
                      <span>View All Workspaces</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Collapsed Workspace Icon Button */
        <div className="p-2 border-b border-slate-200/90 flex justify-center">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 text-indigo-600 flex items-center justify-center transition cursor-pointer border border-slate-200 shadow-2xs"
            title={`Active: ${activeWsConfig.title} (Click to expand)`}
          >
            <activeWsConfig.icon size={16} />
          </button>
        </div>
      )}

      {/* Nav groups */}
      <div className="flex-1 py-2 px-2.5 space-y-2.5 overflow-y-auto custom-scrollbar">
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
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 hover:text-slate-700 uppercase transition group cursor-pointer"
                >
                  <span className="truncate">{group.title}</span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                      isOpen ? "" : "-rotate-90"
                    }`}
                  />
                </button>
              ) : (
                <div className="h-px bg-slate-200 my-2 mx-1" />
              )}

              {/* Items List (Zero Truncation) */}
              {(isCollapsed || isOpen) && (
                <div className="space-y-0.5">
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
                        className={`flex items-center gap-2.5 px-3 py-2 text-[13.5px] transition-all duration-200 group relative ${
                          isActive
                            ? "bg-white text-indigo-700 font-bold shadow-sm border border-indigo-200/90 border-l-[4px] border-l-indigo-600 rounded-r-xl rounded-l-xs"
                            : "text-slate-700 hover:bg-white/70 hover:text-indigo-950 font-medium rounded-xl hover:translate-x-1 hover:shadow-2xs"
                        }`}
                      >
                        <Icon
                          size={17}
                          className={`shrink-0 transition-colors ${
                            isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-700"
                          }`}
                        />
                        {!isCollapsed && (
                          <div className="flex items-center justify-between flex-1 min-w-0">
                            <span className="whitespace-nowrap tracking-tight">{item.name}</span>
                            {item.badge && (
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md shrink-0 ml-1.5 ${
                                  isActive
                                    ? "bg-indigo-600/15 text-indigo-700 border border-indigo-600/25"
                                    : "bg-slate-200/70 text-slate-600 border border-slate-300/60"
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
        <div className="p-3 border-t border-indigo-200/70 bg-white/75 text-xs flex items-center justify-between shrink-0 shadow-2xs backdrop-blur-sm">
          <div className="truncate">
            <div className="font-bold text-slate-900 truncate">
              {currentUser.email === "admin@standardroofs.in" || currentUser.role === "SUPER_ADMIN"
                ? "Prabhakaran T"
                : currentUser.name}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
              <span>{currentUser.role === "SUPER_ADMIN" ? "Super Admin" : currentUser.role?.replace(/_/g, " ")}</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">Online</span>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-2xs shadow-emerald-500/50 animate-pulse" />
        </div>
      )}
    </aside>
  );
}
