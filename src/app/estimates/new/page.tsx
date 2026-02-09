"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Wrench,
  ChevronDown,
  FileText,
  Sparkles,
  Loader2,
  AlertCircle,
  Brain,
  Zap,
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

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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

// ---------------------------------------------------------------------------
// Responsive hook
// ---------------------------------------------------------------------------

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function NewEstimatePage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const {
    currentStep,
    setStep,
    nextStep,
    prevStep,
    projectInfo,
    setProjectInfo,
    uploadedDocs,
    addUploadedDoc,
    removeUploadedDoc,
    documentIds,
    lineItems,
    setLineItems,
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
    aiAnalyzing,
    setAiAnalyzing,
    aiError,
    setAiError,
    getTotals,
    reset,
  } = useEstimateStore();

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
    if (currentStep === 2) {
      return uploadedDocs.length > 0 && !aiAnalyzing;
    }
    return true;
  }, [currentStep, projectInfo, uploadedDocs, aiAnalyzing]);

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

  // ====================================================================
  // RENDER
  // ====================================================================

  const activeStep = WIZARD_STEPS.find((s) => s.id === currentStep);
  const TOTAL_STEPS = 3;

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
      {/* ============================================================= */}
      {/* STEP INDICATOR                                                */}
      {/* ============================================================= */}

      {/* Mobile step indicator */}
      <div className="mb-6 block md:hidden">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white/80">
            Step {currentStep} of {TOTAL_STEPS}:{" "}
            <span className="text-white">{activeStep?.title}</span>
          </p>
          <p className="text-xs text-white/40">{activeStep?.description}</p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${(currentStep / TOTAL_STEPS) * 100}%`,
              background: "linear-gradient(90deg, #CC0000, #FF4444)",
            }}
          />
        </div>
      </div>

      {/* Desktop step indicator */}
      <div className="mb-10 hidden md:block">
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isComplete = currentStep > step.id;
            return (
              <div key={step.id} className="flex flex-1 items-center">
                {/* Circle */}
                <button
                  type="button"
                  onClick={() => {
                    if (step.id <= currentStep) setStep(step.id);
                  }}
                  className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-br from-[#CC0000] to-[#FF3333] text-white shadow-lg shadow-red-900/40"
                      : isComplete
                      ? "bg-[#CC0000]/20 text-[#CC0000] ring-2 ring-[#CC0000]/40"
                      : "glass text-white/40"
                  }`}
                >
                  {isComplete ? <Check className="h-5 w-5" /> : step.id}
                </button>

                {/* Label */}
                <div className="ml-3">
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
                      isComplete ? "bg-gradient-to-r from-[#CC0000]/60 to-[#CC0000]/20" : "bg-white/10"
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
      <div className="glass rounded-2xl p-4 sm:p-6 md:p-8 transition-all duration-300">
        {/* ------- STEP 1: PROJECT INFO ------- */}
        {currentStep === 1 && (
          <StepProjectInfo
            projectInfo={projectInfo}
            setProjectInfo={setProjectInfo}
            isMobile={isMobile}
          />
        )}

        {/* ------- STEP 2: UPLOAD & ANALYZE ------- */}
        {currentStep === 2 && (
          <StepUploadAnalyze
            projectInfo={projectInfo}
            uploadedDocs={uploadedDocs}
            addUploadedDoc={addUploadedDoc}
            removeUploadedDoc={removeUploadedDoc}
            documentIds={documentIds}
            setLineItems={setLineItems}
            laborRate={laborRate}
            aiAnalyzing={aiAnalyzing}
            setAiAnalyzing={setAiAnalyzing}
            aiError={aiError}
            setAiError={setAiError}
            lineItems={lineItems}
            nextStep={nextStep}
            isMobile={isMobile}
          />
        )}

        {/* ------- STEP 3: REVIEW & EXPORT ------- */}
        {currentStep === 3 && (
          <StepReviewExport
            projectInfo={projectInfo}
            lineItems={lineItems}
            updateLineItem={updateLineItem}
            removeLineItem={removeLineItem}
            overheadPct={overheadPct}
            setOverheadPct={setOverheadPct}
            profitPct={profitPct}
            setProfitPct={setProfitPct}
            laborRate={laborRate}
            setLaborRate={setLaborRate}
            notes={notes}
            setNotes={setNotes}
            terms={terms}
            setTerms={setTerms}
            totals={totals}
            saving={saving}
            saved={saved}
            savedProjectId={savedProjectId}
            saveAsDraft={saveAsDraft}
            openMaterialPicker={openMaterialPicker}
            addCustomItem={addCustomItem}
            addLaborOnlyItem={addLaborOnlyItem}
            reset={reset}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* ============================================================= */}
      {/* NAVIGATION                                                    */}
      {/* ============================================================= */}
      <div className="mt-4 sm:mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="glass glass-hover inline-flex items-center gap-2 rounded-xl px-4 py-2.5 sm:px-5 text-sm font-medium text-white/70 transition-all disabled:pointer-events-none disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        {currentStep < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={!canAdvance}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#CC0000] to-[#E60000] px-5 py-2.5 sm:px-6 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all hover:shadow-red-900/50 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : !saved ? (
          <button
            type="button"
            onClick={saveAsDraft}
            disabled={saving || lineItems.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#CC0000] to-[#E60000] px-5 py-2.5 sm:px-6 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all hover:shadow-red-900/50 hover:brightness-110 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Estimate
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              reset();
              router.push("/estimates/new");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#CC0000] to-[#E60000] px-5 py-2.5 sm:px-6 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all hover:shadow-red-900/50 hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            New Estimate
          </button>
        )}
      </div>

      {/* ============================================================= */}
      {/* MATERIAL PICKER MODAL                                         */}
      {/* ============================================================= */}
      <Dialog open={materialPickerOpen} onOpenChange={setMaterialPickerOpen}>
        <DialogContent className="glass border-white/10 sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
              className="glass-input pl-9 h-12 sm:h-10"
            />
          </div>

          {/* Materials list */}
          <div className="flex-1 min-h-0 max-h-64 sm:max-h-72 space-y-1 overflow-y-auto rounded-lg border border-white/5 bg-black/20 p-2">
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
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-3 sm:py-2.5 text-left text-sm transition-all ${
                    selectedMaterial?.id === m.id
                      ? "bg-[#CC0000]/20 ring-1 ring-[#CC0000]/40"
                      : "hover:bg-white/5 active:bg-white/10"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white/90 truncate">
                      {m.name}
                    </p>
                    <p className="text-xs text-white/40 truncate">
                      {m.category}
                      {m.sku ? ` \u00B7 ${m.sku}` : ""}
                    </p>
                  </div>
                  <span className="price ml-3 shrink-0 text-sm text-white/70">
                    {fmt(m.unitPrice)}/{m.unit}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Selected material + quantity */}
          {selectedMaterial && (
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 rounded-lg border border-white/5 bg-black/20 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">
                  {selectedMaterial.name}
                </p>
                <p className="price text-xs text-white/50">
                  {fmt(selectedMaterial.unitPrice)} per {selectedMaterial.unit}
                </p>
              </div>
              <div className="flex items-end gap-3">
                <div className="w-24">
                  <Label className="text-xs text-white/50">Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={materialQty}
                    onChange={(e) =>
                      setMaterialQty(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="glass-input h-12 sm:h-10"
                  />
                </div>
                <button
                  type="button"
                  onClick={confirmMaterialPick}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#CC0000] px-5 py-3 sm:py-2 text-sm font-semibold text-white transition-all hover:bg-[#E60000] active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
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
  isMobile: boolean;
}

function StepProjectInfo({
  projectInfo,
  setProjectInfo,
}: StepProjectInfoProps) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-white">
          Project Details
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Enter the basic info for this estimate.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
        {/* Project Name */}
        <div className="md:col-span-2">
          <Label className="mb-1.5 text-white/70">
            Project Name <span className="text-[#CC0000]">*</span>
          </Label>
          <Input
            placeholder="e.g. Office Rewire - 123 Main St"
            value={projectInfo.name}
            onChange={(e) => setProjectInfo({ name: e.target.value })}
            className="glass-input h-12 sm:h-10"
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
            className="glass-input h-12 sm:h-10"
          />
        </div>

        {/* Client Company */}
        <div>
          <Label className="mb-1.5 text-white/70">Client Company</Label>
          <Input
            placeholder="ABC Corp (optional)"
            value={projectInfo.clientCompany}
            onChange={(e) => setProjectInfo({ clientCompany: e.target.value })}
            className="glass-input h-12 sm:h-10"
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
            className="glass-input h-12 sm:h-10"
          />
        </div>

        {/* City / State / Zip row */}
        <div className="md:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="col-span-2 sm:col-span-2">
              <Label className="mb-1.5 text-white/70">City</Label>
              <Input
                placeholder="Miami"
                value={projectInfo.city}
                onChange={(e) => setProjectInfo({ city: e.target.value })}
                className="glass-input h-12 sm:h-10"
              />
            </div>
            <div>
              <Label className="mb-1.5 text-white/70">State</Label>
              <Input
                placeholder="FL"
                maxLength={2}
                value={projectInfo.state}
                onChange={(e) =>
                  setProjectInfo({ state: e.target.value.toUpperCase() })
                }
                className="glass-input h-12 sm:h-10"
              />
            </div>
            <div>
              <Label className="mb-1.5 text-white/70">ZIP</Label>
              <Input
                placeholder="33101"
                maxLength={10}
                value={projectInfo.zip}
                onChange={(e) => setProjectInfo({ zip: e.target.value })}
                className="glass-input h-12 sm:h-10"
              />
            </div>
          </div>
        </div>

        {/* Project Type */}
        <div className="md:col-span-2">
          <Label className="mb-2 text-white/70">Project Type</Label>
          <div className="inline-flex w-full sm:w-auto rounded-xl border border-white/10 bg-black/20 p-1">
            {PROJECT_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() =>
                  setProjectInfo({
                    type: pt.value as "residential" | "commercial" | "industrial",
                  })
                }
                className={`flex-1 sm:flex-initial rounded-lg px-4 sm:px-5 py-2.5 sm:py-2 text-sm font-medium transition-all ${
                  projectInfo.type === pt.value
                    ? "bg-gradient-to-r from-[#CC0000] to-[#E60000] text-white shadow"
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
// STEP 2 - UPLOAD & ANALYZE (THE CORE FEATURE)
// ============================================================================

interface StepUploadAnalyzeProps {
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
  uploadedDocs: { id: string; fileName: string; fileSize: number }[];
  addUploadedDoc: (doc: { id: string; fileName: string; fileSize: number }) => void;
  removeUploadedDoc: (id: string) => void;
  documentIds: string[];
  setLineItems: (items: { description: string; category: string; quantity: number; unit: string; unitPrice: number; laborHours: number; laborRate: number; materialId: string | null }[]) => void;
  laborRate: number;
  aiAnalyzing: boolean;
  setAiAnalyzing: (analyzing: boolean) => void;
  aiError: string | null;
  setAiError: (error: string | null) => void;
  lineItems: { tempId: string }[];
  nextStep: () => void;
  isMobile: boolean;
}

function StepUploadAnalyze({
  projectInfo,
  uploadedDocs,
  addUploadedDoc,
  removeUploadedDoc,
  documentIds,
  setLineItems,
  laborRate,
  aiAnalyzing,
  setAiAnalyzing,
  aiError,
  setAiError,
  lineItems,
  nextStep,
  isMobile,
}: StepUploadAnalyzeProps) {
  const [uploading, setUploading] = useState(false);
  const [tempProjectId, setTempProjectId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Create a temporary project to attach documents to
  const ensureProject = async (): Promise<string> => {
    if (tempProjectId) return tempProjectId;

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectInfo.name || "Untitled Estimate",
        clientName: projectInfo.clientName || "TBD",
        clientCompany: projectInfo.clientCompany,
        address: projectInfo.address || "TBD",
        city: projectInfo.city,
        state: projectInfo.state,
        zip: projectInfo.zip,
        type: projectInfo.type,
        description: projectInfo.description,
        status: "draft",
      }),
    });

    if (!res.ok) throw new Error("Failed to create project");
    const data = await res.json();
    const id = data.id ?? data.projectId ?? data.data?.id;
    setTempProjectId(id);
    return id;
  };

  const uploadFile = async (file: File) => {
    if (!file.type.includes("pdf")) {
      toast.error("Only PDF files are supported");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum 50 MB.");
      return;
    }

    setUploading(true);
    try {
      const projectId = await ensureProject();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("tag", "electrical_plans");

      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const doc = await res.json();

      addUploadedDoc({
        id: doc.id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
      });

      toast.success(`Uploaded ${file.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await uploadFile(file);
    }
  };

  const handleRemoveDoc = async (docId: string) => {
    try {
      if (tempProjectId) {
        await fetch(`/api/projects/${tempProjectId}/documents/${docId}`, {
          method: "DELETE",
        });
      }
      removeUploadedDoc(docId);
    } catch {
      toast.error("Failed to remove document");
    }
  };

  const runAiAnalysis = async () => {
    if (!tempProjectId || documentIds.length === 0) {
      toast.error("Please upload at least one PDF first");
      return;
    }

    setAiAnalyzing(true);
    setAiError(null);

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: tempProjectId,
          documentIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "AI analysis failed");
      }

      if (data.lineItems && data.lineItems.length > 0) {
        setLineItems(
          data.lineItems.map((item: { description: string; category: string; quantity: number; unit: string; unitPrice: number; laborHours: number; materialId: string | null }) => ({
            ...item,
            laborRate: laborRate,
          }))
        );
        toast.success(
          `AI generated ${data.lineItems.length} line items from ${data.documentCount} document(s)`
        );
        nextStep();
      } else {
        setAiError("AI could not generate line items from the documents. Try uploading more detailed plans.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI analysis failed";
      setAiError(msg);
      toast.error(msg);
    } finally {
      setAiAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-white">
          Upload Plans &amp; Generate Estimate
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Upload your electrical plans, panel schedules, or specs. Our AI will analyze them and generate a detailed estimate.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        ref={dropRef}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex min-h-[200px] sm:min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 ${
          dragOver
            ? "border-[#CC0000]/60 bg-[#CC0000]/10 scale-[1.01]"
            : uploading
            ? "border-white/20 bg-white/[0.03]"
            : "border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-[#CC0000]" />
            <p className="text-sm font-medium text-white/70">Uploading...</p>
          </div>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#CC0000]/20 to-[#CC0000]/5">
              <Upload className="h-7 w-7 text-[#CC0000]" />
            </div>
            <p className="mt-4 text-sm font-medium text-white/70">
              {dragOver ? "Drop PDF files here" : "Drag & drop PDF files or click to browse"}
            </p>
            <p className="mt-1 text-xs text-white/30">
              PDF files up to 50 MB &middot; Electrical plans, panel schedules, specs
            </p>
          </>
        )}
      </div>

      {/* Uploaded files list */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-white/40 font-semibold">
            Uploaded Documents ({uploadedDocs.length})
          </p>
          <div className="space-y-2">
            {uploadedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#CC0000]/10">
                  <FileText className="h-5 w-5 text-[#CC0000]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/90 truncate">
                    {doc.fileName}
                  </p>
                  <p className="text-xs text-white/40">
                    {formatFileSize(doc.fileSize)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveDoc(doc.id);
                  }}
                  className="rounded-lg p-2 text-white/30 transition-colors hover:bg-red-500/10 hover:text-[#CC0000]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis Button */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={runAiAnalysis}
            disabled={aiAnalyzing || documentIds.length === 0}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#CC0000] via-[#E60000] to-[#FF3333] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-red-900/30 transition-all hover:shadow-red-900/50 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiAnalyzing ? (
              <>
                <div className="relative">
                  <Brain className="h-6 w-6 animate-pulse" />
                  <Sparkles className="absolute -right-1 -top-1 h-3 w-3 animate-ping text-yellow-300" />
                </div>
                <div className="text-left">
                  <span className="block">Analyzing Plans...</span>
                  <span className="block text-xs font-normal text-white/70">
                    This may take 30-60 seconds
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <Sparkles className="h-6 w-6" />
                </div>
                <span>Generate AI Estimate</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          {/* AI Error */}
          {aiError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">Analysis Failed</p>
                <p className="text-xs text-red-300/70 mt-1">{aiError}</p>
              </div>
            </div>
          )}

          {/* Skip AI - manual estimate */}
          <div className="text-center">
            <button
              type="button"
              onClick={nextStep}
              className="text-sm text-white/30 transition-colors hover:text-white/60 py-2"
            >
              Skip AI &mdash; build estimate manually &rarr;
            </button>
          </div>
        </div>
      )}

      {/* AI already generated items indicator */}
      {lineItems.length > 0 && !aiAnalyzing && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3">
          <Check className="h-5 w-5 text-green-400" />
          <div>
            <p className="text-sm font-medium text-green-400">
              {lineItems.length} line items generated
            </p>
            <p className="text-xs text-green-300/60">
              Click Next to review and edit the estimate
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STEP 3 - REVIEW & EXPORT (combined Build + Markup + Export)
// ============================================================================

interface StepReviewExportProps {
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
  updateLineItem: (tempId: string, updates: Record<string, unknown>) => void;
  removeLineItem: (tempId: string) => void;
  overheadPct: number;
  setOverheadPct: (v: number) => void;
  profitPct: number;
  setProfitPct: (v: number) => void;
  laborRate: number;
  setLaborRate: (v: number) => void;
  notes: string;
  setNotes: (v: string) => void;
  terms: string;
  setTerms: (v: string) => void;
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
  saving: boolean;
  saved: boolean;
  savedProjectId: string | null;
  saveAsDraft: () => void;
  openMaterialPicker: () => void;
  addCustomItem: () => void;
  addLaborOnlyItem: () => void;
  reset: () => void;
  isMobile: boolean;
}

function StepReviewExport({
  projectInfo,
  lineItems,
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
  totals,
  saving,
  saved,
  savedProjectId,
  saveAsDraft,
  openMaterialPicker,
  addCustomItem,
  addLaborOnlyItem,
  reset,
  isMobile,
}: StepReviewExportProps) {
  const [localOverhead, setLocalOverhead] = useState((overheadPct * 100).toFixed(1));
  const [localProfit, setLocalProfit] = useState((profitPct * 100).toFixed(1));
  const [localLaborRate, setLocalLaborRate] = useState(String(laborRate));
  const [activeTab, setActiveTab] = useState<"items" | "markup" | "notes">("items");

  useEffect(() => { setLocalOverhead((overheadPct * 100).toFixed(1)); }, [overheadPct]);
  useEffect(() => { setLocalProfit((profitPct * 100).toFixed(1)); }, [profitPct]);
  useEffect(() => { setLocalLaborRate(String(laborRate)); }, [laborRate]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-white">
          Review &amp; Export
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Review AI-generated line items, adjust markup, and save your estimate.
        </p>
      </div>

      {/* Success state */}
      {saved && savedProjectId && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-5 py-4">
            <Check className="h-6 w-6 shrink-0 text-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-400">
                Estimate saved successfully!
              </p>
              <a
                href={`/projects/${savedProjectId}`}
                className="text-sm text-green-300/70 underline hover:text-green-300 transition-colors"
              >
                View project &rarr;
              </a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`/projects/${savedProjectId}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#CC0000] to-[#E60000] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all hover:brightness-110 active:scale-95"
            >
              View Project
              <ArrowRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={reset}
              className="glass glass-hover inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white/80 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              New Estimate
            </button>
          </div>
          return;
        </div>
      )}

      {/* Tab selector */}
      <div className="inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
        {[
          { key: "items" as const, label: "Line Items", count: lineItems.length },
          { key: "markup" as const, label: "Markup" },
          { key: "notes" as const, label: "Notes" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-gradient-to-r from-[#CC0000] to-[#E60000] text-white shadow"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 text-xs ${activeTab === tab.key ? "text-white/70" : "text-white/30"}`}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Line Items Tab */}
      {activeTab === "items" && (
        <div className="space-y-4">
          {/* Add item buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openMaterialPicker}
              className="inline-flex items-center gap-2 rounded-lg bg-[#CC0000] px-3 py-2.5 sm:px-4 sm:py-2 text-sm font-medium text-white transition-all hover:bg-[#E60000] active:scale-95"
            >
              <Package className="h-4 w-4" />
              From Materials
            </button>
            <button
              type="button"
              onClick={addCustomItem}
              className="glass glass-hover inline-flex items-center gap-2 rounded-lg px-3 py-2.5 sm:px-4 sm:py-2 text-sm font-medium text-white/80 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Custom
            </button>
            <button
              type="button"
              onClick={addLaborOnlyItem}
              className="glass glass-hover inline-flex items-center gap-2 rounded-lg px-3 py-2.5 sm:px-4 sm:py-2 text-sm font-medium text-white/80 transition-all active:scale-95"
            >
              <Wrench className="h-4 w-4" />
              Labor
            </button>
          </div>

          {/* Line items list */}
          {lineItems.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
              <Package className="h-10 w-10 text-white/15" />
              <p className="mt-3 text-sm text-white/40">
                No items yet. Upload PDFs to generate or add manually.
              </p>
            </div>
          ) : isMobile ? (
            /* Mobile cards */
            <div className="space-y-2 pb-28">
              {lineItems.map((item) => {
                const materialCost = item.quantity * item.unitPrice;
                const laborCost = item.laborHours * (item.laborRate || laborRate);
                const lineTotal = materialCost + laborCost;
                return (
                  <div key={item.tempId} className="rounded-xl border border-white/5 bg-black/20 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={item.description}
                          placeholder="Item description"
                          onChange={(e) => updateLineItem(item.tempId, { description: e.target.value })}
                          className="w-full bg-transparent text-sm font-medium text-white/90 placeholder:text-white/25 outline-none"
                        />
                        <p className="text-xs text-white/40 mt-0.5">{item.category}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.tempId)}
                        className="shrink-0 rounded p-1 text-white/20 hover:text-[#CC0000]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-white/30">Qty</span>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.tempId, { quantity: Number(e.target.value) || 0 })}
                          className="w-full bg-transparent text-white/80 outline-none mt-0.5"
                        />
                      </div>
                      <div>
                        <span className="text-white/30">Price</span>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(item.tempId, { unitPrice: Number(e.target.value) || 0 })}
                          className="price w-full bg-transparent text-white/80 outline-none mt-0.5"
                        />
                      </div>
                      <div>
                        <span className="text-white/30">Hrs</span>
                        <input
                          type="number"
                          value={item.laborHours}
                          onChange={(e) => updateLineItem(item.tempId, { laborHours: Number(e.target.value) || 0 })}
                          className="w-full bg-transparent text-white/80 outline-none mt-0.5"
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-white/30">Total</span>
                        <p className="price font-semibold text-white mt-0.5">{fmt(lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop table */
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
                    <th className="px-3 py-3 font-medium">Description</th>
                    <th className="px-3 py-3 font-medium">Category</th>
                    <th className="w-20 px-3 py-3 font-medium text-right">Qty</th>
                    <th className="w-20 px-3 py-3 font-medium">Unit</th>
                    <th className="w-24 px-3 py-3 font-medium text-right">Unit$</th>
                    <th className="w-20 px-3 py-3 font-medium text-right">Hrs</th>
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
                      <tr key={item.tempId} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                        <td className="px-3 py-2">
                          <input type="text" value={item.description} onChange={(e) => updateLineItem(item.tempId, { description: e.target.value })} placeholder="Item description" className="w-full min-w-[160px] bg-transparent text-sm text-white/90 placeholder:text-white/20 outline-none rounded px-1 py-0.5" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={item.category} onChange={(e) => updateLineItem(item.tempId, { category: e.target.value })} className="w-full min-w-[110px] bg-transparent text-sm text-white/70 outline-none rounded px-1 py-0.5 cursor-pointer">
                            {LINE_ITEM_CATEGORIES.map((c) => (<option key={c} value={c} className="bg-neutral-900 text-white">{c}</option>))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" min={0} step="any" value={item.quantity} onChange={(e) => updateLineItem(item.tempId, { quantity: Number(e.target.value) || 0 })} className="price w-full bg-transparent text-right text-sm text-white/90 outline-none rounded px-1 py-0.5" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={item.unit} onChange={(e) => updateLineItem(item.tempId, { unit: e.target.value })} className="w-full bg-transparent text-sm text-white/70 outline-none rounded px-1 py-0.5 cursor-pointer">
                            {UNITS.map((u) => (<option key={u.value} value={u.value} className="bg-neutral-900 text-white">{u.label}</option>))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(e) => updateLineItem(item.tempId, { unitPrice: Number(e.target.value) || 0 })} className="price w-full bg-transparent text-right text-sm text-white/90 outline-none rounded px-1 py-0.5" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" min={0} step="0.25" value={item.laborHours} onChange={(e) => updateLineItem(item.tempId, { laborHours: Number(e.target.value) || 0 })} className="price w-full bg-transparent text-right text-sm text-white/90 outline-none rounded px-1 py-0.5" />
                        </td>
                        <td className="price px-3 py-2 text-right font-medium text-white/90">{fmt(lineTotal)}</td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => removeLineItem(item.tempId)} className="rounded p-1 text-white/25 transition-colors hover:bg-red-500/10 hover:text-[#CC0000]"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals summary */}
          {lineItems.length > 0 && (
            <div className="rounded-xl border border-white/5 bg-black/30 p-4 sm:p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">Materials</p>
                  <p className="price text-sm font-semibold text-white/80 mt-1">{fmt(totals.materialSubtotal)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">Labor</p>
                  <p className="price text-sm font-semibold text-white/80 mt-1">{fmt(totals.laborSubtotal)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">Direct Cost</p>
                  <p className="price text-sm font-bold text-white mt-1">{fmt(totals.directCost)}</p>
                </div>
                <div className="text-right sm:text-left">
                  <p className="text-xs uppercase tracking-wider text-[#CC0000]/70">Grand Total</p>
                  <p className="price text-lg font-bold text-[#CC0000] mt-1">{fmt(totals.grandTotal)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Markup Tab */}
      {activeTab === "markup" && (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <Label className="mb-1.5 text-white/70">Overhead %</Label>
              <div className="space-y-2">
                <input type="range" min={0} max={50} step={0.5} value={overheadPct * 100} onChange={(e) => { const val = Number(e.target.value); setOverheadPct(val / 100); setLocalOverhead(val.toFixed(1)); }} className="w-full accent-[#CC0000] h-2 cursor-pointer" />
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={100} step={0.5} value={localOverhead} onChange={(e) => setLocalOverhead(e.target.value)} onBlur={(e) => setOverheadPct((Number(e.target.value) || 0) / 100)} className="glass-input w-24 text-right h-10" />
                  <span className="text-sm text-white/40">%</span>
                </div>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 text-white/70">Profit %</Label>
              <div className="space-y-2">
                <input type="range" min={0} max={50} step={0.5} value={profitPct * 100} onChange={(e) => { const val = Number(e.target.value); setProfitPct(val / 100); setLocalProfit(val.toFixed(1)); }} className="w-full accent-[#CC0000] h-2 cursor-pointer" />
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={100} step={0.5} value={localProfit} onChange={(e) => setLocalProfit(e.target.value)} onBlur={(e) => setProfitPct((Number(e.target.value) || 0) / 100)} className="glass-input w-24 text-right h-10" />
                  <span className="text-sm text-white/40">%</span>
                </div>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 text-white/70">Labor Rate</Label>
              <div className="flex items-center gap-2 mt-7">
                <span className="text-sm text-white/40">$</span>
                <Input type="number" min={0} step={1} value={localLaborRate} onChange={(e) => setLocalLaborRate(e.target.value)} onBlur={(e) => setLaborRate(Number(e.target.value) || 0)} className="glass-input w-28 text-right h-10" />
                <span className="text-sm text-white/40">/hr</span>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="rounded-xl border border-white/5 bg-black/20 p-4 sm:p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">Cost Breakdown</h3>
            <div className="space-y-3">
              <BreakdownRow label="Material Subtotal" value={totals.materialSubtotal} />
              <BreakdownRow label="Labor Subtotal" value={totals.laborSubtotal} />
              <BreakdownRow label="Demolition Subtotal" value={totals.demolitionSubtotal} />
              <div className="my-4 h-px bg-white/10" />
              <BreakdownRow label="Direct Cost" value={totals.directCost} bold />
              <BreakdownRow label={`Overhead (${pct(overheadPct)})`} value={totals.overhead} />
              <BreakdownRow label="Subtotal with Overhead" value={totals.subtotalWithOverhead} />
              <BreakdownRow label={`Profit (${pct(profitPct)})`} value={totals.profit} />
              <div className="my-4 h-px bg-gradient-to-r from-[#CC0000]/30 to-transparent" />
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-bold text-white">GRAND TOTAL</span>
                <span className="price text-xl sm:text-2xl font-bold text-[#CC0000]">{fmt(totals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label className="mb-1.5 text-white/70">Notes</Label>
            <Textarea placeholder="Additional notes for this estimate..." rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} className="glass-input" />
          </div>
          <div>
            <Label className="mb-1.5 text-white/70">Terms &amp; Conditions</Label>
            <Textarea placeholder="Payment terms, warranty info, etc." rows={6} value={terms} onChange={(e) => setTerms(e.target.value)} className="glass-input" />
          </div>
        </div>
      )}

      {/* Mobile sticky totals bar */}
      {isMobile && lineItems.length > 0 && !saved && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Grand Total</p>
              <p className="price text-lg font-bold text-[#CC0000]">{fmt(totals.grandTotal)}</p>
            </div>
            <button
              type="button"
              onClick={saveAsDraft}
              disabled={saving || lineItems.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#CC0000] to-[#E60000] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BreakdownRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-semibold text-white" : "text-white/60"}`}>{label}</span>
      <span className={`price text-sm ${bold ? "font-semibold text-white" : "text-white/70"}`}>{fmt(value)}</span>
    </div>
  );
}
