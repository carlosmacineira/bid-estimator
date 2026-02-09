"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  Package,
  Settings,
  Zap,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/estimates/new", label: "New Estimate", icon: PlusCircle },
  { href: "/materials", label: "Materials", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/[0.06] bg-white/[0.03] backdrop-blur-xl transition-all duration-300 ease-in-out"
      style={{ width: sidebarCollapsed ? 72 : 260 }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#CC0000]/15">
          <Zap className="h-5 w-5 text-[#CC0000]" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden animate-fade-in">
            <span className="text-sm font-semibold tracking-tight text-white/90">
              MS
            </span>
            <span className="ml-1 text-sm font-medium text-white/40">
              Electric
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#CC0000] shadow-[0_0_8px_rgba(204,0,0,0.5)]" />
              )}

              <item.icon
                className={`h-5 w-5 shrink-0 transition-colors duration-200 ${
                  isActive ? "text-[#CC0000]" : "text-white/40 group-hover:text-white/60"
                }`}
              />

              {!sidebarCollapsed && (
                <span className="truncate animate-fade-in">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section: user info + collapse toggle */}
      <div className="border-t border-white/[0.06] p-3">
        {/* User info */}
        <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#CC0000] to-[#8B0000] text-xs font-bold text-white shadow-[0_0_12px_rgba(204,0,0,0.3)]">
            MD
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden animate-fade-in">
              <p className="truncate text-sm font-medium text-white/85">
                Manuel Dominguez
              </p>
              <p className="truncate text-xs text-white/40">President</p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-lg py-2 text-white/30 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white/60"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
