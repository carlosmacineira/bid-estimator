"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileDown,
  Plus,
  Trash2,
  Upload,
  FileText,
  DollarSign,
  Package,
  Wrench,
  AlertTriangle,
  Search,
  X,
  HardHat,
  TrendingUp,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ── helpers ── */
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const STATUS_OPTIONS = ["draft", "submitted", "won", "lost"];

const CATEGORIES = [
  "Wire",
  "Conduit",
  "Panels & Breakers",
  "Devices",
  "Boxes & Fittings",
  "Lighting",
  "Miscellaneous",
  "Labor Only",
  "Demolition",
];

const UNITS = ["each", "ft", "roll", "box", "pack", "lot", "set", "pair"];

const CATEGORY_COLORS: Record<string, string> = {
  Wire: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  Conduit: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  "Panels & Breakers": "bg-purple-500/15 text-purple-300 border-purple-500/20",
  Devices: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  "Boxes & Fittings": "bg-amber-500/15 text-amber-300 border-amber-500/20",
  Lighting: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  Miscellaneous: "bg-gray-500/15 text-gray-300 border-gray-500/20",
  "Labor Only": "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  Demolition: "bg-red-500/15 text-red-300 border-red-500/20",
};

/* ── interfaces ── */
interface LineItem {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  laborHours: number;
  laborRate: number | null;
  sortOrder: number;
}

interface ProjectDetail {
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
  overheadPct: number;
  profitPct: number;
  laborRate: number;
  notes: string | null;
  terms: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: LineItem[];
  documents: {
    id: string;
    fileName: string;
    fileSize: number;
    tag: string | null;
    createdAt: string;
  }[];
  totals: {
    materialSubtotal: number;
    laborSubtotal: number;
    demolitionSubtotal: number;
    directCost: number;
    overhead: number;
    subtotalWithOverhead: number;
    profit: number;
    grandTotal: number;
  };
}

function computeLineCosts(item: LineItem, projectLaborRate: number) {
  const rate = item.laborRate ?? projectLaborRate;
  const materialCost = item.quantity * item.unitPrice;
  const laborCost = item.laborHours * rate;
  return { materialCost, laborCost, lineTotal: materialCost + laborCost };
}

/* ── page component ── */
export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [materials, setMaterials] = useState<
    Array<{
      id: string;
      name: string;
      category: string;
      unit: string;
      unitPrice: number;
    }>
  >([]);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialQty, setMaterialQty] = useState(1);
  const [selectedMaterial, setSelectedMaterial] = useState<
    (typeof materials)[0] | null
  >(null);

  /* ── data fetching ── */
  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProject(data);
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  /* ── mutations ── */
  const updateProject = async (updates: Record<string, unknown>) => {
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchProject();
        toast.success("Project updated");
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const addLineItem = async (item: Partial<LineItem>) => {
    try {
      await fetch(`/api/projects/${id}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: item.description || "New Item",
          category: item.category || "Miscellaneous",
          quantity: item.quantity || 1,
          unit: item.unit || "each",
          unitPrice: item.unitPrice || 0,
          laborHours: item.laborHours || 0,
          laborRate: item.laborRate || null,
          sortOrder: project?.lineItems.length || 0,
        }),
      });
      fetchProject();
    } catch {
      toast.error("Failed to add item");
    }
  };

  const updateLineItem = async (itemId: string, updates: Partial<LineItem>) => {
    try {
      await fetch(`/api/projects/${id}/line-items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      fetchProject();
    } catch {
      toast.error("Failed to update item");
    }
  };

  const deleteLineItem = async (itemId: string) => {
    try {
      await fetch(`/api/projects/${id}/line-items/${itemId}`, {
        method: "DELETE",
      });
      fetchProject();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  /* ── exports ── */
  const handleExportExcel = async () => {
    try {
      const res = await fetch("/api/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.name || "estimate"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel downloaded");
    } catch {
      toast.error("Failed to export Excel");
    }
  };

  const handleExportPdf = async () => {
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.name || "estimate"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to export PDF");
    }
  };

  /* ── material picker ── */
  const openMaterialPicker = async () => {
    try {
      const res = await fetch("/api/materials");
      setMaterials(await res.json());
    } catch {
      /* empty */
    }
    setMaterialSearch("");
    setSelectedMaterial(null);
    setMaterialQty(1);
    setMaterialPickerOpen(true);
  };

  const confirmMaterialAdd = () => {
    if (!selectedMaterial) return;
    addLineItem({
      description: selectedMaterial.name,
      category: selectedMaterial.category,
      quantity: materialQty,
      unit: selectedMaterial.unit,
      unitPrice: selectedMaterial.unitPrice,
    });
    setMaterialPickerOpen(false);
  };

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white/5 rounded-lg animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-full max-w-sm bg-white/5 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  /* ── not found ── */
  if (!project) {
    return (
      <div className="px-4 py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <p className="text-white/50 text-lg mb-2">Project not found</p>
        <button
          onClick={() => router.push("/projects")}
          className="mt-2 px-4 py-2 text-sm text-[#CC0000] hover:text-[#E60000] transition-colors"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(materialSearch.toLowerCase())
  );

  /* ── render ── */
  return (
    <div className="px-4 py-5 sm:px-6 md:px-8 space-y-5 max-w-7xl mx-auto">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => router.push("/projects")}
            className="p-2.5 glass glass-hover rounded-xl text-white/50 hover:text-white/80 transition-all shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-light tracking-tight text-white/95 truncate">
              {project.name}
            </h1>
            <p className="text-sm text-white/50 mt-0.5 truncate">
              {project.clientName}
              {project.clientCompany && ` \u2014 ${project.clientCompany}`}
            </p>
          </div>
        </div>

        {/* Right: status + total */}
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <Select
            value={project.status}
            onValueChange={(v) => updateProject({ status: v })}
          >
            <SelectTrigger className="glass-input h-10 sm:h-9 px-3 text-xs w-[120px] min-h-[44px] sm:min-h-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl">
              {STATUS_OPTIONS.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="text-white/80 text-xs focus:bg-white/10 focus:text-white capitalize"
                >
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-white/30 block leading-none mb-1 hidden sm:block">
              Total
            </span>
            <span className="text-xl sm:text-2xl font-light price text-[#CC0000]">
              {fmt(project.totals.grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="glass p-1 h-auto gap-1 bg-transparent border-none w-full sm:w-auto flex overflow-x-auto no-scrollbar">
          {["overview", "estimate", "documents", "export"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="px-4 py-2.5 sm:py-2 text-xs font-medium rounded-xl capitalize
                data-[state=active]:bg-white/10 data-[state=active]:text-white
                data-[state=active]:shadow-sm
                text-white/50 transition-all flex-1 sm:flex-none
                min-h-[44px] sm:min-h-0"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══════════════════════════════════════════ */}
        {/* ─── Overview Tab ─── */}
        {/* ═══════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-5 animate-fade-in">
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 stagger">
            {[
              {
                label: "Materials",
                value: project.totals.materialSubtotal,
                icon: Package,
                color: "text-blue-400/70",
              },
              {
                label: "Labor",
                value: project.totals.laborSubtotal,
                icon: Wrench,
                color: "text-emerald-400/70",
              },
              {
                label: "Demo",
                value: project.totals.demolitionSubtotal,
                icon: AlertTriangle,
                color: "text-orange-400/70",
              },
              {
                label: "Overhead",
                value: project.totals.overhead,
                icon: Layers,
                color: "text-purple-400/70",
              },
              {
                label: "Profit",
                value: project.totals.profit,
                icon: TrendingUp,
                color: "text-yellow-400/70",
              },
              {
                label: "Grand Total",
                value: project.totals.grandTotal,
                icon: DollarSign,
                highlight: true,
                color: "text-[#CC0000]",
              },
            ].map((card) => (
              <div
                key={card.label}
                className={`glass p-4 transition-all ${
                  card.highlight
                    ? "red-glow border-[#CC0000]/20 col-span-2 sm:col-span-1"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                  <span className="text-[11px] text-white/50 uppercase tracking-wide">
                    {card.label}
                  </span>
                </div>
                <span
                  className={`text-lg font-light price block ${
                    card.highlight ? "text-[#CC0000]" : "text-white/90"
                  }`}
                >
                  {fmt(card.value)}
                </span>
              </div>
            ))}
          </div>

          {/* Project details + scope */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass p-5 space-y-4">
              <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-white/40" />
                Project Details
              </h3>
              <div className="space-y-3 text-sm">
                {[
                  {
                    label: "Address",
                    value: `${project.address}, ${project.city}, ${project.state} ${project.zip}`,
                  },
                  { label: "Type", value: project.type, capitalize: true },
                  {
                    label: "Overhead",
                    value: `${(project.overheadPct * 100).toFixed(1)}%`,
                    mono: true,
                  },
                  {
                    label: "Profit",
                    value: `${(project.profitPct * 100).toFixed(1)}%`,
                    mono: true,
                  },
                  {
                    label: "Labor Rate",
                    value: `${fmt(project.laborRate)}/hr`,
                    mono: true,
                  },
                  {
                    label: "Line Items",
                    value: String(project.lineItems.length),
                  },
                  {
                    label: "Created",
                    value: new Date(project.createdAt).toLocaleDateString(),
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4"
                  >
                    <span className="text-white/40 text-xs sm:text-sm shrink-0">
                      {row.label}
                    </span>
                    <span
                      className={`text-white/80 text-right ${
                        row.mono ? "price" : ""
                      } ${row.capitalize ? "capitalize" : ""}`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {project.description && (
              <div className="glass p-5 space-y-3">
                <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
                  <HardHat className="w-3.5 h-3.5 text-white/40" />
                  Scope of Work
                </h3>
                <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════ */}
        {/* ─── Estimate Tab ─── */}
        {/* ═══════════════════════════════════════════ */}
        <TabsContent value="estimate" className="space-y-4 animate-fade-in">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openMaterialPicker}
              className="flex items-center gap-2 px-4 py-2.5 glass glass-hover rounded-xl text-sm text-white/70 transition-all min-h-[44px]"
            >
              <Package className="w-4 h-4 text-blue-400/70" />
              <span className="hidden sm:inline">Add from</span> Materials
            </button>
            <button
              onClick={() => addLineItem({ category: "Miscellaneous" })}
              className="flex items-center gap-2 px-4 py-2.5 glass glass-hover rounded-xl text-sm text-white/70 transition-all min-h-[44px]"
            >
              <Plus className="w-4 h-4 text-emerald-400/70" />
              Custom Item
            </button>
            <button
              onClick={() =>
                addLineItem({
                  category: "Labor Only",
                  unitPrice: 0,
                  description: "Labor",
                })
              }
              className="flex items-center gap-2 px-4 py-2.5 glass glass-hover rounded-xl text-sm text-white/70 transition-all min-h-[44px]"
            >
              <Wrench className="w-4 h-4 text-orange-400/70" />
              Labor Only
            </button>
          </div>

          {/* ── Desktop Table (hidden on mobile) ── */}
          <div className="glass overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-3 py-3 text-[10px] text-white/40 uppercase font-medium tracking-wider w-[200px]">
                      Description
                    </th>
                    <th className="text-left px-3 py-3 text-[10px] text-white/40 uppercase font-medium tracking-wider w-[120px]">
                      Category
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] text-white/40 uppercase font-medium tracking-wider w-16">
                      Qty
                    </th>
                    <th className="text-left px-3 py-3 text-[10px] text-white/40 uppercase font-medium tracking-wider w-16">
                      Unit
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] text-white/40 uppercase font-medium tracking-wider w-24">
                      Unit $
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] text-white/40 uppercase font-medium tracking-wider w-16">
                      Hrs
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] text-white/40 uppercase font-medium tracking-wider w-20">
                      Rate
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] text-white/40 uppercase font-medium tracking-wider w-24">
                      Mat $
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] text-white/40 uppercase font-medium tracking-wider w-24">
                      Labor $
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] text-white/40 uppercase font-medium tracking-wider w-24">
                      Total
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {project.lineItems.map((item) => {
                    const costs = computeLineCosts(item, project.laborRate);
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-3 py-1.5">
                          <input
                            defaultValue={item.description}
                            onBlur={(e) => {
                              if (e.target.value !== item.description)
                                updateLineItem(item.id, {
                                  description: e.target.value,
                                });
                            }}
                            className="bg-transparent w-full text-white/90 outline-none text-xs"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <select
                            defaultValue={item.category}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                category: e.target.value,
                              })
                            }
                            className="bg-transparent text-white/60 outline-none text-xs w-full"
                          >
                            {CATEGORIES.map((c) => (
                              <option
                                key={c}
                                value={c}
                                className="bg-[#1a1a1a]"
                              >
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            defaultValue={item.quantity}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v !== item.quantity)
                                updateLineItem(item.id, { quantity: v });
                            }}
                            className="bg-transparent w-full text-right text-white/90 outline-none text-xs price"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <select
                            defaultValue={item.unit}
                            onChange={(e) =>
                              updateLineItem(item.id, { unit: e.target.value })
                            }
                            className="bg-transparent text-white/60 outline-none text-xs"
                          >
                            {UNITS.map((u) => (
                              <option
                                key={u}
                                value={u}
                                className="bg-[#1a1a1a]"
                              >
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={item.unitPrice}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v !== item.unitPrice)
                                updateLineItem(item.id, { unitPrice: v });
                            }}
                            className="bg-transparent w-full text-right text-white/90 outline-none text-xs price"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            step="0.5"
                            defaultValue={item.laborHours}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v !== item.laborHours)
                                updateLineItem(item.id, { laborHours: v });
                            }}
                            className="bg-transparent w-full text-right text-white/90 outline-none text-xs price"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={item.laborRate ?? project.laborRate}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v))
                                updateLineItem(item.id, { laborRate: v });
                            }}
                            className="bg-transparent w-full text-right text-white/50 outline-none text-xs price"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right price text-white/60">
                          {fmt(costs.materialCost)}
                        </td>
                        <td className="px-3 py-1.5 text-right price text-white/60">
                          {fmt(costs.laborCost)}
                        </td>
                        <td className="px-3 py-1.5 text-right price text-white/90 font-medium">
                          {fmt(costs.lineTotal)}
                        </td>
                        <td className="px-1 py-1.5">
                          <button
                            onClick={() => deleteLineItem(item.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Desktop totals footer */}
            <div className="border-t border-white/5 p-4 flex justify-end">
              <div className="space-y-1.5 text-sm w-72">
                <div className="flex justify-between">
                  <span className="text-white/50">Material Subtotal</span>
                  <span className="price text-white/80">
                    {fmt(project.totals.materialSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Labor Subtotal</span>
                  <span className="price text-white/80">
                    {fmt(project.totals.laborSubtotal)}
                  </span>
                </div>
                {project.totals.demolitionSubtotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Demolition</span>
                    <span className="price text-white/80">
                      {fmt(project.totals.demolitionSubtotal)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/5 pt-1.5">
                  <span className="text-white/60 font-medium">Direct Cost</span>
                  <span className="price text-white/90">
                    {fmt(project.totals.directCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">
                    Overhead ({(project.overheadPct * 100).toFixed(1)}%)
                  </span>
                  <span className="price text-white/80">
                    {fmt(project.totals.overhead)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">
                    Profit ({(project.profitPct * 100).toFixed(1)}%)
                  </span>
                  <span className="price text-white/80">
                    {fmt(project.totals.profit)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#CC0000]/20 pt-2 mt-1">
                  <span className="text-white/90 font-medium">Grand Total</span>
                  <span className="price text-xl text-[#CC0000] font-light">
                    {fmt(project.totals.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Mobile Line Item Cards (hidden on desktop) ── */}
          <div className="md:hidden space-y-3">
            {project.lineItems.length === 0 && (
              <div className="glass p-8 text-center">
                <Package className="w-10 h-10 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/40">
                  No line items yet. Add one above.
                </p>
              </div>
            )}

            {project.lineItems.map((item) => {
              const costs = computeLineCosts(item, project.laborRate);
              const catColor =
                CATEGORY_COLORS[item.category] || CATEGORY_COLORS["Miscellaneous"];
              return (
                <div
                  key={item.id}
                  className="glass p-4 space-y-3 transition-all"
                >
                  {/* Card header: description + delete */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        defaultValue={item.description}
                        onBlur={(e) => {
                          if (e.target.value !== item.description)
                            updateLineItem(item.id, {
                              description: e.target.value,
                            });
                        }}
                        className="bg-transparent w-full text-sm text-white/90 outline-none font-medium"
                      />
                    </div>
                    <button
                      onClick={() => deleteLineItem(item.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1 -mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Category badge */}
                  <div>
                    <select
                      defaultValue={item.category}
                      onChange={(e) =>
                        updateLineItem(item.id, { category: e.target.value })
                      }
                      className={`text-[11px] px-2 py-1 rounded-md border outline-none ${catColor} bg-transparent`}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-[#1a1a1a] text-white/80">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Editable fields: 2-col grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {/* Qty */}
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        defaultValue={item.quantity}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v !== item.quantity)
                            updateLineItem(item.id, { quantity: v });
                        }}
                        className="glass-input w-full h-10 px-3 text-sm price text-white/90"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">
                        Unit
                      </label>
                      <select
                        defaultValue={item.unit}
                        onChange={(e) =>
                          updateLineItem(item.id, { unit: e.target.value })
                        }
                        className="glass-input w-full h-10 px-3 text-sm text-white/70 outline-none appearance-none"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u} className="bg-[#1a1a1a]">
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Unit Price */}
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={item.unitPrice}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v !== item.unitPrice)
                            updateLineItem(item.id, { unitPrice: v });
                        }}
                        className="glass-input w-full h-10 px-3 text-sm price text-white/90"
                      />
                    </div>

                    {/* Hours */}
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">
                        Hours
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        defaultValue={item.laborHours}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v !== item.laborHours)
                            updateLineItem(item.id, { laborHours: v });
                        }}
                        className="glass-input w-full h-10 px-3 text-sm price text-white/90"
                      />
                    </div>

                    {/* Rate */}
                    <div className="col-span-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">
                        Labor Rate
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={item.laborRate ?? project.laborRate}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v))
                            updateLineItem(item.id, { laborRate: v });
                        }}
                        className="glass-input w-full h-10 px-3 text-sm price text-white/50"
                      />
                    </div>
                  </div>

                  {/* Computed costs row */}
                  <div className="border-t border-white/5 pt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-white/40 block mb-0.5">
                        Material
                      </span>
                      <span className="text-xs price text-white/70">
                        {fmt(costs.materialCost)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/40 block mb-0.5">
                        Labor
                      </span>
                      <span className="text-xs price text-white/70">
                        {fmt(costs.laborCost)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#CC0000]/70 block mb-0.5">
                        Total
                      </span>
                      <span className="text-sm price text-white/95 font-medium">
                        {fmt(costs.lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mobile totals footer */}
            <div className="glass p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Material Subtotal</span>
                <span className="price text-white/80">
                  {fmt(project.totals.materialSubtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Labor Subtotal</span>
                <span className="price text-white/80">
                  {fmt(project.totals.laborSubtotal)}
                </span>
              </div>
              {project.totals.demolitionSubtotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/50">Demolition</span>
                  <span className="price text-white/80">
                    {fmt(project.totals.demolitionSubtotal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/5 pt-2">
                <span className="text-white/60 font-medium">Direct Cost</span>
                <span className="price text-white/90">
                  {fmt(project.totals.directCost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">
                  Overhead ({(project.overheadPct * 100).toFixed(1)}%)
                </span>
                <span className="price text-white/80">
                  {fmt(project.totals.overhead)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">
                  Profit ({(project.profitPct * 100).toFixed(1)}%)
                </span>
                <span className="price text-white/80">
                  {fmt(project.totals.profit)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#CC0000]/20 pt-2.5 mt-1">
                <span className="text-white/90 font-medium">Grand Total</span>
                <span className="price text-xl text-[#CC0000] font-light">
                  {fmt(project.totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════ */}
        {/* ─── Documents Tab ─── */}
        {/* ═══════════════════════════════════════════ */}
        <TabsContent value="documents" className="space-y-4 animate-fade-in">
          {/* Upload area */}
          <div className="glass p-8 sm:p-10 border-2 border-dashed border-white/10 text-center hover:border-white/20 transition-colors cursor-pointer">
            <Upload className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/50">
              Drag & drop PDF plans here, or click to browse
            </p>
            <p className="text-xs text-white/30 mt-1">
              Supports PDF, JPG, PNG files
            </p>
          </div>

          {/* Document grid */}
          {project.documents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {project.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="glass glass-hover p-4 space-y-2 transition-all cursor-pointer"
                >
                  <FileText className="w-8 h-8 text-[#CC0000]/60" />
                  <p className="text-xs text-white/80 truncate font-medium">
                    {doc.fileName}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {(doc.fileSize / 1024).toFixed(0)} KB
                    {doc.tag && ` \u2022 ${doc.tag}`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass p-10 text-center">
              <FileText className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/40">No documents uploaded yet</p>
              <p className="text-xs text-white/25 mt-1">
                Upload plans, photos, or specs above
              </p>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════ */}
        {/* ─── Export Tab ─── */}
        {/* ═══════════════════════════════════════════ */}
        <TabsContent value="export" className="space-y-5 animate-fade-in">
          {/* Export action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={handleExportExcel}
              className="glass glass-hover p-5 sm:p-6 text-left transition-all hover:red-glow group min-h-[44px]"
            >
              <FileDown className="w-8 h-8 text-emerald-400/60 group-hover:text-emerald-400 transition-colors mb-3" />
              <h3 className="text-sm font-medium text-white/90 mb-1">
                Excel Estimate
              </h3>
              <p className="text-xs text-white/40">
                Full itemized workbook with linked formulas (.xlsx)
              </p>
            </button>
            <button
              onClick={handleExportPdf}
              className="glass glass-hover p-5 sm:p-6 text-left transition-all hover:red-glow group min-h-[44px]"
            >
              <FileDown className="w-8 h-8 text-red-400/60 group-hover:text-red-400 transition-colors mb-3" />
              <h3 className="text-sm font-medium text-white/90 mb-1">
                PDF Bid Summary
              </h3>
              <p className="text-xs text-white/40">
                Professional branded bid document (.pdf)
              </p>
            </button>
            <button
              disabled
              className="glass p-5 sm:p-6 text-left opacity-40 cursor-not-allowed"
            >
              <FileDown className="w-8 h-8 text-blue-400/60 mb-3" />
              <h3 className="text-sm font-medium text-white/90 mb-1">
                Proposal Letter
              </h3>
              <p className="text-xs text-white/40">Coming soon</p>
            </button>
          </div>

          {/* Quick summary */}
          <div className="glass p-5">
            <h3 className="text-sm font-medium text-white/70 mb-4">
              Estimate Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">
                  Materials
                </span>
                <span className="price text-white/80 text-sm">
                  {fmt(project.totals.materialSubtotal)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">
                  Labor
                </span>
                <span className="price text-white/80 text-sm">
                  {fmt(project.totals.laborSubtotal)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">
                  Markup
                </span>
                <span className="price text-white/80 text-sm">
                  {fmt(project.totals.overhead + project.totals.profit)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#CC0000]/60 uppercase tracking-wider block mb-1">
                  Grand Total
                </span>
                <span className="price text-xl text-[#CC0000]">
                  {fmt(project.totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════ */}
      {/* ─── Material Picker Modal ─── */}
      {/* ═══════════════════════════════════════════ */}
      <Dialog open={materialPickerOpen} onOpenChange={setMaterialPickerOpen}>
        <DialogContent className="glass border-white/10 bg-[#141414]/95 backdrop-blur-xl max-w-lg max-h-[80vh] sm:max-h-[70vh] overflow-hidden flex flex-col mx-4 sm:mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-light text-white/95">
              Add from Materials
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              placeholder="Search materials..."
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
              className="glass-input h-11 sm:h-10 pl-10 pr-3 text-sm w-full"
              autoFocus
            />
            {materialSearch && (
              <button
                onClick={() => setMaterialSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Material list */}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 -mx-1 px-1">
            {filteredMaterials.length === 0 && (
              <div className="py-8 text-center">
                <Package className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/30">No materials found</p>
              </div>
            )}
            {filteredMaterials.map((mat) => (
              <button
                key={mat.id}
                onClick={() => setSelectedMaterial(mat)}
                className={`w-full text-left px-3 py-3 sm:py-2.5 rounded-xl text-xs transition-all min-h-[44px] ${
                  selectedMaterial?.id === mat.id
                    ? "bg-[#CC0000]/15 border border-[#CC0000]/30"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-white/90 font-medium">{mat.name}</span>
                  <span className="price text-white/50 ml-2 shrink-0">
                    {fmt(mat.unitPrice)}/{mat.unit}
                  </span>
                </div>
                <span className="text-white/30 text-[11px]">{mat.category}</span>
              </button>
            ))}
          </div>

          {/* Selected material confirmation */}
          {selectedMaterial && (
            <div className="border-t border-white/5 pt-3 mt-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/70 truncate font-medium">
                  {selectedMaterial.name}
                </p>
                <p className="text-xs text-white/40">
                  {fmt(selectedMaterial.unitPrice)} / {selectedMaterial.unit}
                </p>
              </div>
              <div className="w-20 shrink-0">
                <Label className="text-[10px] text-white/40">Qty</Label>
                <Input
                  type="number"
                  value={materialQty}
                  onChange={(e) =>
                    setMaterialQty(parseFloat(e.target.value) || 1)
                  }
                  className="glass-input h-10 sm:h-8 px-2 text-xs price"
                />
              </div>
              <button
                onClick={confirmMaterialAdd}
                className="px-5 py-2.5 sm:py-2 bg-[#CC0000] hover:bg-[#E60000] text-white rounded-xl text-xs font-medium transition-all min-h-[44px] sm:min-h-0 shrink-0"
              >
                Add
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
