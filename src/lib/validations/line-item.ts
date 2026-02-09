import { z } from "zod";

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  quantity: z.number().min(0, "Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  laborHours: z.number().min(0).default(0),
  laborRate: z.number().min(0).nullable().optional(),
  materialId: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const lineItemUpdateSchema = lineItemSchema.partial();

export type LineItemInput = z.infer<typeof lineItemSchema>;
