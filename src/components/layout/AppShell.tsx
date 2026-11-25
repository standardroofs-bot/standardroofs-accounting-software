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

export type SRThemeKey = "mint_teal" | "cool_indigo" | "mint_forest" | "lavender_plum";

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
  mint_teal: {
    id: "mint_teal",
    name: "Mint Teal & Sky Pearl",
    paletteLabel: "Mint Teal & Sky",
    tagline: "Cool Mist canvas, Mint-Aqua sidebar, Emerald & Teal accents",
    swatchPrimary: "#0d9488",
    swatchSecondary: "#059669",
    canvasBg: "#E5ECF6",
    sidebarGradient: "from-[#E6F4F1] via-[#EBF3FA] to-[#E4ECF7]",
    sidebarBorder: "border-teal-200/80",
    sidebarActiveBg: "bg-gradient-to-r from-teal-600 to-emerald-600",
    activePillGradient: "bg-gradient-to-r from-teal-600 to-emerald-600",
    activePillText: "text-white",
    activeBadge: "bg-teal-100 text-teal-800 border border-teal-200",
    primaryBtn: "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-600/20",
    headerBorder: "border-teal-200/80",
  },
  cool_indigo: {
    id: "cool_indigo",
    name: "Cool Ice & Royal Indigo",
    paletteLabel: "Cool Ice & Indigo",
    tagline: "Cool Ice canvas, Frosted Porcelain sidebar, Royal Indigo & Sky accents",
    swatchPrimary: "#2563eb",
    swatchSecondary: "#4f46e5",
    canvasBg: "#F0F4FA",
    sidebarGradient: "from-white via-[#F4F7FC] to-[#EDF2FA]",
    sidebarBorder: "border-slate-200/90",
    sidebarActiveBg: "bg-gradient-to-r from-blue-600 to-indigo-600",
    activePillGradient: "from-blue-600 to-indigo-600",
    activePillText: "text-white",
    activeBadge: "bg-blue-100 text-blue-800 border border-blue-200",
    primaryBtn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-600/20",
    headerBorder: "border-slate-200/90",
  },
  mint_forest: {
    id: "mint_forest",
    name: "Mint Sage & Forest",
    paletteLabel: "Mint Sage & Forest",
    tagline: "Mint Sage canvas, Crisp Porcelain sidebar, Deep Forest & Mint accents",
    swatchPrimary: "#047857",
    swatchSecondary: "#10b981",
    canvasBg: "#F0F7F4",
    sidebarGradient: "from-white via-[#F2F8F5] to-[#EAF5EF]",
    sidebarBorder: "border-emerald-200/80",
    sidebarActiveBg: "bg-gradient-to-r from-emerald-700 to-teal-700",
    activePillGradient: "from-emerald-700 to-teal-700",
    activePillText: "text-white",
    activeBadge: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    primaryBtn: "from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white shadow-emerald-700/20",
    headerBorder: "border-emerald-200/70",
  },
  lavender_plum: {
    id: "lavender_plum",
    name: "Soft Lavender & Plum",
    paletteLabel: "Lavender & Plum",
    tagline: "Soft Lilac canvas, Frosted Porcelain sidebar, Deep Plum & Indigo accents",
    swatchPrimary: "#7e22ce",
    swatchSecondary: "#6366f1",
    canvasBg: "#F4F0FA",
    sidebarGradient: "from-white via-[#F7F4FC] to-[#F0EBF9]",
    sidebarBorder: "border-purple-200/80",
    sidebarActiveBg: "bg-gradient-to-r from-purple-800 to-indigo-800",
    activePillGradient: "from-purple-800 to-indigo-800",
    activePillText: "text-white",
    activeBadge: "bg-purple-100 text-purple-800 border border-purple-200",
    primaryBtn: "from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white shadow-purple-700/20",
    headerBorder: "border-purple-200/70",
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
  const [currentTheme, setCurrentThemeState] = useState<SRThemeKey>("mint_teal");

  // Read saved workspace & theme from localStorage on mount (migrating away from any obsolete/dark theme)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sr_workspace");
      if (saved) setCurrentWorkspaceState(saved);
      const savedCollapsed = localStorage.getItem("sr_sidebar_collapsed");
      if (savedCollapsed !== null) setIsCollapsed(savedCollapsed === "true");
      
      const savedTheme = localStorage.getItem("sr_books_theme");
      if (!savedTheme || savedTheme === "pearl_slate" || savedTheme === "terracotta_emerald" || !SR_THEMES[savedTheme as SRThemeKey]) {
        localStorage.setItem("sr_books_theme", "mint_teal");
        setCurrentThemeState("mint_teal");
        document.documentElement.setAttribute("data-theme", "mint_teal");
      } else {
        setCurrentThemeState(savedTheme as SRThemeKey);
        document.documentElement.setAttribute("data-theme", savedTheme);
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

  const themeConfig = SR_THEMES[currentTheme] || SR_THEMES.mint_teal;

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
            isCollapsed ? "lg:ml-20" : "lg:ml-[280px]"
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
