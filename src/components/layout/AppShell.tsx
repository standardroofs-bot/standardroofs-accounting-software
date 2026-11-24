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

interface SidebarContextType {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  currentWorkspace: string;
  setCurrentWorkspace: (ws: string) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within an AppShell");
  }
  return context;
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

  // Read saved workspace from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sr_workspace");
      if (saved) setCurrentWorkspaceState(saved);
      const savedCollapsed = localStorage.getItem("sr_sidebar_collapsed");
      if (savedCollapsed !== null) setIsCollapsed(savedCollapsed === "true");
    } catch (e) {
      // LocalStorage access safe fallback
    }
  }, []);

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
      }}
    >
      <SessionGuard />
      <div className="min-h-screen bg-[#E2E8F2] dark:bg-slate-950 flex transition-colors text-slate-900 dark:text-slate-100 antialiased">
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
            isCollapsed ? "lg:ml-20" : "lg:ml-64"
          } ml-0 w-full min-w-0`}
        >
          <Header />
          <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-x-hidden min-w-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
