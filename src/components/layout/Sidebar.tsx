"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { useState, useEffect } from "react";

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

const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard, moduleKey: "dashboard" },
      { name: "Approvals Queue", href: "/approvals", icon: CheckSquare, badge: "MD", moduleKey: "approvals" },
    ],
  },
  {
    id: "sales",
    title: "Sales & Billing",
    items: [
      { name: "Invoices & GST", href: "/invoices", icon: Receipt, badge: "#33", moduleKey: "invoices" },
      { name: "Quotes & Estimates", href: "/estimates", icon: FileText, badge: "Quotes", moduleKey: "estimates" },
      { name: "Customers & AR", href: "/customers", icon: Users, moduleKey: "customers" },
      { name: "Credit & Debit Notes", href: "/credit-notes", icon: RotateCcw, moduleKey: "credit_debit_notes" },
      { name: "Price Catalog", href: "/price-catalog", icon: Tags, moduleKey: "price_catalog" },
      { name: "Recurring Templates", href: "/recurring", icon: Clock, moduleKey: "recurring" },
    ],
  },
  {
    id: "purchases",
    title: "Purchases & Expenses",
    items: [
      { name: "Suppliers & Purchases", href: "/suppliers", icon: ShoppingCart, moduleKey: "suppliers" },
      { name: "Site Expenses", href: "/expenses", icon: ReceiptIndianRupee, moduleKey: "expenses" },
    ],
  },
  {
    id: "operations",
    title: "Site Operations",
    items: [
      { name: "Projects & Costing", href: "/projects", icon: Briefcase, moduleKey: "projects" },
      { name: "SRM Machines & Tools", href: "/machines", icon: Wrench, badge: "SRM", moduleKey: "machines" },
      { name: "Fleet & Vehicles", href: "/fleet", icon: Truck, badge: "2 Cargo", moduleKey: "fleet" },
      { name: "Yard Stock Inventory", href: "/inventory", icon: Warehouse, moduleKey: "inventory" },
      { name: "Advances & Retainers", href: "/advances", icon: Wallet, moduleKey: "advances" },
    ],
  },
  {
    id: "hr",
    title: "HR & Payroll",
    items: [
      { name: "HR & Payroll Hub", href: "/labour", icon: Users2, badge: "3-in-1", moduleKey: "labour" },
    ],
  },
  {
    id: "accounting",
    title: "Accounting & Reports",
    items: [
      { name: "Chart of Accounts", href: "/accounts", icon: BookOpen, moduleKey: "accounts" },
      { name: "Daily Cash Book", href: "/cashbook", icon: Wallet, moduleKey: "cashbook" },
      { name: "Banking & Cards", href: "/banking", icon: Landmark, moduleKey: "banking" },
      { name: "Vouchers & Journals", href: "/vouchers", icon: FileSpreadsheet, moduleKey: "vouchers" },
      { name: "Capital & Loans", href: "/capital", icon: Coins, badge: "Equity", moduleKey: "capital" },
      { name: "Financial & GST Reports", href: "/reports", icon: BarChart3, badge: "P&L", moduleKey: "reports" },
    ],
  },
  {
    id: "admin",
    title: "Administration",
    items: [
      { name: "Team Permissions", href: "/users", icon: Users, badge: "RBAC", moduleKey: "users" },
      { name: "Company Settings", href: "/settings", icon: Settings, moduleKey: "settings" },
      { name: "Excel Data Importer", href: "/import", icon: Upload, moduleKey: "import" },
      { name: "Audit Trail", href: "/audit", icon: ShieldCheck, moduleKey: "audit" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    sales: true,
    purchases: true,
    operations: true,
    hr: true,
    accounting: true,
    admin: true,
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCurrentUser(data.user);
      })
      .catch((err) => console.error(err));
  }, []);

  // Ensure current path's section is opened automatically
  useEffect(() => {
    for (const group of NAV_GROUPS) {
      const hasActive = group.items.some((item) =>
        item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
      );
      if (hasActive) {
        setOpenSections((prev) => ({ ...prev, [group.id]: true }));
      }
    }
  }, [pathname]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isModuleAllowed = (item: NavItem) => {
    if (!currentUser) return true; // Show until profile loads
    const role = currentUser.role;
    if (role === "SUPER_ADMIN" || role === "MANAGING_DIRECTOR") return true;

    // Check custom permissions if assigned
    if (currentUser.permissions && currentUser.permissions[item.moduleKey] !== undefined) {
      return !!currentUser.permissions[item.moduleKey]?.view;
    }

    // Role fallback
    if (role === "HR_MANAGER") {
      return ["labour", "expenses", "machines", "approvals"].includes(item.moduleKey);
    }
    if (role === "SITE_SUPERVISOR") {
      return ["expenses", "machines", "fleet"].includes(item.moduleKey);
    }
    if (role === "ACCOUNTANT") {
      return item.moduleKey !== "users" && item.moduleKey !== "settings";
    }

    return true;
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/40 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-3 overflow-hidden hover:opacity-90 transition group cursor-pointer"
          title="Return to Dashboard Home"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shrink-0 shadow-md group-hover:bg-blue-500 transition">
            SR
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm tracking-tight text-white leading-none group-hover:text-blue-300 transition">
                SR-Books
              </span>
              <span className="text-[11px] text-slate-400 truncate mt-1">
                Standard Roofs • Erode
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav groups */}
      <div className="flex-1 py-3 px-3 space-y-3 overflow-y-auto custom-scrollbar">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(isModuleAllowed);
          if (visibleItems.length === 0) return null;

          const isOpen = openSections[group.id] !== false;

          return (
            <div key={group.id} className="space-y-1">
              {/* Group Header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleSection(group.id)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 hover:text-slate-200 uppercase transition group"
                >
                  <span className="truncate">{group.title}</span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${
                      isOpen ? "" : "-rotate-90"
                    }`}
                  />
                </button>
              ) : (
                <div className="h-px bg-slate-800 my-2 mx-1" />
              )}

              {/* Items List */}
              {(collapsed || isOpen) && (
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.name : undefined}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors group relative ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm font-bold"
                            : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={`shrink-0 transition-colors ${
                            isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                          }`}
                        />
                        {!collapsed && (
                          <div className="flex items-center justify-between flex-1 truncate">
                            <span className="truncate">{item.name}</span>
                            {item.badge && (
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                  isActive
                                    ? "bg-blue-700 text-white"
                                    : "bg-slate-800 text-slate-400 border border-slate-700"
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

      {/* User Status Footer */}
      {!collapsed && currentUser && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] flex items-center justify-between shrink-0">
          <div className="truncate">
            <div className="font-bold text-white truncate">{currentUser.name}</div>
            <div className="text-[10px] text-slate-400 capitalize">
              {currentUser.role?.replace(/_/g, " ").toLowerCase()}
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
        </div>
      )}
    </aside>
  );
}
