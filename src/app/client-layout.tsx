"use client";

import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { useUIStore } from "@/stores/ui-store";

/* ------------------------------------------------------------------ */
/*  Hook: detect whether we are at the md breakpoint (768px) or above */
/* ------------------------------------------------------------------ */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(e.matches);
    };

    /* Set initial value */
    handleChange(mql);

    /* Listen for changes */
    mql.addEventListener("change", handleChange as (e: MediaQueryListEvent) => void);
    return () =>
      mql.removeEventListener("change", handleChange as (e: MediaQueryListEvent) => void);
  }, []);

  return isDesktop;
}

/* ------------------------------------------------------------------ */
/*  Client layout                                                     */
/* ------------------------------------------------------------------ */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const isDesktop = useIsDesktop();

  /*
   * Desktop: margin-left matches the sidebar width (72px collapsed, 260px expanded).
   * Mobile:  no margin-left; instead, padding-bottom reserves space for the
   *          bottom tab bar (56px nav height + safe-area-inset-bottom).
   */
  const mainStyle: React.CSSProperties = isDesktop
    ? { marginLeft: sidebarCollapsed ? 72 : 260 }
    : { marginLeft: 0, paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" };

  return (
    <TooltipProvider>
      {/* Background atmosphere orbs (subtle) */}
      <div className="bg-orb bg-orb-1" aria-hidden="true" />
      <div className="bg-orb bg-orb-2" aria-hidden="true" />

      {/* Sidebar (desktop) + Bottom nav (mobile) */}
      <Sidebar />

      {/* Main content */}
      <main
        className="relative z-10 min-h-screen transition-all duration-300 ease-in-out"
        style={mainStyle}
      >
        {children}
      </main>

      <Toaster />
    </TooltipProvider>
  );
}
