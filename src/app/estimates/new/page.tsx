"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Trash2,
  Upload,
  FileDown,
  Save,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useEstimateStore } from "@/stores/estimate-store";
import {
  WIZARD_STEPS,
  LINE_ITEM_CATEGORIES,
  UNITS,
  PROJECT_TYPES,
  MATERIAL_CATEGORIES,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

// ---------------------------------------------------------------------------
// Material type from API
// ---------------------------------------------------------------------------

interface MaterialRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  unitPrice: number;
  sku?: string;
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function NewEstimatePage() {
  const router = useRouter();
  const store = useEstimateStore();

  const {
    currentStep,
    setStep,
    nextStep,
    prevStep,
    projectInfo,
    setProjectInfo,
    lineItems,
    addLineItem,
    updateLineItem,
    removeLineItem,
    overheadPct,
    setOverheadPct,
    profitPct,
    setProfitPct,
    laborRate,
    setLaborRate,
    notes,
    setNotes,
    terms,
    setTerms,
    savedProjectId,
    setSavedProjectId,
    getTotals,
    reset,
  } = store;

  // ---- Material picker state ----
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRecord | null>(null);
  const [materialQty, setMaterialQty] = useState(1);

  // ---- Save state ----
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ---- Totals (recomputed on every render via store) ----
  const totals = getTotals();

  // ------------------------------------------------------------------
  // Step validation
  // ------------------------------------------------------------------

  const canAdvance = useMemo(() => {
    if (currentStep === 1) {
      return (
        projectInfo.name.trim() !== "" &&
        projectInfo.clientName.trim() !== "" &&
        projectInfo.address.trim() !== ""
      );
    }
    return true;
  }, [currentStep, projectInfo]);

  // ------------------------------------------------------------------
  // Fetch materials
  // ------------------------------------------------------------------

  const fetchMaterials = useCallback(async () => {
    setMaterialsLoading(true);
    try {
      const res = await fetch("/api/materials");
      if (!res.ok) throw new Error("Failed to fetch materials");
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : data.materials ?? []);
    } catch {
      toast.error("Could not load materials list");
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  const openMaterialPicker = () => {
    setMaterialPickerOpen(true);
    setMaterialSearch("");
    setSelectedMaterial(null);
    setMaterialQty(1);
    fetchMaterials();
  };

  const filteredMaterials = useMemo(() => {
    const q = materialSearch.toLowerCase();
    if (!q) return materials;
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q) ||
        m.sku?.toLowerCase().includes(q)
    );
  }, [materials, materialSearch]);

  const confirmMaterialPick = () => {
    if (!selectedMaterial) return;
    addLineItem({
      description: selectedMaterial.name,
      category: selectedMaterial.category || "Miscellaneous",
      quantity: materialQty,
      unit: selectedMaterial.unit || "each",
      unitPrice: selectedMaterial.unitPrice ?? 0,
      laborHours: 0,
      laborRate: laborRate,
      materialId: selectedMaterial.id,
    });
    setMaterialPickerOpen(false);
    toast.success(`Added ${selectedMaterial.name}`);
  };

  // ------------------------------------------------------------------
  // Add custom / labor-only items
  // ------------------------------------------------------------------

  const addCustomItem = () => {
    addLineItem({
      description: "",
      category: "Miscellaneous",
      quantity: 1,
      unit: "each",
      unitPrice: 0,
      laborHours: 0,
      laborRate: laborRate,
      materialId: null,
    });
  };

  const addLaborOnlyItem = () => {
    addLineItem({
      description: "",
      category: "Labor Only",
      quantity: 1,
      unit: "each",
      unitPrice: 0,
      laborHours: 1,
      laborRate: laborRate,
      materialId: null,
    });
  };

  // ------------------------------------------------------------------
  // Save as Draft
  // ------------------------------------------------------------------

  const saveAsDraft = async () => {
    setSaving(true);
    try {
      // 1. Create the project
      const projRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...projectInfo,
          overheadPct,
          profitPct,
          laborRate,
          notes,
          terms,
          status: "draft",
        }),
      });
      if (!projRes.ok) throw new Error("Failed to create project");
      const proj = await projRes.json();
      const projectId: string = proj.id ?? proj.projectId ?? proj.data?.id;

      // 2. Save each line item
      for (const item of lineItems) {
        const liRes = await fetch(`/api/projects/${projectId}/line-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: item.description,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            laborHours: item.laborHours,
            laborRate: item.laborRate,
            materialId: item.materialId,
            sortOrder: item.sortOrder,
          }),
        });
        if (!liRes.ok) throw new Error("Failed to save line item");
      }

      setSavedProjectId(projectId);
      setSaved(true);
      toast.success("Estimate saved as draft!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------------
  // Export stubs
  // ------------------------------------------------------------------

  const downloadExcel = () => {
    toast.info("Excel export coming soon");
  };

  const downloadPdf = () => {
    toast.info("PDF export coming soon");
  };

  // ------------------------------------------------------------------
  // Reset on unmount? (optional: keep draft in zustand persist)
  // ------------------------------------------------------------------

  // ====================================================================
  // RENDER
  // ====================================================================

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* ============================================================= */}
      {/* STEP INDICATOR                                                */}
      {/* ============================================================= */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isComplete = currentStep > step.id;
            return (
              <div key={step.id} className="flex flex-1 items-center">
                {/* Dot / pill */}
                <button
                  type="button"
                  onClick={() => {
                    // Allow jumping back but not forward past current + 1
                    if (step.id <= currentStep) setStep(step.id);
                  }}
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[#CC0000] text-white shadow-lg shadow-red-900/40"
                      : isComplete
                      ? "bg-[#CC0000]/20 text-[#CC0000] ring-2 ring-[#CC0000]/40"
                      : "glass text-white/40"
                  }`}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : step.id}
                </button>

                {/* Label (hidden on small screens) */}
                <div className="ml-3 hidden md:block">
                  <p
                    className={`text-sm font-medium ${
                      isActive
                        ? "text-white"
                        : isComplete
                        ? "text-white/70"
                        : "text-white/30"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-white/30">{step.description}</p>
                </div>

                {/* Connector line */}
                {idx < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`mx-4 h-px flex-1 ${
                      isComplete ? "bg-[#CC0000]/40" : "bg-white/10"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================= */}
      {/* STEP CONTENT                                                  */}
      {/* ============================================================= */}
      <div className="glass rounded-2xl p-6 md:p-8">
        {/* ------- STEP 1: PROJECT INFO ------- */}
        {currentStep === 1 && (
          <StepProjectInfo
            projectInfo={projectInfo}
            setProjectInfo={setProjectInfo}
          />
        )}

        {/* ------- STEP 2: UPLOAD PLANS ------- */}
        {currentStep === 2 && <StepUploadPlans onSkip={nextStep} />}

        {/* ------- STEP 3: BUILD ESTIMATE ------- */}
        {currentStep === 3 && (
          <StepBuildEstimate
            lineItems={lineItems}
            laborRate={laborRate}
            updateLineItem={updateLineItem}
            removeLineItem={removeLineItem}
            openMaterialPicker={openMaterialPicker}
            addCustomItem={addCustomItem}
            addLaborOnlyItem={addLaborOnlyItem}
            totals={totals}
          />
        )}

        {/* ------- STEP 4: MARKUP & REVIEW ------- */}
        {currentStep === 4 && (
          <StepMarkupReview
            overheadPct={overheadPct}
            setOverheadPct={setOverheadPct}
            profitPct={profitPct}
            setProfitPct={setProfitPct}
            totals={totals}
            notes={notes}
            setNotes={setNotes}
            terms={terms}
            setTerms={setTerms}
          />
        )}

        {/* ------- STEP 5: EXPORT ------- */}
        {currentStep === 5 && (
          <StepExport
            projectInfo={projectInfo}
            lineItems={lineItems}
            totals={totals}
            overheadPct={overheadPct}
            profitPct={profitPct}
            saving={saving}
            saved={saved}
            savedProjectId={savedProjectId}
            saveAsDraft={saveAsDraft}
            downloadExcel={downloadExcel}
            downloadPdf={downloadPdf}
          />
        )}
      </div>

      {/* ============================================================= */}
      {/* NAVIGATION                                                    */}
      {/* ============================================================= */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="glass glass-hover inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white/70 transition-all disabled:pointer-events-none disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={!canAdvance}
            className="inline-flex items-center gap-2 rounded-lg bg-[#CC0000] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all hover:bg-[#E60000] disabled:opacity-40 disabled:pointer-events-none"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              reset();
              router.push("/projects");
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#CC0000] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all hover:bg-[#E60000]"
          >
            Finish &amp; Close
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ============================================================= */}
      {/* MATERIAL PICKER MODAL                                         */}
      {/* ============================================================= */}
      <Dialog open={materialPickerOpen} onOpenChange={setMaterialPickerOpen}>
        <DialogContent className="glass border-white/10 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              <Package className="mr-2 inline-block h-5 w-5 text-[#CC0000]" />
              Add Material
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input
              placeholder="Search materials..."
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
              className="glass-input pl-9"
            />
          </div>

          {/* Materials list */}
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-white/5 bg-black/20 p-2">
            {materialsLoading ? (
              <p className="py-8 text-center text-sm text-white/40">
                Loading materials...
              </p>
            ) : filteredMaterials.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/40">
                No materials found
              </p>
            ) : (
              filteredMaterials.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMaterial(m)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                    selectedMaterial?.id === m.id
                      ? "bg-[#CC0000]/20 ring-1 ring-[#CC0000]/40"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div>
                    <p className="font-medium text-white/90">{m.name}</p>
                    <p className="text-xs text-white/40">
                      {m.category}
                      {m.sku ? ` \u00B7 ${m.sku}` : ""}
                    </p>
                  </div>
                  <span className="price text-sm text-white/70">
                    {fmt(m.unitPrice)}/{m.unit}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Selected material + quantity */}
          {selectedMaterial && (
            <div className="flex items-end gap-4 rounded-lg border border-white/5 bg-black/20 p-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-white/90">
                  {selectedMaterial.name}
                </p>
                <p className="price text-xs text-white/50">
                  {fmt(selectedMaterial.unitPrice)} per {selectedMaterial.unit}
                </p>
              </div>
              <div className="w-28">
                <Label className="text-xs text-white/50">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={materialQty}
                  onChange={(e) =>
                    setMaterialQty(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="glass-input"
                />
              </div>
              <button
                type="button"
                onClick={confirmMaterialPick}
                className="inline-flex items-center gap-2 rounded-lg bg-[#CC0000] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#E60000]"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// STEP 1 - PROJECT INFO
// ============================================================================

interface StepProjectInfoProps {
  projectInfo: {
    name: string;
    clientName: string;
    clientCompany: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    type: "residential" | "commercial" | "industrial";
    description: string;
  };
  setProjectInfo: (info: Partial<StepProjectInfoProps["projectInfo"]>) => void;
}

function StepProjectInfo({ projectInfo, setProjectInfo }: StepProjectInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Project Information</h2>
        <p className="mt-1 text-sm text-white/50">
          Enter the basic details for this estimate.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Project Name */}
        <div className="md:col-span-2">
          <Label className="mb-1.5 text-white/70">
            Project Name <span className="text-[#CC0000]">*</span>
          </Label>
          <Input
            placeholder="e.g. Office Rewire - 123 Main St"
            value={projectInfo.name}
            onChange={(e) => setProjectInfo({ name: e.target.value })}
            className="glass-input"
          />
        </div>

        {/* Client Name */}
        <div>
          <Label className="mb-1.5 text-white/70">
            Client Name <span className="text-[#CC0000]">*</span>
          </Label>
          <Input
            placeholder="John Smith"
            value={projectInfo.clientName}
            onChange={(e) => setProjectInfo({ clientName: e.target.value })}
            className="glass-input"
          />
        </div>

        {/* Client Company */}
        <div>
          <Label className="mb-1.5 text-white/70">Client Company</Label>
          <Input
            placeholder="ABC Corp (optional)"
            value={projectInfo.clientCompany}
            onChange={(e) => setProjectInfo({ clientCompany: e.target.value })}
            className="glass-input"
          />
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <Label className="mb-1.5 text-white/70">
            Project Address <span className="text-[#CC0000]">*</span>
          </Label>
          <Input
            placeholder="123 Main Street"
            value={projectInfo.address}
            onChange={(e) => setProjectInfo({ address: e.target.value })}
            className="glass-input"
          />
        </div>

        {/* City */}
        <div>
          <Label className="mb-1.5 text-white/70">City</Label>
          <Input
            placeholder="Miami"
            value={projectInfo.city}
            onChange={(e) => setProjectInfo({ city: e.target.value })}
            className="glass-input"
          />
        </div>

        {/* State */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 text-white/70">State</Label>
            <Input
              placeholder="FL"
              maxLength={2}
              value={projectInfo.state}
              onChange={(e) =>
                setProjectInfo({ state: e.target.value.toUpperCase() })
              }
              className="glass-input"
            />
          </div>
          <div>
            <Label className="mb-1.5 text-white/70">ZIP</Label>
            <Input
              placeholder="33101"
              maxLength={10}
              value={projectInfo.zip}
              onChange={(e) => setProjectInfo({ zip: e.target.value })}
              className="glass-input"
            />
          </div>
        </div>

        {/* Project Type (segmented buttons) */}
        <div className="md:col-span-2">
          <Label className="mb-2 text-white/70">Project Type</Label>
          <div className="inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
            {PROJECT_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() =>
                  setProjectInfo({
                    type: pt.value as "residential" | "commercial" | "industrial",
                  })
                }
                className={`rounded-md px-5 py-2 text-sm font-medium transition-all ${
                  projectInfo.type === pt.value
                    ? "bg-[#CC0000] text-white shadow"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <Label className="mb-1.5 text-white/70">Description / Scope</Label>
          <Textarea
            placeholder="Brief description of the project scope..."
            rows={4}
            value={projectInfo.description}
            onChange={(e) => setProjectInfo({ description: e.target.value })}
            className="glass-input"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 2 - UPLOAD PLANS
// ============================================================================

function StepUploadPlans({ onSkip }: { onSkip: () => void }) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Upload Plans</h2>
        <p className="mt-1 text-sm text-white/50">
          Upload electrical drawings, panel schedules, or specs. You can skip
          this step and add them later.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          toast.info("File uploads will be available soon");
        }}
        className={`flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
          isDragging
            ? "border-[#CC0000] bg-[#CC0000]/5"
            : "border-white/15 bg-white/[0.02]"
        }`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
          <Upload className="h-7 w-7 text-white/30" />
        </div>
        <p className="mt-4 text-sm font-medium text-white/60">
          Drag &amp; drop files here, or{" "}
          <span className="cursor-pointer text-[#CC0000] hover:underline">
            browse
          </span>
        </p>
        <p className="mt-1 text-xs text-white/30">
          PDF, DWG, DXF, or image files up to 50 MB
        </p>
      </div>

      {/* Skip link */}
      <div className="text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-white/40 transition-colors hover:text-white/70"
        >
          Skip this step &rarr;
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 3 - BUILD ESTIMATE
// ============================================================================

interface StepBuildEstimateProps {
  lineItems: {
    tempId: string;
    description: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    laborHours: number;
    laborRate: number;
    materialId: string | null;
    sortOrder: number;
  }[];
  laborRate: number;
  updateLineItem: (
    tempId: string,
    updates: Partial<StepBuildEstimateProps["lineItems"][0]>
  ) => void;
  removeLineItem: (tempId: string) => void;
  openMaterialPicker: () => void;
  addCustomItem: () => void;
  addLaborOnlyItem: () => void;
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

function StepBuildEstimate({
  lineItems,
  laborRate,
  updateLineItem,
  removeLineItem,
  openMaterialPicker,
  addCustomItem,
  addLaborOnlyItem,
  totals,
}: StepBuildEstimateProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Build Estimate</h2>
          <p className="mt-1 text-sm text-white/50">
            Add materials, labor, and custom items to your estimate.
          </p>
        </div>

        {/* Add item buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openMaterialPicker}
            className="inline-flex items-center gap-2 rounded-lg bg-[#CC0000] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#E60000]"
          >
            <Package className="h-4 w-4" />
            Add from Materials
          </button>
          <button
            type="button"
            onClick={addCustomItem}
            className="glass glass-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Custom Item
          </button>
          <button
            type="button"
            onClick={addLaborOnlyItem}
            className="glass glass-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Labor Only
          </button>
        </div>
      </div>

      {/* Line Items Table */}
      {lineItems.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
          <Package className="h-10 w-10 text-white/15" />
          <p className="mt-3 text-sm text-white/40">
            No items yet. Add materials or custom items above.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
                <th className="px-3 py-3 font-medium">Description</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="w-20 px-3 py-3 font-medium text-right">Qty</th>
                <th className="w-20 px-3 py-3 font-medium">Unit</th>
                <th className="w-28 px-3 py-3 font-medium text-right">
                  Unit Price
                </th>
                <th className="w-20 px-3 py-3 font-medium text-right">
                  Labor Hrs
                </th>
                <th className="w-28 px-3 py-3 font-medium text-right">
                  Labor Rate
                </th>
                <th className="w-28 px-3 py-3 font-medium text-right">
                  Material $
                </th>
                <th className="w-28 px-3 py-3 font-medium text-right">
                  Labor $
                </th>
                <th className="w-28 px-3 py-3 font-medium text-right">Total</th>
                <th className="w-10 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => {
                const materialCost = item.quantity * item.unitPrice;
                const laborCost = item.laborHours * (item.laborRate || laborRate);
                const lineTotal = materialCost + laborCost;

                return (
                  <tr
                    key={item.tempId}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                  >
                    {/* Description */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(item.tempId, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Item description"
                        className="w-full min-w-[160px] bg-transparent text-sm text-white/90 placeholder:text-white/20 outline-none focus:bg-white/[0.03] rounded px-1 py-0.5 transition-colors"
                      />
                    </td>

                    {/* Category */}
                    <td className="px-3 py-2">
                      <select
                        value={item.category}
                        onChange={(e) =>
                          updateLineItem(item.tempId, {
                            category: e.target.value,
                          })
                        }
                        className="w-full min-w-[110px] bg-transparent text-sm text-white/70 outline-none focus:bg-white/[0.03] rounded px-1 py-0.5 transition-colors cursor-pointer"
                      >
                        {LINE_ITEM_CATEGORIES.map((c) => (
                          <option
                            key={c}
                            value={c}
                            className="bg-neutral-900 text-white"
                          >
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Qty */}
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.tempId, {
                            quantity: Number(e.target.value) || 0,
                          })
                        }
                        className="price w-full bg-transparent text-right text-sm text-white/90 outline-none focus:bg-white/[0.03] rounded px-1 py-0.5 transition-colors"
                      />
                    </td>

                    {/* Unit */}
                    <td className="px-3 py-2">
                      <select
                        value={item.unit}
                        onChange={(e) =>
                          updateLineItem(item.tempId, { unit: e.target.value })
                        }
                        className="w-full bg-transparent text-sm text-white/70 outline-none focus:bg-white/[0.03] rounded px-1 py-0.5 transition-colors cursor-pointer"
                      >
                        {UNITS.map((u) => (
                          <option
                            key={u.value}
                            value={u.value}
                            className="bg-neutral-900 text-white"
                          >
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Unit Price */}
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(item.tempId, {
                            unitPrice: Number(e.target.value) || 0,
                          })
                        }
                        className="price w-full bg-transparent text-right text-sm text-white/90 outline-none focus:bg-white/[0.03] rounded px-1 py-0.5 transition-colors"
                      />
                    </td>

                    {/* Labor Hrs */}
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.25"
                        value={item.laborHours}
                        onChange={(e) =>
                          updateLineItem(item.tempId, {
                            laborHours: Number(e.target.value) || 0,
                          })
                        }
                        className="price w-full bg-transparent text-right text-sm text-white/90 outline-none focus:bg-white/[0.03] rounded px-1 py-0.5 transition-colors"
                      />
                    </td>

                    {/* Labor Rate */}
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.laborRate || laborRate}
                        onChange={(e) =>
                          updateLineItem(item.tempId, {
                            laborRate: Number(e.target.value) || 0,
                          })
                        }
                        className="price w-full bg-transparent text-right text-sm text-white/90 outline-none focus:bg-white/[0.03] rounded px-1 py-0.5 transition-colors"
                      />
                    </td>

                    {/* Material $ (computed) */}
                    <td className="price px-3 py-2 text-right text-white/60">
                      {fmt(materialCost)}
                    </td>

                    {/* Labor $ (computed) */}
                    <td className="price px-3 py-2 text-right text-white/60">
                      {fmt(laborCost)}
                    </td>

                    {/* Total (computed) */}
                    <td className="price px-3 py-2 text-right font-medium text-white/90">
                      {fmt(lineTotal)}
                    </td>

                    {/* Delete */}
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.tempId)}
                        className="rounded p-1 text-white/25 transition-colors hover:bg-red-500/10 hover:text-[#CC0000]"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Sticky totals footer */}
          <div className="sticky bottom-0 flex items-center justify-end gap-8 border-t border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-white/40">
                Material Subtotal
              </p>
              <p className="price text-sm font-semibold text-white/80">
                {fmt(totals.materialSubtotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-white/40">
                Labor Subtotal
              </p>
              <p className="price text-sm font-semibold text-white/80">
                {fmt(totals.laborSubtotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-white/40">
                Direct Cost
              </p>
              <p className="price text-base font-bold text-white">
                {fmt(totals.directCost)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STEP 4 - MARKUP & REVIEW
// ============================================================================

interface StepMarkupReviewProps {
  overheadPct: number;
  setOverheadPct: (v: number) => void;
  profitPct: number;
  setProfitPct: (v: number) => void;
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
  notes: string;
  setNotes: (v: string) => void;
  terms: string;
  setTerms: (v: string) => void;
}

function StepMarkupReview({
  overheadPct,
  setOverheadPct,
  profitPct,
  setProfitPct,
  totals,
  notes,
  setNotes,
  terms,
  setTerms,
}: StepMarkupReviewProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white">Markup &amp; Review</h2>
        <p className="mt-1 text-sm text-white/50">
          Set overhead and profit margins, then review the full breakdown.
        </p>
      </div>

      {/* Markup inputs */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label className="mb-1.5 text-white/70">Overhead %</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={(overheadPct * 100).toFixed(1)}
              onChange={(e) =>
                setOverheadPct((Number(e.target.value) || 0) / 100)
              }
              className="glass-input w-28 text-right"
            />
            <span className="text-sm text-white/40">%</span>
          </div>
        </div>
        <div>
          <Label className="mb-1.5 text-white/70">Profit %</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={(profitPct * 100).toFixed(1)}
              onChange={(e) =>
                setProfitPct((Number(e.target.value) || 0) / 100)
              }
              className="glass-input w-28 text-right"
            />
            <span className="text-sm text-white/40">%</span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="rounded-xl border border-white/5 bg-black/20 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
          Cost Breakdown
        </h3>

        <div className="space-y-3">
          <BreakdownRow
            label="Material Subtotal"
            value={totals.materialSubtotal}
          />
          <BreakdownRow label="Labor Subtotal" value={totals.laborSubtotal} />
          <BreakdownRow
            label="Demolition Subtotal"
            value={totals.demolitionSubtotal}
          />

          <div className="my-4 h-px bg-white/10" />

          <BreakdownRow
            label="Direct Cost"
            value={totals.directCost}
            bold
          />
          <BreakdownRow
            label={`Overhead (${pct(overheadPct)})`}
            value={totals.overhead}
          />
          <BreakdownRow
            label="Subtotal with Overhead"
            value={totals.subtotalWithOverhead}
          />
          <BreakdownRow
            label={`Profit (${pct(profitPct)})`}
            value={totals.profit}
          />

          <div className="my-4 h-px bg-[#CC0000]/30" />

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-white">GRAND TOTAL</span>
            <span className="price text-2xl font-bold text-[#CC0000]">
              {fmt(totals.grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label className="mb-1.5 text-white/70">Notes</Label>
          <Textarea
            placeholder="Additional notes for this estimate..."
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="glass-input"
          />
        </div>
        <div>
          <Label className="mb-1.5 text-white/70">Terms &amp; Conditions</Label>
          <Textarea
            placeholder="Payment terms, warranty info, etc."
            rows={5}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="glass-input"
          />
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={`text-sm ${
          bold ? "font-semibold text-white" : "text-white/60"
        }`}
      >
        {label}
      </span>
      <span
        className={`price text-sm ${
          bold ? "font-semibold text-white" : "text-white/70"
        }`}
      >
        {fmt(value)}
      </span>
    </div>
  );
}

// ============================================================================
// STEP 5 - EXPORT
// ============================================================================

interface StepExportProps {
  projectInfo: {
    name: string;
    clientName: string;
    clientCompany: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    type: string;
    description: string;
  };
  lineItems: {
    tempId: string;
    description: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    laborHours: number;
    laborRate: number;
    materialId: string | null;
    sortOrder: number;
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
  overheadPct: number;
  profitPct: number;
  saving: boolean;
  saved: boolean;
  savedProjectId: string | null;
  saveAsDraft: () => void;
  downloadExcel: () => void;
  downloadPdf: () => void;
}

function StepExport({
  projectInfo,
  lineItems,
  totals,
  overheadPct,
  profitPct,
  saving,
  saved,
  savedProjectId,
  saveAsDraft,
  downloadExcel,
  downloadPdf,
}: StepExportProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white">Export Estimate</h2>
        <p className="mt-1 text-sm text-white/50">
          Review your estimate summary and save or export.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-white/5 bg-black/20 p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: project info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Project
            </h3>
            <p className="text-lg font-semibold text-white">
              {projectInfo.name || "Untitled"}
            </p>
            <p className="text-sm text-white/60">
              {projectInfo.clientName}
              {projectInfo.clientCompany
                ? ` \u2014 ${projectInfo.clientCompany}`
                : ""}
            </p>
            <p className="text-sm text-white/40">
              {[
                projectInfo.address,
                projectInfo.city,
                projectInfo.state,
                projectInfo.zip,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p className="text-xs uppercase text-white/30">
              {projectInfo.type} &middot; {lineItems.length} line item
              {lineItems.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Right: totals */}
          <div className="space-y-2 text-right">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Totals
            </h3>
            <div className="space-y-1">
              <p className="text-sm text-white/50">
                Materials:{" "}
                <span className="price text-white/70">
                  {fmt(totals.materialSubtotal)}
                </span>
              </p>
              <p className="text-sm text-white/50">
                Labor:{" "}
                <span className="price text-white/70">
                  {fmt(totals.laborSubtotal)}
                </span>
              </p>
              <p className="text-sm text-white/50">
                Demolition:{" "}
                <span className="price text-white/70">
                  {fmt(totals.demolitionSubtotal)}
                </span>
              </p>
              <div className="my-2 h-px bg-white/10" />
              <p className="text-sm text-white/50">
                Direct Cost:{" "}
                <span className="price font-medium text-white/80">
                  {fmt(totals.directCost)}
                </span>
              </p>
              <p className="text-sm text-white/50">
                Overhead ({pct(overheadPct)}):{" "}
                <span className="price text-white/70">
                  {fmt(totals.overhead)}
                </span>
              </p>
              <p className="text-sm text-white/50">
                Profit ({pct(profitPct)}):{" "}
                <span className="price text-white/70">
                  {fmt(totals.profit)}
                </span>
              </p>
              <div className="my-2 h-px bg-[#CC0000]/30" />
              <p className="text-lg font-bold text-white">
                Grand Total:{" "}
                <span className="price text-2xl text-[#CC0000]">
                  {fmt(totals.grandTotal)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-4">
        {saved && savedProjectId ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 px-5 py-3">
            <Check className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-400">
                Saved as Draft
              </p>
              <a
                href={`/projects/${savedProjectId}`}
                className="text-xs text-green-300/70 underline hover:text-green-300"
              >
                View project &rarr;
              </a>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={saveAsDraft}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#CC0000] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all hover:bg-[#E60000] disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save as Draft
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={downloadExcel}
          className="glass glass-hover inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white/80 transition-all"
        >
          <FileDown className="h-4 w-4" />
          Download Excel
        </button>

        <button
          type="button"
          onClick={downloadPdf}
          className="glass glass-hover inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white/80 transition-all"
        >
          <FileDown className="h-4 w-4" />
          Download PDF
        </button>
      </div>
    </div>
  );
}
