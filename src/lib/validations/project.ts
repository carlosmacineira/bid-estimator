import { z } from "zod";

export const projectCreateSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  clientName: z.string().min(1, "Client name is required").max(200),
  clientCompany: z.string().max(200).optional().nullable(),
  address: z.string().min(1, "Address is required").max(500),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1).max(2).default("FL"),
  zip: z.string().min(1, "ZIP code is required").max(10),
  type: z.enum(["residential", "commercial", "industrial"]).default("commercial"),
  description: z.string().max(2000).optional().nullable(),
  overheadPct: z.number().min(0).max(1).default(0.15),
  profitPct: z.number().min(0).max(1).default(0.10),
  laborRate: z.number().min(0).default(65),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  status: z.enum(["draft", "submitted", "won", "lost"]).optional(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
