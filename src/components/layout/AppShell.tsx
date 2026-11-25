"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export type SRThemeKey = "terracotta" | "emerald_gold" | "lavender_plum" | "slate_copper";

export interface SRThemeConfig {
  id: SRThemeKey;
  name: string;
  paletteLabel: string;
  tagline: string;
  swatchPrimary: string;
  swatchSecondary: string;
  canvasBg: string;
  sidebarGradient: string;
  sidebarBorder: string;
  sidebarActiveBg: string;
  activePillGradient: string;
  activePillText: string;
  activeBadge: string;
  primaryBtn: string;
  headerBorder: string;
}

export const SR_THEMES: Record<SRThemeKey, SRThemeConfig> = {
  terracotta: {
    id: "terracotta",
    name: "Warm Terracotta & Emerald",
    paletteLabel: "Terracotta & Emerald",
    tagline: "Warm Sand canvas, Linen-Stone sidebar, Emerald & Terracotta accents",
    swatchPrimary: "#b45309",
    swatchSecondary: "#047857",
    canvasBg: "#EDE9E1",
    sidebarGradient: "from-[#F5EFE6] via-[#EFE7DC] to-[#E7DDD0]",
    sidebarBorder: "border-stone-300/90",
    sidebarActiveBg: "bg-gradient-to-r from-emerald-700 to-teal-700",
    activePillGradient: "from-emerald-700 to-teal-700",
    activePillText: "text-white",
    activeBadge: "bg-amber-400/25 text-amber-100 border border-amber-300/40",
    primaryBtn: "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-600/20",
    headerBorder: "border-stone-300/80",
  },
  emerald_gold: {
    id: "emerald_gold",
    name: "Royal Emerald & Gold",
    paletteLabel: "Emerald & Gold",
    tagline: "Soft Sage-Mist canvas, Frosted Mint-Slate sidebar, Deep Forest & Gold",
    swatchPrimary: "#047857",
    swatchSecondary: "#d97706",
    canvasBg: "#E4ECE8",
    sidebarGradient: "from-[#EEF5F1] via-[#E4ECE8] to-[#DCE7E1]",
    sidebarBorder: "border-emerald-300/80",
    sidebarActiveBg: "bg-gradient-to-r from-emerald-800 to-teal-800",
    activePillGradient: "from-emerald-800 to-teal-800",
    activePillText: "text-amber-100",
    activeBadge: "bg-amber-400/30 text-amber-200 border border-amber-300/50",
    primaryBtn: "from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white shadow-emerald-700/20",
    headerBorder: "border-emerald-300/70",
  },
  lavender_plum: {
    id: "lavender_plum",
    name: "Soft Lavender & Plum",
    paletteLabel: "Lavender & Plum",
    tagline: "Warm Lilac-Mist canvas, Frosted Velvet-Pearl sidebar, Deep Plum & Indigo",
    swatchPrimary: "#7e22ce",
    swatchSecondary: "#4f46e5",
    canvasBg: "#EAE6F2",
    sidebarGradient: "from-[#F3F0F9] via-[#EAE5F4] to-[#E0D8ED]",
    sidebarBorder: "border-purple-300/80",
    sidebarActiveBg: "bg-gradient-to-r from-purple-800 to-indigo-800",
    activePillGradient: "from-purple-800 to-indigo-800",
    activePillText: "text-white",
    activeBadge: "bg-purple-300/30 text-purple-100 border border-purple-300/40",
    primaryBtn: "from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white shadow-purple-700/20",
    headerBorder: "border-purple-300/70",
  },
  slate_copper: {
    id: "slate_copper",
    name: "Executive Slate & Copper",
    paletteLabel: "Slate & Copper",
    tagline: "Cool Stone canvas, Warm Graphite-Pearl sidebar, Copper & Slate",
    swatchPrimary: "#334155",
    swatchSecondary: "#b45309",
    canvasBg: "#E5E7EB",
    sidebarGradient: "from-[#F1F3F6] via-[#E7EBF0] to-[#DCDFE6]",
    sidebarBorder: "border-slate-300/80",
    sidebarActiveBg: "bg-gradient-to-r from-slate-800 to-stone-800",
    activePillGradient: "from-slate-800 to-stone-800",
    activePillText: "text-amber-300",
    activeBadge: "bg-amber-500/25 text-amber-200 border border-amber-400/40",
    primaryBtn: "from-amber-700 to-stone-800 hover:from-amber-800 hover:to-stone-900 text-white shadow-stone-800/20",
    headerBorder: "border-slate-300/70",
  },
};

interface SidebarContextType {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  currentWorkspace: string;
  setCurrentWorkspace: (ws: string) => void;
  currentTheme: SRThemeKey;
  setCurrentTheme: (t: SRThemeKey) => void;
  themeConfig: SRThemeConfig;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within an AppShell");
  }
  return context;
}

export function useTheme() {
  const { currentTheme, setCurrentTheme, themeConfig } = useSidebar();
  return { currentTheme, setCurrentTheme, themeConfig };
}

// SessionGuard to eliminate bfcache leaks and verify active authentication safely
function SessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    // 1. Enforce reload if loaded from browser Back/Forward cache (bfcache)
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    // 2. Safe client verification: ONLY redirect if strictly 401 Unauthorized AND cookie is absent
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => {
        if (res.status === 401) {
          if (typeof document !== "undefined" && !document.cookie.includes("sr_session")) {
            localStorage.removeItem("sr_workspace");
            window.location.replace("/login");
          }
        }
      })
      .catch(() => {
        // Network hiccups/cancellations should NEVER log the user out
      });

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [pathname]);

  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<string>("accounting_gst");
  const [currentTheme, setCurrentThemeState] = useState<SRThemeKey>("terracotta");

  // Read saved workspace & theme from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sr_workspace");
      if (saved) setCurrentWorkspaceState(saved);
      const savedCollapsed = localStorage.getItem("sr_sidebar_collapsed");
      if (savedCollapsed !== null) setIsCollapsed(savedCollapsed === "true");
      const savedTheme = localStorage.getItem("sr_books_theme") as SRThemeKey;
      if (savedTheme && SR_THEMES[savedTheme]) {
        setCurrentThemeState(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      } else {
        document.documentElement.setAttribute("data-theme", "terracotta");
      }
    } catch (e) {
      // LocalStorage access safe fallback
    }
  }, []);

  const setCurrentTheme = (theme: SRThemeKey) => {
    setCurrentThemeState(theme);
    try {
      localStorage.setItem("sr_books_theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    } catch (e) {}
  };

  const themeConfig = SR_THEMES[currentTheme] || SR_THEMES.terracotta;

  const setCurrentWorkspace = (ws: string) => {
    setCurrentWorkspaceState(ws);
    try {
      localStorage.setItem("sr_workspace", ws);
    } catch (e) {}
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  const handleSetCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem("sr_sidebar_collapsed", String(collapsed));
    } catch (e) {}
  };

  // Auto-close mobile drawer when navigating to a new route
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const isStandalonePage =
    pathname === "/login" ||
    pathname === "/login/" ||
    pathname.includes("/print");

  if (isStandalonePage) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        setIsMobileOpen,
        toggleMobileSidebar,
        isCollapsed,
        setIsCollapsed: handleSetCollapsed,
        currentWorkspace,
        setCurrentWorkspace,
        currentTheme,
        setCurrentTheme,
        themeConfig,
      }}
    >
      <SessionGuard />
      <div className="min-h-screen bg-transparent dark:bg-slate-950 flex transition-colors text-slate-900 dark:text-slate-100 antialiased">
        {/* Mobile Backdrop Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar Component */}
        <Sidebar />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
            isCollapsed ? "lg:ml-20" : "lg:ml-[272px]"
          } ml-0 w-full min-w-0`}
        >
          <Header />
          <main key={pathname} className="flex-1 p-3 sm:p-5 lg:p-6 overflow-x-hidden min-w-0 animate-page-enter">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
