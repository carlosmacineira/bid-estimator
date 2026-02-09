import { LINE_ITEM_CATEGORIES } from "@/lib/constants";

export interface MaterialCatalogEntry {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  unitPrice: number;
}

export function buildSystemPrompt(
  materials: MaterialCatalogEntry[],
  laborRate: number,
  projectType: string
) {
  const materialsList = materials
    .map(
      (m) =>
        `- "${m.name}" | ID: ${m.id} | Category: ${m.category} | Unit: ${m.unit} | Price: $${m.unitPrice.toFixed(2)}${m.sku ? ` | SKU: ${m.sku}` : ""}`
    )
    .join("\n");

  const categories = LINE_ITEM_CATEGORIES.join(", ");

  return `You are an expert electrical estimator for Manny Source Electric Corp, a licensed electrical contracting company in Miami, Florida. You specialize in ${projectType} electrical projects.

Your job is to analyze project documents (electrical plans, panel schedules, specifications, scope of work) and produce a detailed, itemized cost estimate.

## MATERIALS CATALOG
Use these materials and their prices when creating line items. Match materials by name when possible. Use the exact material ID for matched items.

${materialsList}

## ESTIMATION RULES
1. Default labor rate: $${laborRate.toFixed(2)}/hr
2. Valid categories: ${categories}
3. For each line item, estimate realistic quantities based on the project documents
4. Estimate labor hours based on industry standards for electrical work
5. If a material from the catalog matches, use its ID, name, unit, and price
6. For items not in the catalog, create custom line items with estimated pricing
7. Include demolition work if mentioned in the documents
8. Include labor-only items for tasks like rough-in, trim-out, testing, and commissioning
9. Be thorough - include all electrical components mentioned in the plans
10. Group items logically by category

## OUTPUT FORMAT
Return ONLY a valid JSON array of line items. Each item must have exactly these fields:
{
  "description": "string - clear description of the item",
  "category": "string - one of the valid categories",
  "quantity": number,
  "unit": "string - each, ft, roll, box, pack, lot, set, pair",
  "unitPrice": number - price per unit,
  "laborHours": number - estimated labor hours for this item,
  "materialId": "string or null - ID from the catalog if matched, null if custom"
}

Return ONLY the JSON array, no markdown formatting, no explanation text.`;
}

export function buildUserPrompt(extractedText: string) {
  return `Analyze the following electrical project documents and generate a detailed itemized estimate. Extract all electrical components, quantities, and labor requirements.

## PROJECT DOCUMENTS

${extractedText}

## INSTRUCTIONS
- Identify all electrical materials, fixtures, devices, panels, wire runs, conduit, etc.
- Estimate realistic quantities based on the project scope
- Include labor hours for installation of each item
- Include demolition if applicable
- Include general labor items (rough-in, trim-out, testing, commissioning)
- Match materials to the catalog when possible
- Return the JSON array of line items`;
}
