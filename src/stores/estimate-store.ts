import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { computeEstimateTotals, type EstimateTotals } from "@/lib/calculations/estimate-engine";

interface LineItemDraft {
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
}

interface ProjectInfoDraft {
  name: string;
  clientName: string;
  clientCompany: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: "residential" | "commercial" | "industrial";
  description: string;
}

interface EstimateState {
  currentStep: number;
  projectInfo: ProjectInfoDraft;
  documentIds: string[];
  lineItems: LineItemDraft[];
  overheadPct: number;
  profitPct: number;
  laborRate: number;
  notes: string;
  terms: string;
  savedProjectId: string | null;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setProjectInfo: (info: Partial<ProjectInfoDraft>) => void;
  addDocumentId: (id: string) => void;
  removeDocumentId: (id: string) => void;
  addLineItem: (item: Omit<LineItemDraft, "tempId" | "sortOrder">) => void;
  updateLineItem: (tempId: string, updates: Partial<LineItemDraft>) => void;
  removeLineItem: (tempId: string) => void;
  setOverheadPct: (pct: number) => void;
  setProfitPct: (pct: number) => void;
  setLaborRate: (rate: number) => void;
  setNotes: (notes: string) => void;
  setTerms: (terms: string) => void;
  setSavedProjectId: (id: string) => void;
  getTotals: () => EstimateTotals;
  reset: () => void;
}

const initialProjectInfo: ProjectInfoDraft = {
  name: "",
  clientName: "",
  clientCompany: "",
  address: "",
  city: "",
  state: "FL",
  zip: "",
  type: "commercial",
  description: "",
};

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useEstimateStore = create<EstimateState>()(
  persist(
    immer((set, get) => ({
      currentStep: 1,
      projectInfo: { ...initialProjectInfo },
      documentIds: [],
      lineItems: [],
      overheadPct: 0.15,
      profitPct: 0.10,
      laborRate: 65,
      notes: "",
      terms: "",
      savedProjectId: null,

      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => { state.currentStep = Math.min(state.currentStep + 1, 5); }),
      prevStep: () => set((state) => { state.currentStep = Math.max(state.currentStep - 1, 1); }),

      setProjectInfo: (info) => set((state) => {
        Object.assign(state.projectInfo, info);
      }),

      addDocumentId: (id) => set((state) => { state.documentIds.push(id); }),
      removeDocumentId: (id) => set((state) => {
        state.documentIds = state.documentIds.filter((d) => d !== id);
      }),

      addLineItem: (item) => set((state) => {
        state.lineItems.push({
          ...item,
          tempId: generateId(),
          sortOrder: state.lineItems.length,
        });
      }),

      updateLineItem: (tempId, updates) => set((state) => {
        const idx = state.lineItems.findIndex((i) => i.tempId === tempId);
        if (idx !== -1) {
          Object.assign(state.lineItems[idx], updates);
        }
      }),

      removeLineItem: (tempId) => set((state) => {
        state.lineItems = state.lineItems.filter((i) => i.tempId !== tempId);
      }),

      setOverheadPct: (pct) => set({ overheadPct: pct }),
      setProfitPct: (pct) => set({ profitPct: pct }),
      setLaborRate: (rate) => set({ laborRate: rate }),
      setNotes: (notes) => set({ notes }),
      setTerms: (terms) => set({ terms }),
      setSavedProjectId: (id) => set({ savedProjectId: id }),

      getTotals: () => {
        const state = get();
        return computeEstimateTotals(
          state.lineItems.map((item) => ({
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            laborHours: item.laborHours,
            laborRate: item.laborRate || state.laborRate,
            category: item.category,
          })),
          state.overheadPct,
          state.profitPct
        );
      },

      reset: () => set({
        currentStep: 1,
        projectInfo: { ...initialProjectInfo },
        documentIds: [],
        lineItems: [],
        overheadPct: 0.15,
        profitPct: 0.10,
        laborRate: 65,
        notes: "",
        terms: "",
        savedProjectId: null,
      }),
    })),
    {
      name: "estimate-draft",
    }
  )
);
