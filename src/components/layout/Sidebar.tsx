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
      className={`fixed top-0 left-0 z-50 h-screen transition-all duration-300 ease-in-out bg-gradient-to-b from-[#131C31] via-[#18233C] to-[#111827] text-slate-100 flex flex-col border-r border-slate-800/80 shadow-2xl backdrop-blur-md ${
        isCollapsed ? "w-20" : "w-64"
      } ${
        isMobileOpen
          ? "translate-x-0"
          : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-slate-800/80 bg-[#131C31]/90 shrink-0">
        <Link
          href="/"
          onClick={() => setIsMobileOpen(false)}
          className="flex items-center gap-2 overflow-hidden hover:opacity-95 transition group cursor-pointer"
          title="Return to Home"
        >
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shrink-0 shadow-sm border border-white/20 group-hover:scale-105 transition">
            <img
              src="/images/standard-roofs-logo.png"
              alt="Standard Roofs Logo"
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-xs tracking-tight text-white leading-none flex items-center gap-1.5">
                SR-Books
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  v2.6
                </span>
              </span>
              <span className="text-[10px] text-slate-400 truncate mt-0.5">
                Standard Roofs • Erode
              </span>
            </div>
          )}
        </Link>

        {/* Mobile Close Button vs Desktop Collapse Toggle */}
        <div className="flex items-center">
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 lg:hidden transition cursor-pointer"
            title="Close Menu"
          >
            <X size={18} />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      {/* 4-Workspace Switcher Bar (Zoho One Style) */}
      {!isCollapsed ? (
        <div className="p-2.5 border-b border-slate-800/80 bg-[#131C31]/50 relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="w-full flex items-center justify-between p-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition group shadow-sm cursor-pointer text-white"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div
                className={`w-7 h-7 rounded-xl bg-gradient-to-br ${
                  currentWorkspace === "all"
                    ? "from-blue-600 to-indigo-600"
                    : activeWsConfig.color
                } text-white flex items-center justify-center shrink-0 shadow-sm`}
              >
                {currentWorkspace === "all" ? (
                  <Layers size={14} />
                ) : (
                  <activeWsConfig.icon size={14} />
                )}
              </div>
              <div className="truncate">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">
                  Active Workspace
                </span>
                <span className="text-[11.5px] font-bold text-white truncate block">
                  {currentWorkspace === "all" ? "All Modules" : activeWsConfig.title}
                </span>
              </div>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 group-hover:text-white transition-transform ${
                showWorkspaceMenu ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Workspace Dropdown Menu */}
          {showWorkspaceMenu && (
            <div className="absolute left-2 right-2 top-full mt-1 bg-[#18233C] border border-slate-700/80 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 space-y-1">
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
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold shadow-md shadow-blue-500/30"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <WsIcon size={15} className={isSelected ? "text-white" : "text-slate-400"} />
                      <span className="truncate">{ws.title}</span>
                    </div>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                  </button>
                );
              })}

              {!isHr && (
                <div className="border-t border-slate-700/60 my-1 pt-1">
                  <button
                    onClick={() => handleSwitchWorkspace("all")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                      currentWorkspace === "all"
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold shadow-md shadow-blue-500/30"
                        : "text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers size={15} />
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
        <div className="p-2 border-b border-slate-800/80 flex justify-center">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-blue-400 flex items-center justify-center transition cursor-pointer border border-white/10"
            title={`Active: ${activeWsConfig.title} (Click to expand)`}
          >
            <activeWsConfig.icon size={16} />
          </button>
        </div>
      )}

      {/* Nav groups */}
      <div className="flex-1 py-2 px-2 space-y-2.5 overflow-y-auto custom-scrollbar">
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
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 hover:text-slate-200 uppercase transition group cursor-pointer"
                >
                  <span className="truncate">{group.title}</span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 group-hover:text-slate-200 transition-transform duration-200 ${
                      isOpen ? "" : "-rotate-90"
                    }`}
                  />
                </button>
              ) : (
                <div className="h-px bg-slate-800 my-2 mx-1" />
              )}

              {/* Items List */}
              {(isCollapsed || isOpen) && (
                <div className="space-y-1">
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
                        className={`flex items-center gap-3 px-3.5 py-2.5 text-[14px] transition-all group relative rounded-xl ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/40"
                            : "text-slate-300 hover:bg-white/8 hover:text-white font-medium"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={`shrink-0 transition-colors ${
                            isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                          }`}
                        />
                        {!isCollapsed && (
                          <div className="flex items-center justify-between flex-1 truncate">
                            <span className="truncate tracking-tight">{item.name}</span>
                            {item.badge && (
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                                  isActive
                                    ? "bg-white/20 text-white border border-white/30"
                                    : "bg-white/10 text-slate-300 border border-white/10"
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
        <div className="p-2.5 border-t border-slate-800/80 bg-[#111827]/90 text-[11px] flex items-center justify-between shrink-0">
          <div className="truncate">
            <div className="font-bold text-white truncate">
              {currentUser.email === "admin@standardroofs.in" || currentUser.role === "SUPER_ADMIN"
                ? "Prabhakaran T"
                : currentUser.name}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>{currentUser.role === "SUPER_ADMIN" ? "Super Admin" : currentUser.role?.replace(/_/g, " ")}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">Online</span>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-2xs shadow-emerald-400/50" />
        </div>
      )}
    </aside>
  );
}
