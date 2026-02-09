"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Plus, Pencil, Trash2, Package, X, Loader2 } from "lucide-react";
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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);

/* ------------------------------------------------------------------ */
/*  Inline delete‑confirmation hook                                    */
/* ------------------------------------------------------------------ */

function useInlineDelete(onConfirm: (id: string) => Promise<void>) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestDelete = (id: string) => {
    // First click – arm the confirmation
    if (pendingId === id) {
      // Second click – actually delete
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingId(null);
      onConfirm(id);
      return;
    }
    setPendingId(id);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPendingId(null), 3000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { pendingId, requestDelete };
}

/* ------------------------------------------------------------------ */
/*  Skeleton row / card                                                */
/* ------------------------------------------------------------------ */

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <div className="h-10 flex-1 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-10 w-20 bg-white/[0.04] rounded-lg animate-pulse hidden sm:block" />
          <div className="h-10 w-24 bg-white/[0.04] rounded-lg animate-pulse hidden md:block" />
          <div className="h-10 w-16 bg-white/[0.04] rounded-lg animate-pulse hidden lg:block" />
          <div className="h-10 w-20 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 p-4 sm:hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass p-4 space-y-3 animate-pulse">
          <div className="flex justify-between">
            <div className="h-4 w-36 bg-white/[0.06] rounded" />
            <div className="h-5 w-16 bg-white/[0.06] rounded-full" />
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-20 bg-white/[0.04] rounded" />
            <div className="h-3 w-12 bg-white/[0.04] rounded" />
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/[0.04]">
            <div className="h-5 w-16 bg-white/[0.06] rounded" />
            <div className="h-8 w-16 bg-white/[0.04] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  /* ---- Fetch ---------------------------------------------------- */

  const fetchMaterials = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (activeCategory !== "All") params.set("category", activeCategory);
      const res = await fetch(`/api/materials?${params}`);
      if (!res.ok) throw new Error();
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

  /* ---- CRUD ----------------------------------------------------- */

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
        const res = await fetch(`/api/materials/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("Material updated");
      } else {
        const res = await fetch("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
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

  const performDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Material deleted");
      fetchMaterials();
    } catch {
      toast.error("Failed to delete material");
    }
  };

  const { pendingId, requestDelete } = useInlineDelete(performDelete);

  /* ---- Category badge color map --------------------------------- */

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      Wire: "bg-blue-500/15 text-blue-300 border-blue-500/20",
      Conduit: "bg-orange-500/15 text-orange-300 border-orange-500/20",
      "Panels & Breakers": "bg-purple-500/15 text-purple-300 border-purple-500/20",
      Devices: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
      "Boxes & Fittings": "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
      Lighting: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
      Miscellaneous: "bg-gray-500/15 text-gray-300 border-gray-500/20",
    };
    return map[cat] ?? "bg-white/10 text-white/60 border-white/10";
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 space-y-5 max-w-[1400px] mx-auto">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-white/95">
            Materials Database
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {materials.length} material{materials.length !== 1 && "s"} across{" "}
            {CATEGORIES.length} categories
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 px-5 h-11 min-w-[44px] bg-[#CC0000] hover:bg-[#E60000] text-white rounded-xl text-sm font-medium transition-all active:scale-[0.97] shadow-lg shadow-red-900/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Material</span>
        </button>
      </div>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass-input h-11 w-full pl-10 pr-10 text-sm rounded-xl"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Category filter pills (horizontal scroll on mobile) ──── */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 min-w-max pb-1">
          {["All", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 h-9 min-w-[44px] rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? "bg-[#CC0000] text-white shadow-md shadow-red-900/20"
                  : "glass text-white/50 hover:text-white/80 hover:bg-white/[0.08]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="glass overflow-hidden">
        {loading ? (
          <>
            {/* Desktop skeleton */}
            <div className="hidden sm:block">
              <TableSkeleton />
            </div>
            {/* Mobile skeleton */}
            <CardSkeleton />
          </>
        ) : materials.length === 0 ? (
          /* ── Empty state ──────────────────────────────────────── */
          <div className="py-16 px-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.04] mb-4">
              <Package className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/50 text-sm font-medium">
              No materials found
            </p>
            <p className="text-white/30 text-xs mt-1.5 max-w-[240px] mx-auto">
              {search || activeCategory !== "All"
                ? "Try adjusting your search or filters"
                : "Add your first material to get started"}
            </p>
            {!search && activeCategory === "All" && (
              <button
                onClick={openAdd}
                className="mt-5 inline-flex items-center gap-2 px-5 h-10 bg-[#CC0000] hover:bg-[#E60000] text-white rounded-xl text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Material
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Desktop table (hidden on mobile) ─────────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-white/40 uppercase tracking-wider w-28">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((mat, i) => (
                    <tr
                      key={mat.id}
                      className={`border-b border-white/[0.03] transition-colors hover:bg-white/[0.03] ${
                        i % 2 === 0 ? "" : "bg-white/[0.015]"
                      }`}
                    >
                      <td className="px-5 py-3.5 text-sm text-white/90 font-medium">
                        {mat.name}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-white/40 price">
                        {mat.sku || "\u2014"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full border ${categoryColor(
                            mat.category
                          )}`}
                        >
                          {mat.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-white/50 capitalize">
                        {mat.unit}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right price text-white/90">
                        {formatPrice(mat.unitPrice)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(mat)}
                            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white/80 transition-colors"
                            aria-label={`Edit ${mat.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => requestDelete(mat.id)}
                            className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all ${
                              pendingId === mat.id
                                ? "bg-red-500/15 text-red-400 font-medium text-xs"
                                : "hover:bg-red-500/10 text-white/40 hover:text-red-400"
                            }`}
                            aria-label={
                              pendingId === mat.id
                                ? "Click again to confirm delete"
                                : `Delete ${mat.name}`
                            }
                          >
                            {pendingId === mat.id ? (
                              <span className="text-xs font-semibold">Sure?</span>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards (hidden on sm+) ─────────────────── */}
            <div className="sm:hidden divide-y divide-white/[0.04]">
              {materials.map((mat) => (
                <div
                  key={mat.id}
                  className="px-4 py-4 space-y-3 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Top: name + category badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/90 truncate">
                        {mat.name}
                      </p>
                      {mat.sku && (
                        <p className="text-xs text-white/35 price mt-0.5">
                          {mat.sku}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${categoryColor(
                        mat.category
                      )}`}
                    >
                      {mat.category}
                    </span>
                  </div>

                  {/* Bottom: unit + price + actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-3">
                      <span className="text-base font-medium price text-white/90">
                        {formatPrice(mat.unitPrice)}
                      </span>
                      <span className="text-xs text-white/35 capitalize">
                        / {mat.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(mat)}
                        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white/80 transition-colors"
                        aria-label={`Edit ${mat.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => requestDelete(mat.id)}
                        className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all ${
                          pendingId === mat.id
                            ? "bg-red-500/15 text-red-400"
                            : "hover:bg-red-500/10 text-white/40 hover:text-red-400"
                        }`}
                        aria-label={
                          pendingId === mat.id
                            ? "Click again to confirm delete"
                            : `Delete ${mat.name}`
                        }
                      >
                        {pendingId === mat.id ? (
                          <span className="text-xs font-semibold">Sure?</span>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Add / Edit Dialog ──────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/[0.08] bg-[#141414]/95 backdrop-blur-2xl sm:max-w-md rounded-2xl shadow-2xl shadow-black/50 p-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-0">
            <DialogHeader>
              <DialogTitle className="text-lg font-light text-white/95 tracking-tight">
                {editingId ? "Edit Material" : "Add Material"}
              </DialogTitle>
              <p className="text-xs text-white/40 mt-1">
                {editingId
                  ? "Update the material details below"
                  : "Fill in the details for the new material"}
              </p>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="px-6 pb-6 pt-5 space-y-5">
            {/* Name */}
            <div>
              <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                Name <span className="text-red-400">*</span>
              </Label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="glass-input h-11 px-3.5 text-sm w-full rounded-xl"
                placeholder="e.g. 20A Duplex Receptacle"
              />
            </div>

            {/* SKU + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                  SKU
                </Label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="glass-input h-11 px-3.5 text-sm w-full rounded-xl"
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                  Category <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger className="glass-input h-11 px-3.5 text-sm w-full rounded-xl">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.08] bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-xl">
                    {CATEGORIES.map((cat) => (
                      <SelectItem
                        key={cat}
                        value={cat}
                        className="text-white/80 focus:bg-white/[0.08] focus:text-white rounded-lg"
                      >
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Unit + Unit Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                  Unit <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm({ ...form, unit: v })}
                >
                  <SelectTrigger className="glass-input h-11 px-3.5 text-sm w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.08] bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-xl">
                    {UNITS.map((u) => (
                      <SelectItem
                        key={u}
                        value={u}
                        className="text-white/80 focus:bg-white/[0.08] focus:text-white rounded-lg capitalize"
                      >
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                  Unit Price <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.unitPrice}
                    onChange={(e) =>
                      setForm({ ...form, unitPrice: e.target.value })
                    }
                    className="glass-input h-11 pl-7 pr-3.5 text-sm w-full price rounded-xl"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDialogOpen(false)}
                className="flex-1 h-11 glass hover:bg-white/[0.08] rounded-xl text-sm text-white/60 hover:text-white/80 font-medium transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 bg-[#CC0000] hover:bg-[#E60000] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all active:scale-[0.97] shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Material"
                  : "Add Material"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
