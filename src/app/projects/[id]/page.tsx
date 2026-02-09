"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileDown,
  Plus,
  Trash2,
  Save,
  Upload,
  FileText,
  DollarSign,
  Clock,
  Package,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const STATUS_OPTIONS = ["draft", "submitted", "won", "lost"];
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-300",
  submitted: "bg-yellow-500/20 text-yellow-300",
  won: "bg-emerald-500/20 text-emerald-300",
  lost: "bg-red-500/20 text-red-300",
};

const CATEGORIES = [
  "Wire", "Conduit", "Panels & Breakers", "Devices",
  "Boxes & Fittings", "Lighting", "Miscellaneous", "Labor Only", "Demolition",
];
const UNITS = ["each", "ft", "roll", "box", "pack", "lot", "set", "pair"];

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
  documents: { id: string; fileName: string; fileSize: number; tag: string | null; createdAt: string }[];
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

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [materials, setMaterials] = useState<Array<{ id: string; name: string; category: string; unit: string; unitPrice: number }>>([]);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialQty, setMaterialQty] = useState(1);
  const [selectedMaterial, setSelectedMaterial] = useState<typeof materials[0] | null>(null);

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
          sortOrder: (project?.lineItems.length || 0),
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
      await fetch(`/api/projects/${id}/line-items/${itemId}`, { method: "DELETE" });
      fetchProject();
    } catch {
      toast.error("Failed to delete item");
    }
  };

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

  const openMaterialPicker = async () => {
    try {
      const res = await fetch("/api/materials");
      setMaterials(await res.json());
    } catch { /* empty */ }
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

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse" />
        <div className="h-12 w-full bg-white/5 rounded animate-pulse" />
        <div className="h-96 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/50">Project not found</p>
        <button onClick={() => router.push("/projects")} className="mt-3 text-sm text-[#CC0000] hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(materialSearch.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/projects")}
            className="p-2 glass glass-hover rounded-lg text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-light tracking-tight text-white/95">{project.name}</h1>
            <p className="text-sm text-white/50 mt-0.5">
              {project.clientName}
              {project.clientCompany && ` — ${project.clientCompany}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={project.status}
            onValueChange={(v) => updateProject({ status: v })}
          >
            <SelectTrigger className="glass-input h-9 px-3 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl">
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-white/80 text-xs focus:bg-white/10 focus:text-white capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-2xl font-light price text-[#CC0000]">{fmt(project.totals.grandTotal)}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="glass p-1 h-auto gap-1 bg-transparent border-none">
          {["overview", "estimate", "documents", "export"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="px-4 py-2 text-xs font-medium rounded-lg capitalize data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 transition-all"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 stagger">
            {[
              { label: "Materials", value: project.totals.materialSubtotal, icon: Package },
              { label: "Labor", value: project.totals.laborSubtotal, icon: Wrench },
              { label: "Demo", value: project.totals.demolitionSubtotal, icon: AlertTriangle },
              { label: "Overhead", value: project.totals.overhead, icon: DollarSign },
              { label: "Profit", value: project.totals.profit, icon: DollarSign },
              { label: "Grand Total", value: project.totals.grandTotal, icon: DollarSign, highlight: true },
            ].map((card) => (
              <div key={card.label} className={`glass p-4 ${card.highlight ? "red-glow border-[#CC0000]/20" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className={`w-3.5 h-3.5 ${card.highlight ? "text-[#CC0000]" : "text-white/40"}`} />
                  <span className="text-xs text-white/50">{card.label}</span>
                </div>
                <span className={`text-lg font-light price ${card.highlight ? "text-[#CC0000]" : "text-white/90"}`}>
                  {fmt(card.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass p-5 space-y-3">
              <h3 className="text-sm font-medium text-white/70">Project Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-white/40">Address</span><span className="text-white/80">{project.address}, {project.city}, {project.state} {project.zip}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Type</span><span className="text-white/80 capitalize">{project.type}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Overhead</span><span className="text-white/80 price">{(project.overheadPct * 100).toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-white/40">Profit</span><span className="text-white/80 price">{(project.profitPct * 100).toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-white/40">Labor Rate</span><span className="text-white/80 price">{fmt(project.laborRate)}/hr</span></div>
                <div className="flex justify-between"><span className="text-white/40">Line Items</span><span className="text-white/80">{project.lineItems.length}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Created</span><span className="text-white/80">{new Date(project.createdAt).toLocaleDateString()}</span></div>
              </div>
            </div>
            {project.description && (
              <div className="glass p-5 space-y-3">
                <h3 className="text-sm font-medium text-white/70">Scope of Work</h3>
                <p className="text-sm text-white/60 leading-relaxed">{project.description}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Estimate Tab */}
        <TabsContent value="estimate" className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={openMaterialPicker}
              className="flex items-center gap-2 px-4 py-2 glass glass-hover rounded-lg text-sm text-white/70 transition-all"
            >
              <Package className="w-4 h-4" /> Add from Materials
            </button>
            <button
              onClick={() => addLineItem({ category: "Miscellaneous" })}
              className="flex items-center gap-2 px-4 py-2 glass glass-hover rounded-lg text-sm text-white/70 transition-all"
            >
              <Plus className="w-4 h-4" /> Custom Item
            </button>
            <button
              onClick={() => addLineItem({ category: "Labor Only", unitPrice: 0, description: "Labor" })}
              className="flex items-center gap-2 px-4 py-2 glass glass-hover rounded-lg text-sm text-white/70 transition-all"
            >
              <Wrench className="w-4 h-4" /> Labor Only
            </button>
          </div>

          <div className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-3 py-2.5 text-white/40 uppercase font-medium w-[200px]">Description</th>
                    <th className="text-left px-3 py-2.5 text-white/40 uppercase font-medium w-[120px]">Category</th>
                    <th className="text-right px-3 py-2.5 text-white/40 uppercase font-medium w-16">Qty</th>
                    <th className="text-left px-3 py-2.5 text-white/40 uppercase font-medium w-16">Unit</th>
                    <th className="text-right px-3 py-2.5 text-white/40 uppercase font-medium w-24">Unit $</th>
                    <th className="text-right px-3 py-2.5 text-white/40 uppercase font-medium w-16">Hrs</th>
                    <th className="text-right px-3 py-2.5 text-white/40 uppercase font-medium w-20">Rate</th>
                    <th className="text-right px-3 py-2.5 text-white/40 uppercase font-medium w-24">Mat $</th>
                    <th className="text-right px-3 py-2.5 text-white/40 uppercase font-medium w-24">Labor $</th>
                    <th className="text-right px-3 py-2.5 text-white/40 uppercase font-medium w-24">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {project.lineItems.map((item) => {
                    const costs = computeLineCosts(item, project.laborRate);
                    return (
                      <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-3 py-1.5">
                          <input
                            defaultValue={item.description}
                            onBlur={(e) => {
                              if (e.target.value !== item.description) updateLineItem(item.id, { description: e.target.value });
                            }}
                            className="bg-transparent w-full text-white/90 outline-none text-xs"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <select
                            defaultValue={item.category}
                            onChange={(e) => updateLineItem(item.id, { category: e.target.value })}
                            className="bg-transparent text-white/60 outline-none text-xs w-full"
                          >
                            {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            defaultValue={item.quantity}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v !== item.quantity) updateLineItem(item.id, { quantity: v });
                            }}
                            className="bg-transparent w-full text-right text-white/90 outline-none text-xs price"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <select
                            defaultValue={item.unit}
                            onChange={(e) => updateLineItem(item.id, { unit: e.target.value })}
                            className="bg-transparent text-white/60 outline-none text-xs"
                          >
                            {UNITS.map((u) => <option key={u} value={u} className="bg-[#1a1a1a]">{u}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={item.unitPrice}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v !== item.unitPrice) updateLineItem(item.id, { unitPrice: v });
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
                              if (!isNaN(v) && v !== item.laborHours) updateLineItem(item.id, { laborHours: v });
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
                              if (!isNaN(v)) updateLineItem(item.id, { laborRate: v });
                            }}
                            className="bg-transparent w-full text-right text-white/50 outline-none text-xs price"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right price text-white/60">{fmt(costs.materialCost)}</td>
                        <td className="px-3 py-1.5 text-right price text-white/60">{fmt(costs.laborCost)}</td>
                        <td className="px-3 py-1.5 text-right price text-white/90 font-medium">{fmt(costs.lineTotal)}</td>
                        <td className="px-1 py-1.5">
                          <button
                            onClick={() => deleteLineItem(item.id)}
                            className="p-1 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
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

            {/* Totals Footer */}
            <div className="border-t border-white/5 p-4 flex justify-end">
              <div className="space-y-1.5 text-sm w-72">
                <div className="flex justify-between"><span className="text-white/50">Material Subtotal</span><span className="price text-white/80">{fmt(project.totals.materialSubtotal)}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Labor Subtotal</span><span className="price text-white/80">{fmt(project.totals.laborSubtotal)}</span></div>
                {project.totals.demolitionSubtotal > 0 && (
                  <div className="flex justify-between"><span className="text-white/50">Demolition</span><span className="price text-white/80">{fmt(project.totals.demolitionSubtotal)}</span></div>
                )}
                <div className="flex justify-between border-t border-white/5 pt-1.5"><span className="text-white/60 font-medium">Direct Cost</span><span className="price text-white/90">{fmt(project.totals.directCost)}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Overhead ({(project.overheadPct * 100).toFixed(1)}%)</span><span className="price text-white/80">{fmt(project.totals.overhead)}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Profit ({(project.profitPct * 100).toFixed(1)}%)</span><span className="price text-white/80">{fmt(project.totals.profit)}</span></div>
                <div className="flex justify-between border-t border-[#CC0000]/20 pt-2 mt-1">
                  <span className="text-white/90 font-medium">Grand Total</span>
                  <span className="price text-xl text-[#CC0000] font-light">{fmt(project.totals.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="glass p-8 border-2 border-dashed border-white/10 text-center">
            <Upload className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/50">Drag & drop PDF plans here, or click to browse</p>
            <p className="text-xs text-white/30 mt-1">Supports PDF, JPG, PNG files</p>
          </div>

          {project.documents.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {project.documents.map((doc) => (
                <div key={doc.id} className="glass p-4 space-y-2">
                  <FileText className="w-8 h-8 text-[#CC0000]/60" />
                  <p className="text-xs text-white/80 truncate">{doc.fileName}</p>
                  <p className="text-[10px] text-white/40">
                    {(doc.fileSize / 1024).toFixed(0)} KB
                    {doc.tag && ` • ${doc.tag}`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass p-8 text-center">
              <FileText className="w-10 h-10 text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/40">No documents uploaded yet</p>
            </div>
          )}
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleExportExcel}
              className="glass glass-hover p-6 text-left transition-all hover:red-glow group"
            >
              <FileDown className="w-8 h-8 text-emerald-400/60 group-hover:text-emerald-400 transition-colors mb-3" />
              <h3 className="text-sm font-medium text-white/90 mb-1">Excel Estimate</h3>
              <p className="text-xs text-white/40">Full itemized workbook with linked formulas (.xlsx)</p>
            </button>
            <button
              onClick={handleExportPdf}
              className="glass glass-hover p-6 text-left transition-all hover:red-glow group"
            >
              <FileDown className="w-8 h-8 text-red-400/60 group-hover:text-red-400 transition-colors mb-3" />
              <h3 className="text-sm font-medium text-white/90 mb-1">PDF Bid Summary</h3>
              <p className="text-xs text-white/40">Professional branded bid document (.pdf)</p>
            </button>
            <button className="glass glass-hover p-6 text-left transition-all hover:red-glow group opacity-50 cursor-not-allowed">
              <FileDown className="w-8 h-8 text-blue-400/60 mb-3" />
              <h3 className="text-sm font-medium text-white/90 mb-1">Proposal Letter</h3>
              <p className="text-xs text-white/40">Coming soon</p>
            </button>
          </div>

          {/* Quick Summary */}
          <div className="glass p-5">
            <h3 className="text-sm font-medium text-white/70 mb-3">Estimate Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><span className="text-xs text-white/40 block">Materials</span><span className="price text-white/80">{fmt(project.totals.materialSubtotal)}</span></div>
              <div><span className="text-xs text-white/40 block">Labor</span><span className="price text-white/80">{fmt(project.totals.laborSubtotal)}</span></div>
              <div><span className="text-xs text-white/40 block">Markup</span><span className="price text-white/80">{fmt(project.totals.overhead + project.totals.profit)}</span></div>
              <div><span className="text-xs text-white/40 block">Grand Total</span><span className="price text-xl text-[#CC0000]">{fmt(project.totals.grandTotal)}</span></div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Material Picker Modal */}
      <Dialog open={materialPickerOpen} onOpenChange={setMaterialPickerOpen}>
        <DialogContent className="glass border-white/10 bg-[#141414]/95 backdrop-blur-xl max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-light text-white/95">Add from Materials</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <input
              placeholder="Search materials..."
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
              className="glass-input h-10 pl-3 pr-3 text-sm w-full"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {filteredMaterials.map((mat) => (
              <button
                key={mat.id}
                onClick={() => setSelectedMaterial(mat)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                  selectedMaterial?.id === mat.id
                    ? "bg-[#CC0000]/20 border border-[#CC0000]/30"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-white/90">{mat.name}</span>
                  <span className="price text-white/50">{fmt(mat.unitPrice)}/{mat.unit}</span>
                </div>
                <span className="text-white/30">{mat.category}</span>
              </button>
            ))}
          </div>
          {selectedMaterial && (
            <div className="border-t border-white/5 pt-3 mt-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-white/70">{selectedMaterial.name}</p>
                <p className="text-xs text-white/40">{fmt(selectedMaterial.unitPrice)} / {selectedMaterial.unit}</p>
              </div>
              <div className="w-20">
                <Label className="text-[10px] text-white/40">Qty</Label>
                <Input
                  type="number"
                  value={materialQty}
                  onChange={(e) => setMaterialQty(parseFloat(e.target.value) || 1)}
                  className="glass-input h-8 px-2 text-xs price"
                />
              </div>
              <button
                onClick={confirmMaterialAdd}
                className="px-4 py-2 bg-[#CC0000] hover:bg-[#E60000] text-white rounded-lg text-xs font-medium transition-all"
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
