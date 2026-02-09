"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { useUIStore } from "@/stores/ui-store";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

  return (
    <TooltipProvider>
      {/* Background atmosphere orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main
        className="relative z-10 min-h-screen transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}
      >
        {children}
      </main>

      <Toaster />
    </TooltipProvider>
  );
}
