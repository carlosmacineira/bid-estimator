import { z } from "zod";

export const materialSchema = z.object({
  name: z.string().min(1, "Material name is required").max(200),
  sku: z.string().max(50).optional().nullable(),
  category: z.string().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required"),
  unitPrice: z.number().min(0, "Price cannot be negative"),
});

export type MaterialInput = z.infer<typeof materialSchema>;
