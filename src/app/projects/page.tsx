"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  FolderKanban,
  Trash2,
  Copy,
  FileDown,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-300",
  submitted: "bg-yellow-500/20 text-yellow-300",
  won: "bg-emerald-500/20 text-emerald-300",
  lost: "bg-red-500/20 text-red-300",
};

const TYPE_COLORS: Record<string, string> = {
  residential: "bg-blue-500/20 text-blue-300",
  commercial: "bg-purple-500/20 text-purple-300",
  industrial: "bg-orange-500/20 text-orange-300",
};

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

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      setProjects(data);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this project and all its data?")) return;
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      toast.success("Project deleted");
      fetchProjects();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, project: ProjectWithTotals) => {
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
      if (res.ok) {
        toast.success("Project duplicated");
        fetchProjects();
      }
    } catch {
      toast.error("Failed to duplicate");
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-white/95">Projects</h1>
          <p className="text-sm text-white/50 mt-1">{projects.length} total projects</p>
        </div>
        <button
          onClick={() => router.push("/estimates/new")}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#CC0000] hover:bg-[#E60000] text-white rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New Estimate
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input h-10 pl-10 pr-3 text-sm w-full"
          />
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === f.value
                    ? "bg-[#CC0000] text-white"
                    : "glass text-white/60 hover:text-white/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex glass rounded-lg overflow-hidden ml-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${viewMode === "grid" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Project Cards / List */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass p-5 h-48 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass p-16 text-center">
          <FolderKanban className="w-14 h-14 text-white/15 mx-auto mb-4" />
          <p className="text-white/50 text-sm">No projects found</p>
          <p className="text-white/30 text-xs mt-1">Create your first estimate to get started</p>
          <button
            onClick={() => router.push("/estimates/new")}
            className="mt-4 px-5 py-2 bg-[#CC0000] hover:bg-[#E60000] text-white rounded-lg text-sm font-medium transition-all"
          >
            Create Estimate
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}`)}
              className="glass glass-hover p-5 cursor-pointer transition-all hover:red-glow group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">{project.clientName}</p>
                </div>
                <div className="flex gap-1.5 ml-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>
                    {project.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-white/40 mb-3 truncate">
                {project.address}, {project.city}, {project.state} {project.zip}
              </p>

              <div className="flex items-center gap-2 mb-4">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_COLORS[project.type]}`}>
                  {project.type}
                </span>
                <span className="text-xs text-white/30">{project._count?.lineItems || 0} items</span>
              </div>

              <div className="flex items-end justify-between pt-3 border-t border-white/[0.05]">
                <span className="text-xs text-white/40">{formatDate(project.createdAt)}</span>
                <span className="text-lg font-light price text-[#CC0000]">
                  {fmt(project.totals?.grandTotal || 0)}
                </span>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleDuplicate(e, project)}
                  className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, project.id)}
                  className="p-1.5 rounded-md hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase">Project</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase">Date</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm text-white/90">{project.name}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{project.clientName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_COLORS[project.type]}`}>
                      {project.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right price text-[#CC0000]">{fmt(project.totals?.grandTotal || 0)}</td>
                  <td className="px-4 py-3 text-xs text-white/40">{formatDate(project.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={(e) => handleDuplicate(e, project)}
                        className="p-1.5 rounded-md hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
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
      )}
    </div>
  );
}
