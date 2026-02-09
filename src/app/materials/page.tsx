"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Pencil, Trash2, Package, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "Wire",
  "Conduit",
  "Panels & Breakers",
  "Devices",
  "Boxes & Fittings",
  "Lighting",
  "Miscellaneous",
];

const UNITS = ["each", "ft", "roll", "box", "pack", "lot", "set", "pair"];

interface Material {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
}

interface MaterialForm {
  name: string;
  sku: string;
  category: string;
  unit: string;
  unitPrice: string;
}

const emptyForm: MaterialForm = {
  name: "",
  sku: "",
  category: "",
  unit: "each",
  unitPrice: "",
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchMaterials = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (activeCategory !== "All") params.set("category", activeCategory);
      const res = await fetch(`/api/materials?${params}`);
      const data = await res.json();
      setMaterials(data);
    } catch {
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (mat: Material) => {
    setEditingId(mat.id);
    setForm({
      name: mat.name,
      sku: mat.sku || "",
      category: mat.category,
      unit: mat.unit,
      unitPrice: mat.unitPrice.toString(),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category || !form.unitPrice) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku || null,
        category: form.category,
        unit: form.unit,
        unitPrice: parseFloat(form.unitPrice),
      };

      if (editingId) {
        await fetch(`/api/materials/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Material updated");
      } else {
        await fetch("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Material added");
      }
      setDialogOpen(false);
      fetchMaterials();
    } catch {
      toast.error("Failed to save material");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this material?")) return;
    try {
      await fetch(`/api/materials/${id}`, { method: "DELETE" });
      toast.success("Material deleted");
      fetchMaterials();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-white/95">Materials Database</h1>
          <p className="text-sm text-white/50 mt-1">
            {materials.length} materials across {CATEGORIES.length} categories
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#CC0000] hover:bg-[#E60000] text-white rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Add Material
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input h-10 pl-10 pr-3 text-sm w-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory("All")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === "All"
                ? "bg-[#CC0000] text-white"
                : "glass text-white/60 hover:text-white/80"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeCategory === cat
                  ? "bg-[#CC0000] text-white"
                  : "glass text-white/60 hover:text-white/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : materials.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 text-sm">No materials found</p>
            <p className="text-white/30 text-xs mt-1">Add materials or adjust your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Unit</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Unit Price</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((mat, i) => (
                  <tr
                    key={mat.id}
                    className={`border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors ${
                      i % 2 === 0 ? "" : "bg-white/[0.01]"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-white/90">{mat.name}</td>
                    <td className="px-4 py-3 text-sm text-white/50 price">{mat.sku || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full glass text-white/60">
                        {mat.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/50">{mat.unit}</td>
                    <td className="px-4 py-3 text-sm text-right price text-white/90">{formatPrice(mat.unitPrice)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(mat)}
                          className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(mat.id)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-white/10 bg-[#141414]/95 backdrop-blur-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-light text-white/95">
              {editingId ? "Edit Material" : "Add Material"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-white/50 mb-1.5 block">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="glass-input h-10 px-3 text-sm w-full"
                placeholder="e.g. 20A Duplex Receptacle"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-white/50 mb-1.5 block">SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="glass-input h-10 px-3 text-sm w-full"
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label className="text-xs text-white/50 mb-1.5 block">Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="glass-input h-10 px-3 text-sm w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-white/80 focus:bg-white/10 focus:text-white">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-white/50 mb-1.5 block">Unit *</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger className="glass-input h-10 px-3 text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl">
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u} className="text-white/80 focus:bg-white/10 focus:text-white">
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-white/50 mb-1.5 block">Unit Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                    className="glass-input h-10 pl-7 pr-3 text-sm w-full price"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="flex-1 px-4 py-2.5 glass glass-hover rounded-lg text-sm text-white/70 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#CC0000] hover:bg-[#E60000] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Add Material"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
