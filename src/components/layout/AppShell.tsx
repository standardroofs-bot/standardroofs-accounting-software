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

export type SRThemeKey = "commercial_indigo";

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
  commercial_indigo: {
    id: "commercial_indigo",
    name: "Frosted Slate-Mist & Royal Indigo",
    paletteLabel: "Commercial Indigo",
    tagline: "Crisp pearl canvas (#F1F5F9), Frosted Slate-Mist sidebar (#EAEFF5), Royal Indigo accents",
    swatchPrimary: "#4f46e5",
    swatchSecondary: "#6366f1",
    canvasBg: "#F1F5F9",
    sidebarGradient: "bg-[#EAEFF5]",
    sidebarBorder: "border-slate-300/80",
    sidebarActiveBg: "bg-indigo-600",
    activePillGradient: "bg-indigo-600",
    activePillText: "text-white",
    activeBadge: "bg-indigo-50 text-indigo-700 border border-indigo-200/80",
    primaryBtn: "bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold shadow-xs",
    headerBorder: "border-slate-200/90",
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
  const [currentTheme, setCurrentThemeState] = useState<SRThemeKey>("commercial_indigo");

  // Read saved workspace from localStorage on mount & clean up experimental theme keys
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sr_workspace");
      if (saved) setCurrentWorkspaceState(saved);
      const savedCollapsed = localStorage.getItem("sr_sidebar_collapsed");
      if (savedCollapsed !== null) setIsCollapsed(savedCollapsed === "true");
      
      // Clear experimental multi-theme clutter so all users lock in Commercial Indigo
      localStorage.removeItem("sr_books_theme");
      document.documentElement.removeAttribute("data-theme");
      setCurrentThemeState("commercial_indigo");
    } catch (e) {
      // LocalStorage access safe fallback
    }
  }, []);

  const setCurrentTheme = (theme: SRThemeKey) => {
    setCurrentThemeState("commercial_indigo");
    try {
      localStorage.removeItem("sr_books_theme");
      document.documentElement.removeAttribute("data-theme");
    } catch (e) {}
  };

  const themeConfig = SR_THEMES.commercial_indigo;

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
      <div className="min-h-screen bg-[#F3F5F8] dark:bg-slate-950 flex transition-colors text-slate-900 dark:text-slate-100 antialiased">
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
