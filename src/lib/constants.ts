export const PROJECT_STATUSES = [
  { value: "draft", label: "Draft", color: "#6B7280" },
  { value: "submitted", label: "Submitted", color: "#F59E0B" },
  { value: "won", label: "Won", color: "#10B981" },
  { value: "lost", label: "Lost", color: "#EF4444" },
] as const;

export const PROJECT_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
] as const;

export const MATERIAL_CATEGORIES = [
  "Wire",
  "Conduit",
  "Panels & Breakers",
  "Devices",
  "Boxes & Fittings",
  "Lighting",
  "Miscellaneous",
] as const;

export const LINE_ITEM_CATEGORIES = [
  "Wire",
  "Conduit",
  "Panels & Breakers",
  "Devices",
  "Boxes & Fittings",
  "Lighting",
  "Miscellaneous",
  "Labor Only",
  "Demolition",
] as const;

export const UNITS = [
  { value: "each", label: "Each" },
  { value: "ft", label: "Feet" },
  { value: "roll", label: "Roll" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
  { value: "lot", label: "Lot" },
  { value: "set", label: "Set" },
  { value: "pair", label: "Pair" },
] as const;

export const WIZARD_STEPS = [
  { id: 1, title: "Project Details", description: "Basic project info" },
  { id: 2, title: "Upload & Analyze", description: "PDF plans → AI estimate" },
  { id: 3, title: "Review & Export", description: "Edit, adjust & save" },
] as const;

export const DOCUMENT_TAGS = [
  { value: "electrical_plans", label: "Electrical Plans" },
  { value: "panel_schedule", label: "Panel Schedule" },
  { value: "specifications", label: "Specifications" },
  { value: "other", label: "Other" },
] as const;
