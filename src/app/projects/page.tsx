"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  FolderKanban,
  Trash2,
  Copy,
  LayoutGrid,
  List,
  X,
  AlertTriangle,
  Package,
  Calendar,
  User,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Types ───────────────────────────────────────────────────────────── */

interface ProjectWithTotals {
  id: string;
  name: string;
  clientName: string;
  clientCompany: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: string;
  status: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { lineItems: number };
  totals?: {
    grandTotal: number;
    materialSubtotal: number;
    laborSubtotal: number;
  };
}

/* ─── Constants ───────────────────────────────────────────────────────── */

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400/80",
  submitted: "bg-yellow-500/20 text-yellow-400/80",
  won: "bg-emerald-500/20 text-emerald-400/80",
  lost: "bg-red-500/20 text-red-400/80",
};

const TYPE_COLORS: Record<string, string> = {
  residential: "bg-blue-500/20 text-blue-400/80",
  commercial: "bg-purple-500/20 text-purple-400/80",
  industrial: "bg-orange-500/20 text-orange-400/80",
};

/* ─── Helpers ─────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/* ─── Delete Confirmation Dialog ──────────────────────────────────────── */

function DeleteDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm glass animate-fade-in-up"
        style={{
          background: "rgba(20, 20, 20, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "1rem",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(204, 0, 0, 0.08)",
        }}
      >
        <div className="p-6">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>

          {/* Title & Message */}
          <h3
            id="delete-dialog-title"
            className="text-center text-base font-semibold text-white/95"
          >
            Delete this project?
          </h3>
          <p className="mt-2 text-center text-sm text-white/50 leading-relaxed">
            This will permanently remove the project and all of its line items.
            This action cannot be undone.
          </p>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              ref={cancelRef}
              onClick={onClose}
              disabled={loading}
              className="flex-1 min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.08] hover:text-white/90 active:scale-[0.97] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 min-h-[44px] rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-500 active:scale-[0.97] disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton Loader ─────────────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div
      className="glass p-5 space-y-4 animate-pulse"
      style={{ minHeight: "200px" }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-3/4 rounded-md bg-white/[0.06]" />
          <div className="h-3 w-1/2 rounded-md bg-white/[0.04]" />
        </div>
        <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
      </div>
      <div className="h-3 w-full rounded-md bg-white/[0.04]" />
      <div className="flex gap-2">
        <div className="h-5 w-20 rounded-full bg-white/[0.05]" />
        <div className="h-5 w-14 rounded-full bg-white/[0.04]" />
      </div>
      <div className="flex items-end justify-between pt-3 border-t border-white/[0.05]">
        <div className="h-3 w-24 rounded-md bg-white/[0.04]" />
        <div className="h-6 w-28 rounded-md bg-white/[0.06]" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="glass overflow-hidden">
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex gap-4 px-4 py-3 border-b border-white/5">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-3 flex-1 rounded bg-white/[0.06]" />
          ))}
        </div>
        {/* Rows */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex gap-4 px-4 py-4 border-b border-white/[0.03]"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((j) => (
              <div key={j} className="h-4 flex-1 rounded bg-white/[0.04]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Project Card ────────────────────────────────────────────────────── */

function ProjectCard({
  project,
  index,
  onNavigate,
  onDelete,
  onDuplicate,
}: {
  project: ProjectWithTotals;
  index: number;
  onNavigate: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onDuplicate: (e: React.MouseEvent, project: ProjectWithTotals) => void;
}) {
  return (
    <div
      onClick={() => onNavigate(project.id)}
      className="glass cursor-pointer transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] hover:border-white/[0.15] hover:bg-white/[0.08] group"
      style={{
        opacity: 0,
        animation: `fadeInUp 0.5s ease-out ${index * 75}ms forwards`,
      }}
    >
      {/* Card Content */}
      <div className="p-5">
        {/* Top row: name + status */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors leading-tight">
              {project.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <User className="w-3 h-3 text-white/30 shrink-0" />
              <p className="text-xs text-white/50 truncate">
                {project.clientName}
                {project.clientCompany && (
                  <span className="text-white/30"> / {project.clientCompany}</span>
                )}
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide whitespace-nowrap ${
              STATUS_COLORS[project.status] || "bg-gray-500/20 text-gray-400/80"
            }`}
          >
            {project.status}
          </span>
        </div>

        {/* Address */}
        <p className="text-[11px] text-white/35 mb-3 truncate leading-relaxed">
          {project.address}, {project.city}, {project.state} {project.zip}
        </p>

        {/* Badges: type + line items */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span
            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${
              TYPE_COLORS[project.type] || "bg-white/10 text-white/60"
            }`}
          >
            {project.type}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-white/35">
            <Package className="w-3 h-3" />
            {project._count?.lineItems || 0} item
            {(project._count?.lineItems || 0) !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Footer: date + grand total */}
        <div className="flex items-end justify-between pt-3 border-t border-white/[0.06]">
          <span className="flex items-center gap-1.5 text-[11px] text-white/35">
            <Calendar className="w-3 h-3" />
            {formatDate(project.createdAt)}
          </span>
          <span className="text-lg font-medium price text-[#CC0000]">
            {fmt(project.totals?.grandTotal || 0)}
          </span>
        </div>
      </div>

      {/* Actions bar -- always visible (mobile touch-friendly) */}
      <div className="flex border-t border-white/[0.06] divide-x divide-white/[0.06]">
        <button
          onClick={(e) => onDuplicate(e, project)}
          className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all active:bg-white/[0.08] text-xs"
          title="Duplicate project"
        >
          <Copy className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Duplicate</span>
        </button>
        <button
          onClick={(e) => onDelete(e, project.id)}
          className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] text-white/40 hover:text-red-400 hover:bg-red-500/[0.06] transition-all active:bg-red-500/[0.1] text-xs"
          title="Delete project"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Delete</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────── */

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Fetch projects from API */
  const fetchProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/projects?${params}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setProjects(data);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  /* Debounced search + immediate status filter */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProjects();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchProjects]);

  /* Delete handler -- opens dialog */
  const openDeleteDialog = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${deleteTarget}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Project deleted");
      setDeleteTarget(null);
      fetchProjects();
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  /* Duplicate handler */
  const handleDuplicate = async (
    e: React.MouseEvent,
    project: ProjectWithTotals
  ) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${project.name} (Copy)`,
          clientName: project.clientName,
          clientCompany: project.clientCompany,
          address: project.address,
          city: project.city,
          state: project.state,
          zip: project.zip,
          type: project.type,
          description: project.description,
        }),
      });
      if (!res.ok) throw new Error("Duplicate failed");
      toast.success("Project duplicated");
      fetchProjects();
    } catch {
      toast.error("Failed to duplicate project");
    }
  };

  /* Navigate to project */
  const navigateToProject = (id: string) => {
    router.push(`/projects/${id}`);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="animate-fade-in">
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white/95">
              Projects
            </h1>
            {!loading && (
              <p className="text-sm text-white/40 mt-1 tabular-nums">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            onClick={() => router.push("/estimates/new")}
            className="flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 bg-[#CC0000] hover:bg-[#E60000] text-white rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97] shadow-[0_2px_12px_rgba(204,0,0,0.3)] hover:shadow-[0_4px_20px_rgba(204,0,0,0.4)] sm:w-auto w-full"
          >
            <Plus className="w-4 h-4" />
            New Estimate
          </button>
        </div>

        {/* ── Search + Filter + View Toggle ──────────────────────── */}
        <div className="flex flex-col gap-3">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects, clients, addresses..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLoading(true);
              }}
              className="glass-input w-full min-h-[44px] h-11 pl-10 pr-10 text-sm rounded-xl"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setLoading(true);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter pills + view toggle row */}
          <div className="flex items-center justify-between gap-3">
            {/* Status filter pills -- horizontally scrollable on mobile */}
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <div className="flex gap-1.5 min-w-max pb-0.5">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      setStatusFilter(f.value);
                      setLoading(true);
                    }}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap active:scale-[0.96] ${
                      statusFilter === f.value
                        ? "bg-[#CC0000] text-white shadow-[0_2px_10px_rgba(204,0,0,0.3)]"
                        : "glass text-white/50 hover:text-white/70 hover:bg-white/[0.08]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* View toggle -- hidden on mobile (always grid) */}
            <div className="hidden md:flex glass rounded-xl overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`p-2.5 transition-all duration-200 ${
                  viewMode === "grid"
                    ? "bg-white/10 text-white"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`p-2.5 transition-all duration-200 ${
                  viewMode === "list"
                    ? "bg-white/10 text-white"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}

        {/* Loading state */}
        {loading ? (
          <>
            {/* Grid skeletons (mobile always, desktop depends on viewMode) */}
            <div
              className={`grid gap-4 ${
                viewMode === "list"
                  ? "grid-cols-1 md:hidden"
                  : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
              }`}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
            {/* Table skeleton (desktop list mode) */}
            {viewMode === "list" && (
              <div className="hidden md:block">
                <TableSkeleton />
              </div>
            )}
          </>
        ) : projects.length === 0 ? (
          /* ── Empty state ────────────────────────────────────────── */
          <div className="animate-fade-in-up">
            <div
              className="glass p-12 sm:p-16 text-center"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px dashed rgba(255, 255, 255, 0.1)",
              }}
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
                <FolderKanban className="w-8 h-8 text-white/15" />
              </div>
              <h3 className="text-base font-medium text-white/60">
                {search || statusFilter !== "all"
                  ? "No projects match your filters"
                  : "No projects yet"}
              </h3>
              <p className="text-sm text-white/30 mt-1.5 max-w-xs mx-auto leading-relaxed">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : "Get started by creating your first estimate. It only takes a minute."}
              </p>
              <button
                onClick={() => router.push("/estimates/new")}
                className="mt-6 inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 bg-[#CC0000] hover:bg-[#E60000] text-white rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97] shadow-[0_2px_12px_rgba(204,0,0,0.3)]"
              >
                <Plus className="w-4 h-4" />
                Create your first estimate
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Grid View ─────────────────────────────────────────── */}
            {/* On mobile: always show cards. On desktop: only if grid mode. */}
            <div
              className={`grid gap-4 ${
                viewMode === "list"
                  ? "grid-cols-1 md:hidden"
                  : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
              }`}
            >
              {projects.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={i}
                  onNavigate={navigateToProject}
                  onDelete={openDeleteDialog}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>

            {/* ── List View (table, desktop only) ───────────────────── */}
            {viewMode === "list" && (
              <div className="hidden md:block animate-fade-in">
                <div
                  className="glass overflow-hidden"
                  style={{ borderRadius: "1rem" }}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/35 uppercase tracking-wider">
                            Project
                          </th>
                          <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/35 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/35 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/35 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="text-center px-5 py-3.5 text-[11px] font-semibold text-white/35 uppercase tracking-wider">
                            Items
                          </th>
                          <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/35 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-white/35 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="w-24" />
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map((project, i) => (
                          <tr
                            key={project.id}
                            onClick={() => navigateToProject(project.id)}
                            className="border-b border-white/[0.03] hover:bg-white/[0.04] transition-all duration-200 cursor-pointer group"
                            style={{
                              opacity: 0,
                              animation: `fadeInUp 0.4s ease-out ${i * 50}ms forwards`,
                            }}
                          >
                            <td className="px-5 py-3.5">
                              <span className="text-sm font-medium text-white/85 group-hover:text-white transition-colors">
                                {project.name}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-white/55">
                                {project.clientName}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${
                                  TYPE_COLORS[project.type] ||
                                  "bg-white/10 text-white/60"
                                }`}
                              >
                                {project.type}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${
                                  STATUS_COLORS[project.status] ||
                                  "bg-gray-500/20 text-gray-400/80"
                                }`}
                              >
                                {project.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="text-xs text-white/40 tabular-nums">
                                {project._count?.lineItems || 0}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs text-white/40">
                                {formatDate(project.createdAt)}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="text-sm font-medium price text-[#CC0000]">
                                {fmt(project.totals?.grandTotal || 0)}
                              </span>
                            </td>
                            <td className="px-3 py-3.5">
                              <div className="flex gap-0.5 justify-end">
                                <button
                                  onClick={(e) => handleDuplicate(e, project)}
                                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-white/30 hover:text-white/70 transition-all"
                                  title="Duplicate project"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => openDeleteDialog(e, project.id)}
                                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all"
                                  title="Delete project"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Delete Confirmation Dialog ──────────────────────────── */}
      <DeleteDialog
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        loading={deleting}
      />

      {/* ── Utility styles (inline for self-containment) ────────── */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
