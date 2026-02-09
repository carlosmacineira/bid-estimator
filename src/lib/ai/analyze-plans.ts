import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import path from "path";
import fs from "fs/promises";

export interface AILineItem {
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  laborHours: number;
  materialId: string | null;
}

export interface AnalysisResult {
  lineItems: AILineItem[];
  documentCount: number;
  totalPages: number;
}

/**
 * Extract text from a PDF buffer using pdf-parse
 */
async function extractPdfTextFromBuffer(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (
    buf: Buffer
  ) => Promise<{ text: string; numpages: number }>;
  const data = await pdfParse(buffer);
  return data.text || "";
}

/**
 * Get PDF buffer from document — tries database first, then filesystem
 */
async function getDocumentBuffer(doc: {
  filePath: string;
  fileData: string | null;
}): Promise<Buffer> {
  // First try: read from database (base64 stored)
  if (doc.fileData) {
    return Buffer.from(doc.fileData, "base64");
  }

  // Fallback: read from local filesystem (development)
  try {
    const absolutePath = path.join(process.cwd(), "public", doc.filePath);
    return await fs.readFile(absolutePath);
  } catch {
    throw new Error(
      `Could not read document file. File data is not stored in the database and local file is not accessible.`
    );
  }
}

/**
 * Analyze uploaded PDFs for a project and generate line items using Anthropic Claude
 */
export async function analyzePlans(
  projectId: string,
  documentIds: string[]
): Promise<AnalysisResult> {
  // 1. Get settings (API key, labor rate)
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });

  if (!settings?.anthropicApiKey) {
    throw new Error(
      "Anthropic API key not configured. Go to Settings to add your API key."
    );
  }

  // 2. Get project info
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // 3. Get documents (including fileData for cloud compatibility)
  const documents = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
      projectId,
    },
  });

  if (documents.length === 0) {
    throw new Error("No documents found for analysis");
  }

  // 4. Extract text from all PDFs
  let combinedText = "";
  let totalPages = 0;

  for (const doc of documents) {
    try {
      const buffer = await getDocumentBuffer(doc);
      const text = await extractPdfTextFromBuffer(buffer);
      if (text.trim()) {
        combinedText += `\n\n--- Document: ${doc.fileName} ---\n\n${text}`;
      }
      // Rough page estimate based on text length
      totalPages += Math.max(1, Math.ceil(text.length / 3000));
    } catch (err) {
      console.error(`Failed to extract text from ${doc.fileName}:`, err);
      combinedText += `\n\n--- Document: ${doc.fileName} ---\n[Could not extract text from this file]\n`;
    }
  }

  if (combinedText.trim().length < 50) {
    throw new Error(
      "Could not extract enough text from the uploaded PDFs. The files may be image-based blueprints. Please ensure your PDFs contain searchable/selectable text."
    );
  }

  // 5. Truncate if too long (context window management)
  const MAX_CHARS = 80000;
  if (combinedText.length > MAX_CHARS) {
    combinedText =
      combinedText.substring(0, MAX_CHARS) +
      "\n\n[Text truncated due to length...]";
  }

  // 6. Get materials catalog
  const materials = await prisma.material.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      unit: true,
      unitPrice: true,
    },
  });

  // 7. Build prompts
  const systemPrompt = buildSystemPrompt(
    materials,
    settings.defaultLaborRate,
    project.type
  );
  const userPrompt = buildUserPrompt(combinedText);

  // 8. Call Anthropic Claude
  const anthropic = new Anthropic({ apiKey: settings.anthropicApiKey });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Extract text content from the response
  const textBlock = message.content.find((block) => block.type === "text");
  const content = textBlock ? textBlock.text : "";

  if (!content) {
    throw new Error("No response from AI. Please try again.");
  }

  // 9. Parse response — extract JSON from the response
  let lineItems: AILineItem[];
  try {
    // Claude might wrap JSON in markdown code blocks, so extract it
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    // Also try to find a raw JSON array
    if (!jsonStr.startsWith("[") && !jsonStr.startsWith("{")) {
      const arrayMatch = content.match(/(\[[\s\S]*\])/);
      if (arrayMatch) {
        jsonStr = arrayMatch[1];
      }
    }

    const parsed = JSON.parse(jsonStr);
    // Handle both array and object with items key
    lineItems = Array.isArray(parsed)
      ? parsed
      : parsed.items || parsed.lineItems || parsed.line_items || [];
  } catch {
    throw new Error("AI returned invalid response format. Please try again.");
  }

  // 10. Validate and clean up line items
  lineItems = lineItems
    .filter(
      (item) =>
        item.description &&
        typeof item.quantity === "number" &&
        item.quantity > 0
    )
    .map((item) => ({
      description: String(item.description).trim(),
      category: item.category || "Miscellaneous",
      quantity: Math.max(0, Number(item.quantity) || 0),
      unit: item.unit || "each",
      unitPrice: Math.max(0, Number(item.unitPrice) || 0),
      laborHours: Math.max(0, Number(item.laborHours) || 0),
      materialId: item.materialId || null,
    }));

  return {
    lineItems,
    documentCount: documents.length,
    totalPages,
  };
}
